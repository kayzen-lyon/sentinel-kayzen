import { issueAuthToken } from "./authtokens";
import { emailConfigured, sendEmail, verifyEmailEmail } from "./email";
import { isEmailVerified } from "./users";

/**
 * Vérification d'e-mail obligatoire avant tout pentest (action offensive).
 * Imposée seulement si l'envoi d'e-mails est configuré : sans Resend, personne ne
 * pourrait confirmer son adresse et les nouveaux comptes seraient bloqués.
 * Les comptes antérieurs à la migration 003 sont considérés comme vérifiés.
 */
export async function pentestEmailBlock(userId: string): Promise<string | null> {
  if (!emailConfigured) return null;
  if (await isEmailVerified(userId)) return null;
  return (
    "Confirmez votre adresse e-mail avant de lancer un pentest : cliquez sur le lien reçu " +
    "à l'inscription (ou redemandez-le depuis la console)."
  );
}

/** Envoie (ou renvoie) le lien de confirmation. Retourne false si l'e-mail n'est pas parti. */
export async function sendVerificationEmail(
  userId: string,
  email: string,
  origin: string
): Promise<boolean> {
  if (!emailConfigured) return false;
  const token = await issueAuthToken(userId, "verify");
  return sendEmail(
    email,
    "Confirmez votre adresse e-mail Sentinel",
    verifyEmailEmail(`${origin}/verifier-email/${token}`)
  );
}
