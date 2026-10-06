/**
 * Aplica as migrations pendentes de db/migrations, em ordem, cada uma numa transação.
 *
 *   npm run db:migrar -- --listar   → só mostra o que está pendente
 *   npm run db:migrar               → aplica
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conectar } from "./_db";

const DIR = join(process.cwd(), "db", "migrations");

async function main() {
  const db = await conectar();
  try {
    await db.query(`create table if not exists _migraciones (
      nombre text primary key,
      aplicada_en timestamptz not null default now()
    )`);
    const { rows } = await db.query<{ nombre: string }>("select nombre from _migraciones");
    const aplicadas = new Set(rows.map((r) => r.nombre));
    const pendientes = readdirSync(DIR)
      .filter((f) => f.endsWith(".sql") && !aplicadas.has(f))
      .sort();

    if (pendientes.length === 0) {
      console.log("✓ Banco em dia, nenhuma migration pendente.");
      return;
    }
    console.log(`Pendentes: ${pendientes.join(", ")}`);
    if (process.argv.includes("--listar")) return;

    for (const archivo of pendientes) {
      await db.query("begin");
      try {
        await db.query(readFileSync(join(DIR, archivo), "utf8"));
        await db.query("insert into _migraciones (nombre) values ($1)", [archivo]);
        await db.query("commit");
        console.log(`✓ ${archivo}`);
      } catch (e) {
        await db.query("rollback");
        console.error(`✗ ${archivo}: ${(e as Error).message}`);
        process.exit(1);
      }
    }
  } finally {
    await db.end();
  }
}

main();
