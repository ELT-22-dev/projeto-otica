/**
 * Copia os dados de um banco para outro (ex.: Neon → Postgres do Railway).
 *
 *   ORIGEN_URL=... DESTINO_URL=... npx tsx scripts/copiar-banco.ts
 *
 * Antes: aplicar as migrations no destino (DATABASE_URL=<destino> npm run db:migrar).
 * As URLs vão por variável de ambiente, nunca na linha de comando (ficariam no histórico).
 */
import pg from "pg";
import { copiarDatos, TABLAS } from "./_copiar";

async function conectar(nombre: string) {
  const url = process.env[nombre];
  if (!url) {
    console.error(`Falta ${nombre}.`);
    process.exit(1);
  }
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  return cliente;
}

async function main() {
  const origen = await conectar("ORIGEN_URL");
  const destino = await conectar("DESTINO_URL");
  try {
    await destino.query("begin");
    await copiarDatos(
      async (texto, params) => (await origen.query(texto, params)).rows,
      async (texto, params) => (await destino.query(texto, params)).rows,
      (m) => console.log(`  ${m}`),
    );
    await destino.query("commit");

    // Conferência: mesmas quantidades dos dois lados.
    for (const tabla of ["configuracion", ...TABLAS]) {
      const contar = async (c: pg.Client) => Number((await c.query(`select count(*) as n from ${tabla}`)).rows[0].n);
      const [a, b] = [await contar(origen), await contar(destino)];
      if (a !== b) throw new Error(`${tabla}: origem ${a}, destino ${b}`);
    }
    console.log("✓ Cópia conferida: todas as tabelas com as mesmas quantidades.");
  } catch (e) {
    await destino.query("rollback").catch(() => {});
    console.error(`✗ ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    await origen.end();
    await destino.end();
  }
}

main();
