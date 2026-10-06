import "server-only";
import { neon } from "@neondatabase/serverless";
import pg from "pg";
import type { Sql } from "@/adapters/postgres/sql";
import { env } from "./env";

let instancia: Sql | null = null;

function esLocal(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Produção: driver HTTP do Neon (sem conexão persistente, adequado para funções serverless).
 * Desenvolvimento com Postgres local (npm run db:local): driver pg comum.
 */
export function sql(): Sql {
  if (!instancia) {
    const url = env().DATABASE_URL;
    if (esLocal(url)) {
      const pool = new pg.Pool({ connectionString: url, max: 5 });
      instancia = {
        query: async <T>(texto: string, params: unknown[] = []) => (await pool.query(texto, params)).rows as T[],
      };
    } else {
      const consulta = neon(url);
      instancia = {
        query: async <T>(texto: string, params: unknown[] = []) => (await consulta.query(texto, params)) as T[],
      };
    }
  }
  return instancia;
}
