/**
 * Formats de date figés (locale + fuseau explicites) pour que le rendu serveur
 * et le rendu navigateur produisent le même texte — sinon l'hydratation casse.
 */
const DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | number | Date): string {
  return DATE.format(new Date(value));
}

export function formatDateTime(value: string | number | Date): string {
  return DATE_TIME.format(new Date(value));
}
