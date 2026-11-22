import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getActiveOrg } from "@/lib/activeorg";
import { documentAutorisation } from "@/lib/autorisations";

export const runtime = "nodejs";

/** Document signé d'une autorisation : membres de l'organisation seulement, jamais public. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Non authentifié.", { status: 401 });
  if (!dbConfigured) return new Response("Base non configurée.", { status: 503 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Identifiant invalide.", { status: 400 });
  const { orgId } = await getActiveOrg(session);
  const doc = await documentAutorisation(orgId, id);
  if (!doc) return new Response("Introuvable.", { status: 404 });
  const nom = doc.document_nom.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(doc.document), {
    headers: {
      "content-type": doc.document_type,
      "content-disposition": `attachment; filename="${nom}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
