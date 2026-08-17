import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sentinel_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

const DEV_FALLBACK_SECRET = "dev-insecure-secret-change-me-in-prod";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "";
  // En production, refuser de signer/vérifier avec le secret de repli : un secret par défaut
  // public rendrait les sessions falsifiables (usurpation de n'importe quel compte). On échoue
  // volontairement fermé — mieux vaut une auth indisponible qu'une auth contournable.
  if (process.env.NODE_ENV === "production") {
    if (s.length < 16) {
      throw new Error(
        "AUTH_SECRET manquant ou trop court en production (≥ 16 caractères requis). " +
          "Définissez une valeur secrète aléatoire pour sécuriser les sessions."
      );
    }
    return new TextEncoder().encode(s);
  }
  return new TextEncoder().encode(s || DEV_FALLBACK_SECRET);
}

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
