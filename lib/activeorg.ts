import { cookies } from "next/headers";
import { ensurePersonalOrg, getRole, type Role } from "./orgs";

/**
 * Organisation active de la console (sélecteur d'organisation).
 * Stockée dans un cookie, mais l'appartenance est revérifiée à CHAQUE requête :
 * un cookie modifié à la main ou un membre retiré retombe sur l'espace personnel.
 */

export const ORG_COOKIE = "sentinel_org";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ActiveOrg = { orgId: string; role: Role | null; personal: boolean };

export async function getActiveOrg(session: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<ActiveOrg> {
  const personal = await ensurePersonalOrg(session.id, session.name || session.email);
  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  if (wanted && wanted !== personal && UUID.test(wanted)) {
    const role = await getRole(wanted, session.id);
    if (role) return { orgId: wanted, role, personal: false };
  }
  return { orgId: personal, role: await getRole(personal, session.id), personal: true };
}

export function orgCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
