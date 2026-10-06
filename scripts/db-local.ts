/**
 * Postgres local sem Docker (PGlite), para desenvolver sem depender do Neon.
 *
 *   npm run db:local
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable
 *
 * Os dados ficam em .pglite/ (apague a pasta para começar do zero).
 */
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PUERTO = Number(process.env.PUERTO_DB_LOCAL ?? 5433);

async function main() {
  const db = await PGlite.create("./.pglite", { extensions: { pg_trgm, unaccent } });
  const server = new PGLiteSocketServer({ db, port: PUERTO, host: "127.0.0.1", maxConnections: 10 });
  await server.start();
  console.log(`Postgres local em postgresql://postgres:postgres@127.0.0.1:${PUERTO}/postgres?sslmode=disable`);

  const parar = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", parar);
  process.on("SIGTERM", parar);
}

main();
