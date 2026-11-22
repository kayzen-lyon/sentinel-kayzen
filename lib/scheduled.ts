import { ensureSchema, query } from "./db";
import { validateTargetUrl } from "./ssrf";
import { isHostVerified } from "./domains";
import { canLaunch, getRole } from "./orgs";
import { runScan } from "./scanner";
import { createScanRecord, completeScan, failScan } from "./scans";
import { notifyOrg } from "./notify";
import { logAudit } from "./audit";
import { emailConfigured, sendEmail, surveillanceEmail } from "./email";
import { getUserById } from "./users";
import {
  aNotifier,
  ajouterAuJournal,
  comparer,
  construireInstantane,
  type Changement,
  type Instantane,
} from "./surveillance";

/**
 * Surveillance planifiée de la surface d'attaque : scans passifs récurrents, instantané de ce
 * qui a été mesuré, comparaison au passage précédent (lib/surveillance.ts), journal plafonné
 * et alertes (Slack/webhook + e-mail) pour les changements importants ou critiques.
 */

export type Frequency = "daily" | "weekly";

export type ScheduledRow = {
  id: string;
  user_id: string;
  org_id: string | null;
  target_url: string;
  frequency: Frequency;
  enabled: boolean;
  last_run_at: string | null;
  last_score: number | null;
  last_snapshot: Instantane | null;
  journal: Changement[] | null;
  created_at: string;
};

export async function listSchedules(userId: string): Promise<ScheduledRow[]> {
  await ensureSchema();
  return query<ScheduledRow>(
    `SELECT * FROM scheduled_scans WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

export async function createSchedule(
  userId: string,
  orgId: string | null,
  targetUrl: string,
  frequency: Frequency
): Promise<string> {
  await ensureSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO scheduled_scans (user_id, org_id, target_url, frequency)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, orgId, targetUrl, frequency]
  );
  return rows[0].id;
}

export async function deleteSchedule(id: string, userId: string): Promise<void> {
  await ensureSchema();
  await query(`DELETE FROM scheduled_scans WHERE id = $1 AND user_id = $2`, [id, userId]);
}

/** Sélectionne les surveillances dues (jamais lancées ou dont l'intervalle est écoulé), les plus anciennes d'abord. */
async function dueSchedules(): Promise<ScheduledRow[]> {
  await ensureSchema();
  return query<ScheduledRow>(
    `SELECT * FROM scheduled_scans
     WHERE enabled = true
       AND (
         last_run_at IS NULL
         OR (frequency = 'daily'  AND last_run_at < now() - interval '1 day')
         OR (frequency = 'weekly' AND last_run_at < now() - interval '7 days')
       )
     ORDER BY last_run_at ASC NULLS FIRST
     LIMIT 50`
  );
}

/** Résout `p` ou renvoie null au-delà de `ms` (ou en cas d'erreur). */
function within<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p.catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), ms).unref?.()),
  ]);
}

/**
 * Contrôle une cible : re-validation anti-SSRF, scan passif (approfondi si le domaine est
 * vérifié dans l'organisation et que l'auteur peut toujours y lancer), instantané, comparaison
 * au précédent, journal et alertes. Retourne le nombre de changements notifiés, ou null si la
 * cible n'a pas pu être contrôlée.
 */
export async function controlerCible(s: ScheduledRow): Promise<number | null> {
  const check = await validateTargetUrl(s.target_url);
  if (!check.ok) {
    await query(`UPDATE scheduled_scans SET last_run_at = now() WHERE id = $1`, [s.id]);
    return null;
  }

  const role = s.org_id ? await getRole(s.org_id, s.user_id).catch(() => null) : null;
  const deep =
    canLaunch(role) && (await isHostVerified(s.org_id, check.url.hostname).catch(() => false));
  const scanId = await createScanRecord(s.user_id, check.url.toString(), deep).catch(() => null);

  try {
    const result = await runScan(check.url, { deep });
    if (scanId) await completeScan(scanId, result).catch(() => {});

    // Sous-domaines : même énumération que le scan approfondi (mise en cache par instance,
    // donc sans nouvelle requête si le scan vient de la faire).
    let sousDomaines: string[] | null = null;
    let raisonSousDomaines: string | undefined;
    if (deep) {
      const apex = new URL(result.summary.finalUrl).hostname.split(".").slice(-2).join(".");
      sousDomaines = await within(
        import("./recon").then((m) => m.enumerateSubdomains(apex)),
        5000
      );
      if (sousDomaines === null) raisonSousDomaines = "Énumération des sous-domaines non terminée à temps.";
    }

    const apres = construireInstantane(result, {
      date: new Date().toISOString(),
      profond: deep,
      sousDomaines,
      raisonSousDomaines,
    });
    const changements = comparer(s.last_snapshot ?? null, apres);
    const journal = ajouterAuJournal(s.journal ?? [], changements);

    await query(
      `UPDATE scheduled_scans
          SET last_run_at = now(), last_score = $2, last_snapshot = $3::jsonb, journal = $4::jsonb
        WHERE id = $1`,
      [s.id, result.score, JSON.stringify(apres), JSON.stringify(journal)]
    );

    const graves = aNotifier(changements);
    if (graves.length) {
      const host = check.url.hostname;
      await notifyOrg(s.org_id, {
        event: "scan.alert",
        text: `Sentinel — surveillance de ${host} : ${graves.map((c) => c.message).join(" ; ")}.`,
        data: { target: check.url.toString(), changes: graves, scanId },
      });
      await logAudit({
        orgId: s.org_id,
        actorId: s.user_id,
        action: "scan.alert",
        target: host,
        meta: { changes: graves.map((c) => c.message) },
      });
      if (emailConfigured) {
        const user = await getUserById(s.user_id).catch(() => null);
        if (user?.email)
          await sendEmail(
            user.email,
            `Sentinel — surveillance de ${host} : ${graves.length} changement(s) à examiner`,
            surveillanceEmail({ host, changes: graves })
          );
      }
    }
    return graves.length;
  } catch (e) {
    if (scanId) await failScan(scanId, e instanceof Error ? e.message : "échec").catch(() => {});
    await query(`UPDATE scheduled_scans SET last_run_at = now() WHERE id = $1`, [s.id]);
    return null;
  }
}

/** Temps total accordé au cron (la fonction Vercel est coupée à 60 s). */
const BUDGET_MS = 50_000;
/** Pas de nouvelle cible s'il reste moins que la durée d'un scan passif typique. */
const MARGE_MS = 15_000;

/**
 * Exécute les surveillances dues, les plus anciennes d'abord, dans un budget de temps :
 * aucune nouvelle cible n'est commencée au-delà, les suivantes passent au prochain cron.
 */
export async function runDueScheduledScans(
  budgetMs = BUDGET_MS
): Promise<{ ran: number; alerts: number; remaining: number }> {
  const fin = Date.now() + budgetMs;
  const due = await dueSchedules();
  let ran = 0;
  let alerts = 0;
  let i = 0;
  for (; i < due.length; i++) {
    if (Date.now() + MARGE_MS > fin) break;
    const n = await controlerCible(due[i]);
    if (n !== null) {
      ran++;
      alerts += n;
    }
  }
  return { ran, alerts, remaining: due.length - i };
}

/** « Contrôler maintenant » : la surveillance doit appartenir à l'utilisateur. */
export async function checkScheduleNow(id: string, userId: string): Promise<boolean> {
  await ensureSchema();
  const rows = await query<ScheduledRow>(
    `SELECT * FROM scheduled_scans WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (!rows[0]) return false;
  await controlerCible(rows[0]);
  return true;
}
