import { createHash } from "node:crypto";
import { ensureSchema, query } from "./db";

/**
 * Autorisations écrites de test d'intrusion.
 *
 * Aucun test actif (pentest, scan approfondi, surveillance planifiée, contrôle de surface
 * d'attaque) ne part sans une autorisation écrite du client enregistrée ici : document signé,
 * périmètre (hôtes), date de début et date de fin. Vérifiée côté serveur avant chaque lancement
 * et à chaque passage du cron. La preuve de propriété du domaine (onglet Domaines) reste exigée
 * en plus : l'une ne remplace pas l'autre.
 */

export type Autorisation = {
  id: string;
  client: string;
  perimetre: string[];
  debut: string; // AAAA-MM-JJ, inclus
  fin: string; // AAAA-MM-JJ, inclus
  document_nom: string;
  document_sha256: string;
  revoked_at: string | null;
  created_at: string;
};

export const DOCUMENT_TAILLE_MAX = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const CARACTERES = /^[a-z0-9-]+$/;
const etiquette = (p: string) => p.length > 0 && p.length <= 63 && CARACTERES.test(p) && !p.startsWith("-") && !p.endsWith("-");
const TLD = /^[a-z]{2,63}$/;

/** Nom d'hôte valide (joker « *. » permis en tête), contrôlé étiquette par étiquette (pas de ReDoS). */
function hoteValide(h: string): boolean {
  const nom = h.startsWith("*.") ? h.slice(2) : h;
  const parts = nom.split(".");
  if (parts.length < 2 || nom.length > 253) return false;
  return TLD.test(parts[parts.length - 1]) && parts.slice(0, -1).every(etiquette);
}

/** Normalise une entrée de périmètre (« https://App.Exemple.fr/x » → « app.exemple.fr »). */
export function normaliserHote(entree: string): string | null {
  let h = entree.trim().toLowerCase();
  if (!h) return null;
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/[/?#:].*$/, "").replace(/\.$/, "");
  return hoteValide(h) ? h : null;
}

/** Un hôte est-il dans le périmètre ? « *.exemple.fr » couvre les sous-domaines, pas l'apex. */
export function perimetreCouvre(perimetre: string[], hote: string): boolean {
  const h = hote.toLowerCase().replace(/\.$/, "");
  return perimetre.some((p) => {
    const e = p.toLowerCase();
    if (e.startsWith("*.")) return h.endsWith(e.slice(1)) && h.length > e.length - 1;
    return h === e;
  });
}

/** Date du jour (UTC) au format AAAA-MM-JJ. */
export function jour(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** L'autorisation couvre-t-elle cet hôte à cette date ? (fonction pure) */
export function autorisationCouvre(
  a: Pick<Autorisation, "perimetre" | "debut" | "fin" | "revoked_at">,
  hote: string,
  quand: Date
): boolean {
  if (a.revoked_at) return false;
  const j = jour(quand);
  return a.debut <= j && j <= a.fin && perimetreCouvre(a.perimetre, hote);
}

/** Contrôle des champs saisis ; renvoie la liste des erreurs (vide si tout est valide). */
export function validerAutorisation(input: {
  client: string;
  perimetre: string[];
  debut: string;
  fin: string;
  documentType: string;
  documentTaille: number;
}): string[] {
  const err: string[] = [];
  if (!input.client.trim()) err.push("Indiquez le client qui autorise le test.");
  if (!input.perimetre.length) err.push("Indiquez au moins un hôte dans le périmètre.");
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (!date.test(input.debut) || !date.test(input.fin)) err.push("Dates de début et de fin requises (AAAA-MM-JJ).");
  else if (input.debut > input.fin) err.push("La date de fin précède la date de début.");
  if (!DOCUMENT_TYPES.includes(input.documentType)) err.push("Document attendu : PDF, PNG ou JPEG signé.");
  if (input.documentTaille <= 0 || input.documentTaille > DOCUMENT_TAILLE_MAX)
    err.push("Le document doit faire moins de 5 Mo.");
  return err;
}

export async function listAutorisations(orgId: string): Promise<Autorisation[]> {
  await ensureSchema();
  return query<Autorisation>(
    `SELECT id, client, perimetre, to_char(debut,'YYYY-MM-DD') AS debut, to_char(fin,'YYYY-MM-DD') AS fin,
            document_nom, document_sha256, revoked_at, created_at
       FROM autorisations_test WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
}

export async function creerAutorisation(
  orgId: string,
  userId: string,
  a: { client: string; perimetre: string[]; debut: string; fin: string; documentNom: string; documentType: string; document: Buffer }
): Promise<string> {
  await ensureSchema();
  const sha = createHash("sha256").update(a.document).digest("hex");
  const rows = await query<{ id: string }>(
    `INSERT INTO autorisations_test (org_id, client, perimetre, debut, fin, document_nom, document_type, document_sha256, document, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [orgId, a.client.trim(), a.perimetre, a.debut, a.fin, a.documentNom, a.documentType, sha, a.document, userId]
  );
  return rows[0].id;
}

/** Révocation : l'autorisation reste conservée comme trace, mais ne couvre plus rien. */
export async function revoquerAutorisation(orgId: string, id: string): Promise<void> {
  await ensureSchema();
  await query(`UPDATE autorisations_test SET revoked_at = now() WHERE org_id=$1 AND id=$2 AND revoked_at IS NULL`, [orgId, id]);
}

export async function documentAutorisation(
  orgId: string,
  id: string
): Promise<{ document_nom: string; document_type: string; document: Buffer } | null> {
  await ensureSchema();
  const rows = await query<{ document_nom: string; document_type: string; document: Buffer }>(
    `SELECT document_nom, document_type, document FROM autorisations_test WHERE org_id=$1 AND id=$2`,
    [orgId, id]
  );
  return rows[0] ?? null;
}

/**
 * Vérification serveur avant tout test actif. Renvoie null si autorisé, sinon la raison du refus.
 */
export async function refusSansAutorisation(orgId: string | null, hote: string, quand = new Date()): Promise<string | null> {
  if (!orgId) return "Aucune organisation active : impossible de vérifier l'autorisation écrite du client.";
  const liste = await listAutorisations(orgId);
  if (liste.some((a) => autorisationCouvre(a, hote, quand))) return null;
  return (
    `Aucune autorisation écrite en cours de validité ne couvre ${hote}. ` +
    "Enregistrez l'autorisation signée du client (document, périmètre, dates) dans l'onglet Autorisations."
  );
}
