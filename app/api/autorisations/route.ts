import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getActiveOrg } from "@/lib/activeorg";
import { canLaunch } from "@/lib/orgs";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";
import {
  creerAutorisation,
  listAutorisations,
  normaliserHote,
  revoquerAutorisation,
  validerAutorisation,
} from "@/lib/autorisations";

export const runtime = "nodejs";

/** Autorisations écrites de l'organisation active (sans le document lui-même). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ autorisations: [] });
  const { orgId } = await getActiveOrg(session);
  return NextResponse.json({ autorisations: await listAutorisations(orgId) });
}

/** Enregistre une autorisation : formulaire multipart (client, périmètre, dates, document signé). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  const rl = await checkRateLimit(`autorisation:${session.id}`, 20, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });

  const { orgId, role } = await getActiveOrg(session);
  if (!canLaunch(role))
    return NextResponse.json({ error: "Votre rôle (Lecteur) ne permet pas d'enregistrer une autorisation." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const fichier = form.get("document");
  const brut = String(form.get("perimetre") || "")
    .split(/[\s,;]+/)
    .filter(Boolean);
  const perimetre = brut.map(normaliserHote);
  if (perimetre.some((h) => !h))
    return NextResponse.json({ error: "Périmètre : un hôte par ligne (ex. app.exemple.fr ou *.exemple.fr)." }, { status: 400 });
  const input = {
    client: String(form.get("client") || ""),
    perimetre: [...new Set(perimetre as string[])],
    debut: String(form.get("debut") || ""),
    fin: String(form.get("fin") || ""),
    documentType: fichier instanceof File ? fichier.type : "",
    documentTaille: fichier instanceof File ? fichier.size : 0,
  };
  const erreurs = validerAutorisation(input);
  if (erreurs.length || !(fichier instanceof File)) return NextResponse.json({ error: erreurs.join(" ") }, { status: 400 });

  const id = await creerAutorisation(orgId, session.id, {
    ...input,
    documentNom: fichier.name.slice(0, 200),
    document: Buffer.from(await fichier.arrayBuffer()),
  });
  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "autorisation.create",
    target: input.perimetre.join(", "),
    meta: { id, client: input.client, debut: input.debut, fin: input.fin },
  }).catch(() => {});
  return NextResponse.json({ id });
}

/** Révoque une autorisation (la trace est conservée). */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  const { orgId, role } = await getActiveOrg(session);
  if (!canLaunch(role)) return NextResponse.json({ error: "Rôle insuffisant." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  await revoquerAutorisation(orgId, id);
  await logAudit({ orgId, actorId: session.id, actorEmail: session.email, action: "autorisation.revoke", target: id }).catch(() => {});
  return NextResponse.json({ ok: true });
}
