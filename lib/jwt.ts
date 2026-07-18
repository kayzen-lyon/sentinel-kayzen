import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sentinel_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-in-prod";
  return new TextEncoder().encode(s);
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
