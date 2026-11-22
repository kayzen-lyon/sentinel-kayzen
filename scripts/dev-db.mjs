#!/usr/bin/env node
/**
 * Base Postgres LOCALE pour le développement et les contrôles (axe-core, Playwright) :
 * PGlite (Postgres compilé en WebAssembly) exposé sur le protocole Postgres.
 *
 *   node scripts/dev-db.mjs            # écoute sur 127.0.0.1:54339, données dans .pglite/
 *   DATABASE_URL=postgres://postgres@localhost:54339/postgres npm run dev
 *
 * Une base corrompue ne se répare pas : supprimer .pglite/ puis relancer ce script et le seed.
 * Jamais utilisé en production.
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.PGLITE_PORT) || 54339;
const dir = process.env.PGLITE_DIR || "./.pglite";

const db = await PGlite.create(dir, { extensions: { pgcrypto } });
// Plusieurs connexions (Next.js en ouvre plusieurs) : les requêtes sont mises en file par PGlite.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`PGlite prêt : postgres://postgres@localhost:${port}/postgres (données : ${dir})`);

async function stop() {
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
