/**
 * O mínimo que os repositórios precisam de um banco Postgres.
 * Produção: driver HTTP do Neon (src/infra/db.ts). Testes: PGlite.
 */
export interface Sql {
  query<T = Record<string, unknown>>(texto: string, params?: unknown[]): Promise<T[]>;
}

export class ErrorPersistencia extends Error {
  constructor(operacion: string, causa: unknown) {
    super(`${operacion}: ${causa instanceof Error ? causa.message : String(causa)}`, { cause: causa });
    this.name = "ErrorPersistencia";
  }
}

export async function consultar<T>(sql: Sql, operacion: string, texto: string, params: unknown[] = []): Promise<T[]> {
  try {
    return await sql.query<T>(texto, params);
  } catch (e) {
    throw new ErrorPersistencia(operacion, e);
  }
}

/** Escapa curingas do LIKE no texto digitado pelo usuário. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, "\\$&");
}
