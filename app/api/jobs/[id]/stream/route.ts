import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getJob, listFindings } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

const TERMINAL = new Set(["done", "error", "cancelled"]);

/**
 * Flux SSE des findings d'un job en temps quasi réel (poll de la base toutes les 2 s).
 * La connexion se ferme au bout de ~55 s ou dès que le job est terminé ; côté client,
 * `EventSource` se reconnecte automatiquement tant que le job n'est pas terminal.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new Response("Non authentifié.", { status: 401 });
  if (!dbConfigured) return new Response("Base non configurée.", { status: 503 });

  const { id } = await params;
  const job = await getJob(id, session.id);
  if (!job) return new Response("Job introuvable.", { status: 404 });

  const encoder = new TextEncoder();
  let lastIso = new Date(0).toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      };

      let lastGraph = "";
      const maybeSendGraph = (graph: unknown) => {
        if (graph == null) return;
        const s = JSON.stringify(graph);
        if (s !== lastGraph) {
          lastGraph = s;
          send("graph", graph);
        }
      };

      // Snapshot initial (statut + findings déjà présents)
      const [initial, findings] = await Promise.all([
        getJob(id, session.id),
        listFindings(id),
      ]);
      if (findings.length) lastIso = findings[findings.length - 1].created_at;
      send("status", { status: initial?.status, costUsd: initial?.cost_usd });
      maybeSendGraph(initial?.agents_graph);
      for (const f of findings) send("finding", f);
      if (initial && TERMINAL.has(initial.status)) {
        send("done", { status: initial.status });
        close();
        return;
      }

      const deadline = Date.now() + 55_000;
      const timer = setInterval(async () => {
        try {
          const [fresh, j] = await Promise.all([
            listFindings(id, lastIso),
            getJob(id, session.id),
          ]);
          for (const f of fresh) {
            send("finding", f);
            lastIso = f.created_at;
          }
          send("status", { status: j?.status, costUsd: j?.cost_usd });
          maybeSendGraph(j?.agents_graph);
          if (j && TERMINAL.has(j.status)) {
            send("done", { status: j.status });
            close();
            return;
          }
          if (Date.now() > deadline) close(); // le client se reconnecte
        } catch {
          close();
        }
      }, 2000);

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
