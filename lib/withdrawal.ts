/**
 * Fonction de rétractation en ligne (Directive 2011/83/UE art. 11 bis ;
 * C. conso L. 221-21 et D. 221-5). Libellés et textes partagés entre la page,
 * le formulaire et l'accusé de réception. Les deux libellés marqués « LÉGAL »
 * sont fixés par l'article D. 221-5 : ne pas les reformuler.
 */

/** LÉGAL — libellé du point d'entrée. */
export const WITHDRAW_LABEL = "Renoncer au contrat ici";
/** LÉGAL — libellé du bouton de confirmation (seul texte du bouton). */
export const CONFIRM_LABEL = "Confirmer la rétractation";

export const STATEMENT_TEXT = "Je me rétracte du contrat identifié ci-dessous.";

export type WithdrawalStatement = { name: string; contractId: string; email: string };

/** Date et heure lisibles, fuseau Europe/Paris explicite. */
export function formatReceivedAt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}
