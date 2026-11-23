import { ensureSchema, query } from "../db";
import { refusSansAutorisation, normaliserHote } from "../autorisations";
import { logAudit } from "../audit";
import { notifyOrg } from "../notify";
import { emailConfigured, sendEmail } from "../email";
import { comparer, JOURNAL_MAX, type Changement, type Instantane } from "./comparer";
import { mesurer } from "./mesurer";

/**
 * Surveillance quotidienne de la surface d'attaque : un instantané JSON par passage, comparé au
 * précédent ; chaque changement est daté, classé (critique, important, info) et journalisé
 * (300 entrées au plus par organisation). Notification dans l'application (journal non lu) ;
 * e-mail aux propriétaires et administrateurs pour l'important et le critique.
 *
 * GARDE-FOU : aucun passage sans autorisation écrite du client couvrant l'hôte, vérifiée côté
 * serveur à chaque passage (cron et « Contrôler maintenant »).
 */

export type Cible = {
  id: string;
  org_id: string;
  user_id: string;
  hote: string;
  actif: boolean;
  dernier_controle: string | null;
  dernier_statut: string | null;
};

export type EntreeJournal = { id: string; hote: string; date: string; gravite: Changement["gravite"]; type: string; phrase: string; lu: boolean };

const INSTANTANES_GARDES = 30;

export async function listCibles(orgId: string): Promise<Cible[]> {
  await ensureSchema();
  return query<Cible>(`SELECT * FROM surface_cibles WHERE org_id = $1 ORDER BY hote`, [orgId]);
}

export async function ajouterCible(orgId: string, userId: string, saisie: string): Promise<{ id: string } | { erreur: string }> {
  const hote = normaliserHote(saisie);
  if (!hote || hote.startsWith("*.")) return { erreur: "Indiquez un nom d'hôte précis (ex. app.exemple.fr)." };
  await ensureSchema();
  const n = await query<{ n: number }>(`SELECT count(*)::int AS n FROM surface_cibles WHERE org_id = $1`, [orgId]);
  if ((n[0]?.n ?? 0) >= 20) return { erreur: "20 cibles au plus par organisation." };
  const rows = await query<{ id: string }>(
    `INSERT INTO surface_cibles (org_id, user_id, hote) VALUES ($1,$2,$3)
     ON CONFLICT (org_id, hote) DO UPDATE SET actif = true RETURNING id`,
    [orgId, userId, hote]
  );
  return { id: rows[0].id };
}

export async function retirerCible(orgId: string, id: string): Promise<void> {
  await ensureSchema();
  await query(`DELETE FROM surface_cibles WHERE org_id = $1 AND id = $2`, [orgId, id]);
}

export async function journal(orgId: string, limite = JOURNAL_MAX): Promise<EntreeJournal[]> {
  await ensureSchema();
  return query<EntreeJournal>(
    `SELECT id::text, hote, date, gravite, type, phrase, lu FROM surface_journal
      WHERE org_id = $1
      ORDER BY date DESC, CASE gravite WHEN 'critique' THEN 0 WHEN 'important' THEN 1 ELSE 2 END, id DESC LIMIT $2`,
    [orgId, limite]
  );
}

export async function nonLus(orgId: string): Promise<number> {
  await ensureSchema();
  const r = await query<{ n: number }>(`SELECT count(*)::int AS n FROM surface_journal WHERE org_id = $1 AND NOT lu`, [orgId]);
  return r[0]?.n ?? 0;
}

export async function marquerLu(orgId: string): Promise<void> {
  await ensureSchema();
  await query(`UPDATE surface_journal SET lu = true WHERE org_id = $1 AND NOT lu`, [orgId]);
}

