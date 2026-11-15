import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Chiffrement applicatif des secrets stockés en base (jetons Jira/Linear, URLs de
 * webhook Slack/génériques) : AES-256-GCM, format `enc:v1:<base64(iv|tag|chiffré)>`.
 *
 * Clé : `INTEGRATIONS_KEY` (32 octets en base64) si définie, sinon dérivée de
 * `AUTH_SECRET` par HKDF. ⚠️ Sans INTEGRATIONS_KEY, changer AUTH_SECRET rend les
 * secrets illisibles : il faudra alors ressaisir les intégrations.
 *
 * Les valeurs historiques en clair (sans préfixe) restent lisibles ; elles sont
 * rechiffrées par la maintenance quotidienne (lib/maintenance.ts).
 */

const PREFIX = "enc:v1:";
const DEV_FALLBACK = "sentinel-dev-only-integrations-key";

function key(): Buffer {
  const explicit = process.env.INTEGRATIONS_KEY;
  if (explicit) {
    const k = Buffer.from(explicit, "base64");
    if (k.length !== 32) throw new Error("INTEGRATIONS_KEY doit faire 32 octets (base64).");
    return k;
  }
  const base = process.env.AUTH_SECRET || "";
  if (process.env.NODE_ENV === "production" && base.length < 16)
    throw new Error("AUTH_SECRET ou INTEGRATIONS_KEY requis pour chiffrer les secrets.");
  return Buffer.from(
    hkdfSync("sha256", base || DEV_FALLBACK, "sentinel", "integrations-secretbox-v1", 32)
  );
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Chiffre une valeur non vide ; null/"" restent null. */
export function seal(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

/** Déchiffre ; une valeur historique en clair est renvoyée telle quelle, une valeur illisible → null. */
export function open(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncrypted(value)) return value;
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Aperçu non sensible pour l'interface : `hooks.slack.com/…a1b2`. */
export function hint(value: string | null | undefined): string {
  if (!value) return "";
  let host = "";
  try {
    host = new URL(value).hostname;
  } catch {
    /* jeton, pas une URL */
  }
  const tail = value.slice(-4);
  return host ? `${host}/…${tail}` : `…${tail}`;
}
