import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import type { Sql } from "@/adapters/postgres/sql";

/** Postgres embutido com as migrations reais de db/migrations. */
export async function crearBaseDeDatos(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  const dir = join(process.cwd(), "db", "migrations");
  for (const archivo of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    try {
      await db.exec(readFileSync(join(dir, archivo), "utf8"));
    } catch (e) {
      throw new Error(`Falha na migration ${archivo}: ${(e as Error).message}`);
    }
  }
  return db;
}

/** Mesma interface que o app usa com o Neon. */
export function sqlDe(db: PGlite): Sql {
  return {
    query: async <T>(texto: string, params: unknown[] = []) => (await db.query<T>(texto, params)).rows,
  };
}
