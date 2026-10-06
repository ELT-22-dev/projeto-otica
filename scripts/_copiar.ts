/**
 * Copia todos os dados de um Postgres para outro com o mesmo schema (migrations já aplicadas no destino).
 * Usado para mudar de hospedagem (Neon → Railway) sem perder nada, inclusive a sessão do WhatsApp.
 *
 * Tudo trafega como texto (`::text`) e o Postgres do destino converte para o tipo da coluna:
 * datas, horas e valores chegam idênticos, sem passar por Date do JavaScript (fuso).
 */
export type Consulta = <T = Record<string, unknown>>(texto: string, params?: unknown[]) => Promise<T[]>;

/** Ordem que respeita as chaves estrangeiras. */
export const TABLAS = [
  "usuarios",
  "clientes",
  "pedidos",
  "recetas",
  "notificaciones",
  "citas",
  "mensajes_whatsapp",
  "whatsapp_auth",
] as const;

const LOTE = 200;

async function columnas(q: Consulta, tabla: string): Promise<string[]> {
  const filas = await q<{ column_name: string }>(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [tabla],
  );
  return filas.map((f) => f.column_name);
}

const ident = (nombre: string) => `"${nombre.replace(/"/g, '""')}"`;

async function copiarTabla(origen: Consulta, destino: Consulta, tabla: string): Promise<number> {
  const cols = await columnas(origen, tabla);
  const lista = cols.map(ident).join(", ");
  const filas = await origen<Record<string, string | null>>(
    `select ${cols.map((c) => `${ident(c)}::text as ${ident(c)}`).join(", ")} from ${ident(tabla)}`,
  );
  for (let i = 0; i < filas.length; i += LOTE) {
    const lote = filas.slice(i, i + LOTE);
    const params: (string | null)[] = [];
    const valores = lote.map((f) => `(${cols.map((c) => `$${params.push(f[c] ?? null)}`).join(", ")})`);
    // "overriding system value": mantém o número dos pedidos (#0001…) igual ao original.
    await destino(
      `insert into ${ident(tabla)} (${lista}) overriding system value values ${valores.join(", ")}`,
      params,
    );
  }
  return filas.length;
}

export async function copiarDatos(origen: Consulta, destino: Consulta, log: (m: string) => void = () => {}) {
  const [ocupado] = await destino<{ n: number }>(
    "select (select count(*) from clientes) + (select count(*) from pedidos) + (select count(*) from usuarios) as n",
  );
  if (Number(ocupado?.n ?? 0) > 0) throw new Error("O banco de destino já tem dados: abortado para não misturar.");

  // Configuração: uma linha só (id = 1), já criada pela migration no destino.
  await destino("delete from configuracion");
  log(`configuracion: ${await copiarTabla(origen, destino, "configuracion")}`);

  for (const tabla of TABLAS) log(`${tabla}: ${await copiarTabla(origen, destino, tabla)}`);

  // Próximo pedido continua a numeração.
  await destino(
    `select setval(pg_get_serial_sequence('pedidos', 'numero'), coalesce((select max(numero) from pedidos), 0) + 1, false)`,
  );
}
