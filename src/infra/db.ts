import "server-only";
import { neon } from "@neondatabase/serverless";
import pg from "pg";
import type { Sql } from "@/adapters/postgres/sql";
import { env } from "./env";

let instancia: Sql | null = null;

/** Neon: driver HTTP (sem conexão persistente), bom para funções serverless como as da Vercel. */
function esNeon(url: string): boolean {
  return new URL(url).hostname.endsWith(".neon.tech");
}

/**
 * Neon → driver HTTP do Neon.
 * Qualquer outro Postgres (Railway, local com npm run db:local) → driver pg com pool:
 * no Railway o app é um servidor sempre ligado, então manter conexões abertas é o mais rápido.
 */
export function sql(): Sql {
  if (!instancia) {
    const url = env().DATABASE_URL;
    if (esNeon(url)) {
      const consulta = neon(url);
      instancia = {
        query: async <T>(texto: string, params: unknown[] = []) => (await consulta.query(texto, params)) as T[],
      };
    } else {
      const pool = new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
      instancia = {
        query: async <T>(texto: string, params: unknown[] = []) => (await pool.query(texto, params)).rows as T[],
      };
    }
  }
  return instancia;
}
