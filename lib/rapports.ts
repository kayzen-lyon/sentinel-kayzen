import { ensureSchema, query } from "./db";
import { userOrgIds } from "./orgs";
import { listFindingsAvecPreuves } from "./jobs";
import {
  AGE_MAX_JOURS,
  construireRapport,
  verifierSources,
  type ModeleRapport,
  type PentestSource,
  type ScanSource,
  type SourceEnregistree,
} from "./rapport";

/**
 * Rapports de test d'intrusion : accès serveur. Un rapport ne stocke que des identifiants ;
 * il est réassemblé à chaque consultation à partir des scans et pentests enregistrés, après
 * contrôle d'appartenance. Jamais public : aucune route anonyme, aucun lien de partage.
 */

export type RapportRow = {
  id: string;
  org_id: string | null;
  user_id: string;
  titre: string;
  scan_ids: string[];
  job_ids: string[];
  cree_le: string;
  expire_le: string | null;
};

/**
 * Durée de conservation des rapports, en jours (variable RAPPORTS_CONSERVATION_JOURS).
 * Non fixée par défaut : c'est une question juridique ouverte (RGPD, contrat client).
 */
export function dureeConservationJours(): number | null {
  const n = Number(process.env.RAPPORTS_CONSERVATION_JOURS);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function sourcesScans(ids: string[]): Promise<(SourceEnregistree & { row: ScanSource })[]> {
  if (!ids.length) return [];
  const rows = await query<SourceEnregistree & ScanSource>(
    `SELECT id, user_id, org_id, status, created_at, target_url, deep, score, grade, COALESCE(findings, '[]'::jsonb) AS findings
       FROM scans WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return rows.map((r) => ({ ...r, row: r }));
}

async function sourcesPentests(ids: string[]): Promise<(SourceEnregistree & { row: Omit<PentestSource, "findings"> })[]> {
  if (!ids.length) return [];
  const rows = await query<SourceEnregistree & Omit<PentestSource, "findings">>(
    `SELECT id, user_id, org_id, status, created_at, target_url, mode, started_at, completed_at
       FROM jobs WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return rows.map((r) => ({ ...r, row: r }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Crée un rapport après vérification serveur de chaque source. Renvoie l'id ou les erreurs. */
export async function creerRapport(
  userId: string,
  orgId: string | null,
  demande: { titre: string; scanIds: string[]; jobIds: string[] }
): Promise<{ id: string } | { erreurs: string[] }> {
  await ensureSchema();
  const scanIds = [...new Set(demande.scanIds)].filter((x) => UUID.test(x)).slice(0, 20);
  const jobIds = [...new Set(demande.jobIds)].filter((x) => UUID.test(x)).slice(0, 10);
  if (!scanIds.length && !jobIds.length) return { erreurs: ["Choisissez au moins un scan ou un pentest."] };
  const orgIds = await userOrgIds(userId);
  const maintenant = new Date();
  const erreurs = [
    ...verifierSources(scanIds, await sourcesScans(scanIds), { userId, orgIds }, maintenant, "scan"),
    ...verifierSources(jobIds, await sourcesPentests(jobIds), { userId, orgIds }, maintenant, "pentest"),
  ];
  if (erreurs.length) return { erreurs };
  const duree = dureeConservationJours();
  const titre = demande.titre.trim().slice(0, 140) || "Rapport de test d'intrusion";
  const rows = await query<{ id: string }>(
    `INSERT INTO rapports (org_id, user_id, titre, scan_ids, job_ids, expire_le)
     VALUES ($1,$2,$3,$4,$5, CASE WHEN $6::int IS NULL THEN NULL ELSE now() + make_interval(days => $6::int) END)
     RETURNING id`,
    [orgId, userId, titre, scanIds, jobIds, duree]
  );
  return { id: rows[0].id };
}

/** Rapports visibles par l'utilisateur (les siens et ceux de ses organisations). */
export async function listRapports(userId: string): Promise<RapportRow[]> {
  await ensureSchema();
  const orgIds = await userOrgIds(userId);
  return query<RapportRow>(
    `SELECT * FROM rapports
      WHERE (user_id = $1 OR org_id = ANY($2::uuid[])) AND (expire_le IS NULL OR expire_le > now())
      ORDER BY cree_le DESC LIMIT 100`,
    [userId, orgIds]
  );
}

async function rapportAccessible(userId: string, id: string): Promise<RapportRow | null> {
  if (!UUID.test(id)) return null;
  await ensureSchema();
  const orgIds = await userOrgIds(userId);
  const rows = await query<RapportRow>(
    `SELECT * FROM rapports WHERE id = $1 AND (user_id = $2 OR org_id = ANY($3::uuid[]))
        AND (expire_le IS NULL OR expire_le > now())`,
    [id, userId, orgIds]
  );
  return rows[0] ?? null;
}

/**
 * Réassemble le rapport pour un utilisateur autorisé. Les sources sont relues côté serveur et
 * l'appartenance revérifiée (un membre retiré de l'organisation n'y a plus accès).
 */
export async function chargerRapport(userId: string, id: string): Promise<{ rapport: RapportRow; modele: ModeleRapport } | null> {
  const rapport = await rapportAccessible(userId, id);
  if (!rapport) return null;
  const orgIds = await userOrgIds(userId);
  const possede = (s: SourceEnregistree) => s.user_id === userId || (s.org_id !== null && orgIds.includes(s.org_id));
  const scans = (await sourcesScans(rapport.scan_ids)).filter(possede).map((s) => s.row);
  const jobs = (await sourcesPentests(rapport.job_ids)).filter(possede);
  const pentests: PentestSource[] = [];
  for (const j of jobs) {
    const findings = await listFindingsAvecPreuves(j.id);
    pentests.push({
      ...j.row,
      findings: findings.map((f) => ({
        native_id: f.native_id,
        title: f.title,
        severity: f.severity,
        cvss: f.cvss,
        status: f.status,
        payload: (f.payload as Record<string, unknown> | null) ?? null,
        preuves: f.preuves,
        aPreuve: Boolean(f.has_proof),
      })),
    });
  }
  return { rapport, modele: construireRapport(rapport.titre, scans, pentests, new Date(rapport.cree_le)) };
}

export async function supprimerRapport(userId: string, id: string): Promise<boolean> {
  const r = await rapportAccessible(userId, id);
  if (!r || r.user_id !== userId) return false;
  await query(`DELETE FROM rapports WHERE id = $1`, [id]);
  return true;
}

/** Sources éligibles à un nouveau rapport (terminées, 7 jours au plus), pour le formulaire. */
export async function sourcesEligibles(userId: string): Promise<{
  scans: { id: string; target_url: string; created_at: string; score: number | null }[];
  pentests: { id: string; target_url: string; created_at: string; mode: string }[];
}> {
  await ensureSchema();
  const orgIds = await userOrgIds(userId);
  const scans = await query<{ id: string; target_url: string; created_at: string; score: number | null }>(
    `SELECT id, target_url, created_at, score FROM scans
      WHERE status='done' AND (user_id=$1 OR org_id = ANY($2::uuid[])) AND created_at > now() - make_interval(days => $3::int)
      ORDER BY created_at DESC LIMIT 30`,
    [userId, orgIds, AGE_MAX_JOURS]
  );
  const pentests = await query<{ id: string; target_url: string; created_at: string; mode: string }>(
    `SELECT id, target_url, created_at, mode FROM jobs
      WHERE status='done' AND (user_id=$1 OR org_id = ANY($2::uuid[])) AND created_at > now() - make_interval(days => $3::int)
      ORDER BY created_at DESC LIMIT 20`,
    [userId, orgIds, AGE_MAX_JOURS]
  );
  return { scans, pentests };
}

/** Purge des rapports arrivés à expiration (maintenance quotidienne). */
export async function purgerRapportsExpires(): Promise<number> {
  await ensureSchema();
  const r = await query<{ id: string }>(`DELETE FROM rapports WHERE expire_le IS NOT NULL AND expire_le < now() RETURNING id`);
  return r.length;
}