async function destinatairesEmail(orgId: string): Promise<string[]> {
  const r = await query<{ email: string }>(
    `SELECT u.email FROM org_members m JOIN users u ON u.id = m.user_id
      WHERE m.org_id = $1 AND m.role IN ('owner','admin')`,
    [orgId]
  );
  return r.map((x) => x.email);
}

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Contrôle une cible : autorisation, mesures, comparaison, journal, notifications. */
export async function controlerCible(c: Cible, declencheur: "cron" | "manuel"): Promise<{ statut: string; changements: Changement[] }> {
  const refus = await refusSansAutorisation(c.org_id, c.hote).catch((e) => String(e));
  if (refus) {
    await query(`UPDATE surface_cibles SET dernier_controle = now(), dernier_statut = $2 WHERE id = $1`, [c.id, "bloqué : autorisation"]);
    await logAudit({ orgId: c.org_id, actorId: c.user_id, action: "surface.blocked", target: c.hote, meta: { raison: refus, declencheur } }).catch(() => {});
    return { statut: "bloqué : aucune autorisation écrite en cours", changements: [] };
  }

  const prec = await query<{ donnees: Instantane }>(
    `SELECT donnees FROM surface_instantanes WHERE cible_id = $1 ORDER BY cree_le DESC LIMIT 1`,
    [c.id]
  );
  const apres = await mesurer(c.hote);
  const changements = comparer(prec[0]?.donnees ?? null, apres);

  await query(`INSERT INTO surface_instantanes (cible_id, donnees) VALUES ($1, $2)`, [c.id, JSON.stringify(apres)]);
  await query(
    `DELETE FROM surface_instantanes WHERE cible_id = $1 AND id NOT IN
       (SELECT id FROM surface_instantanes WHERE cible_id = $1 ORDER BY cree_le DESC LIMIT ${INSTANTANES_GARDES})`,
    [c.id]
  );
  for (const ch of changements)
    await query(
      `INSERT INTO surface_journal (org_id, cible_id, hote, date, gravite, type, phrase) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [c.org_id, c.id, c.hote, ch.date, ch.gravite, ch.type, ch.phrase]
    );
  // Journal plafonné à 300 entrées par organisation (les plus anciennes partent).
  await query(
    `DELETE FROM surface_journal WHERE org_id = $1 AND id NOT IN
       (SELECT id FROM surface_journal WHERE org_id = $1 ORDER BY date DESC, id DESC LIMIT ${JOURNAL_MAX})`,
    [c.org_id]
  );
  const injoignable = apres.ports === null && apres.tls === null && apres.entetes === null;
  const statut = injoignable ? "mesure impossible (hôte injoignable ou adresse non publique)" : `${changements.length} changement(s)`;
  await query(`UPDATE surface_cibles SET dernier_controle = now(), dernier_statut = $2 WHERE id = $1`, [c.id, statut]);

  const graves = changements.filter((x) => x.gravite !== "info");
  if (graves.length) {
    await notifyOrg(c.org_id, {
      event: "surface.change",
      text: `Sentinel — surface d'attaque de ${c.hote} : ${graves.map((g) => g.phrase).join(" ")}`,
      data: { hote: c.hote, changements: graves },
    }).catch(() => {});
    if (emailConfigured) {
      const html =
        `<p>Changements relevés par la surveillance quotidienne de <strong>${echapper(c.hote)}</strong> :</p><ul>` +
        graves.map((g) => `<li><strong>${g.gravite === "critique" ? "⚠ Critique" : "Important"}</strong> — ${echapper(g.phrase)}</li>`).join("") +
        `</ul><p>Détail dans Sentinel, onglet Surveillance.</p>`;
      for (const to of await destinatairesEmail(c.org_id).catch(() => []))
        await sendEmail(to, `Sentinel — ${graves.length} changement(s) sur ${c.hote}`, html).catch(() => false);
    }
  }
  return { statut, changements };
}

/**
 * Passage du cron : cibles actives, les plus anciennement contrôlées d'abord, dans un budget de
 * temps (les suivantes attendent le passage du lendemain).
 */
export async function controlerSurfacesDues(budgetMs: number): Promise<{ controlees: number; restantes: number }> {
  await ensureSchema();
  const debut = Date.now();
  const cibles = await query<Cible>(
    `SELECT * FROM surface_cibles WHERE actif = true
       AND (dernier_controle IS NULL OR dernier_controle < now() - interval '20 hours')
     ORDER BY dernier_controle NULLS FIRST LIMIT 100`
  );
  let n = 0;
  for (const c of cibles) {
    // Un passage dure jusqu'à ~45 s : on n'en commence pas un qui dépasserait le budget.
    if (Date.now() - debut > budgetMs - 45_000) break;
    await controlerCible(c, "cron").catch(() => null);
    n++;
  }
  return { controlees: n, restantes: cibles.length - n };
}
