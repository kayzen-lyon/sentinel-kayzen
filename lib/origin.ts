/**
 * Origine publique à utiliser dans les liens envoyés par e-mail.
 * `APP_URL` (ou `APP_BASE_URL`) si défini, sinon l'hôte de la requête — sur Vercel,
 * le domaine par lequel l'utilisateur est arrivé (pas l'URL interne du déploiement).
 */
export function publicOrigin(req: Request): string {
  const env = process.env.APP_URL || process.env.APP_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}
