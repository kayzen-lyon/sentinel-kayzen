/**
 * Grille de triage en 7 questions, posée sur chaque vulnérabilité avant de la confirmer.
 * Une seule réponse négative suffit à écarter le finding (faux positif ou informatif).
 *
 * Adaptée au contexte d'un audit sur son propre périmètre à partir du « 7-Question Gate » de
 * Claude-BugHunter (Sachin Sharma, contenu CC BY 4.0 — voir NOTICE). Module pur.
 */

export const TRIAGE_QUESTIONS: { q: string; hint: string }[] = [
  {
    q: "Exploitable maintenant, étape par étape ?",
    hint: "La preuve donne la requête exacte et le résultat obtenu, reproductible sans supposition.",
  },
  {
    q: "Impact réel sur la confidentialité, l'intégrité ou la disponibilité ?",
    hint: "Lecture, modification ou suppression de données, prise de compte, interruption de service.",
  },
  {
    q: "Cause racine sur un actif du périmètre vérifié ?",
    hint: "Pas chez un tiers (CDN, SaaS, fournisseur) ni sur un hôte hors du domaine vérifié.",
  },
  {
    q: "Atteignable sans privilège irréaliste ?",
    hint: "Ne suppose ni compte administrateur, ni accès physique, ni position réseau privilégiée.",
  },
  {
    q: "Ni comportement voulu, ni risque déjà accepté ?",
    hint: "Fonctionnalité documentée ou dérogation validée par l'équipe : à écarter.",
  },
  {
    q: "Impact démontré au-delà du « théoriquement possible » ?",
    hint: "Données réelles exposées ou action effectivement réalisée, pas seulement une hypothèse.",
  },
  {
    q: "Hors classes généralement non pertinentes ?",
    hint: "Ex. : en-tête manquant isolé, self-XSS, clickjacking sans action sensible, CSRF de déconnexion.",
  },
];

/** Réponse par question : true = oui, false = non, null = pas encore répondu. */
export type TriageAnswers = (boolean | null)[];

export type TriageVerdict =
  | { kind: "pending"; answered: number }
  | { kind: "valid" }
  | { kind: "reject"; failedAt: number };

/** Normalise une saisie (API) en tableau de 7 réponses, ou null si invalide. */
export function parseTriage(input: unknown): TriageAnswers | null {
  if (!Array.isArray(input) || input.length !== TRIAGE_QUESTIONS.length) return null;
  if (!input.every((v) => v === true || v === false || v === null)) return null;
  return input as TriageAnswers;
}

/** Verdict : la première réponse négative (dans l'ordre) écarte le finding. */
export function triageVerdict(answers: TriageAnswers | null | undefined): TriageVerdict {
  const a = answers || [];
  for (let i = 0; i < TRIAGE_QUESTIONS.length; i++) {
    if (a[i] === false) return { kind: "reject", failedAt: i };
    if (a[i] !== true) return { kind: "pending", answered: a.filter((v) => v !== null && v !== undefined).length };
  }
  return { kind: "valid" };
}
