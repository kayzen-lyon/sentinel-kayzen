/**
 * Types et libellés de la carte de surface d'attaque — module pur, sans dépendance serveur,
 * partagé entre le scanner (lib/jssurface.ts), la création de jobs et l'interface.
 */

export type AttackClass =
  | "open-redirect"
  | "lfi"
  | "ssrf"
  | "idor"
  | "sqli"
  | "xss"
  | "ssti"
  | "graphql"
  | "llm-ai"
  | "auth-bypass"
  | "websocket"
  | "info-leak"
  | "shadow-api"
  | "forgot-password"
  | "file-upload";

export const ATTACK_CLASS_LABELS: Record<AttackClass, string> = {
  "open-redirect": "Redirection ouverte",
  lfi: "Inclusion de fichier",
  ssrf: "SSRF",
  idor: "IDOR / contrôle d'accès",
  sqli: "Injection SQL",
  xss: "XSS",
  ssti: "Injection de gabarit",
  graphql: "GraphQL",
  "llm-ai": "IA / LLM",
  "auth-bypass": "Authentification",
  websocket: "WebSocket",
  "info-leak": "Fuite d'information",
  "shadow-api": "API non documentée",
  "forgot-password": "Réinitialisation de mot de passe",
  "file-upload": "Téléversement de fichier",
};

export type SurfaceItem = {
  /** Chemin relatif à l'origine (jamais un hôte tiers). */
  path: string;
  /** Paramètre d'entrée, s'il y en a un. */
  param?: string;
  method?: "GET" | "POST";
  source: "js" | "form" | "lien";
  classes: AttackClass[];
};

/**
 * Consigne de ciblage transmise au moteur Strix : les points d'entrée prioritaires de la carte.
 * Ne contient que des chemins de l'origine vérifiée (jamais d'hôte tiers).
 */
export function surfaceInstruction(items: SurfaceItem[], max = 15): string | null {
  const top = items.filter((i) => i.classes.some((c) => c !== "info-leak")).slice(0, max);
  if (!top.length) return null;
  const lines = top.map(
    (i) => `- ${i.method ? `${i.method} ` : ""}${i.path}${i.param ? ` (paramètre « ${i.param} »)` : ""} → ${i.classes.join(", ")}`
  );
  return (
    "Points d'entrée prioritaires cartographiés par Sentinel (analyse passive) — teste-les en priorité, " +
    "en restant strictement sur l'hôte cible :\n" +
    lines.join("\n")
  );
}
