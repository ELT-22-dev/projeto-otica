import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

/** Conexão direta (não "pooled") para scripts: aceita várias instruções SQL por vez. */
export async function conectar(): Promise<pg.Client> {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL no .env.local (veja .env.example).");
    process.exit(1);
  }
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  return cliente;
}

export function requerida(nombre: string): string {
  const v = process.env[nombre]?.trim();
  if (!v) {
    console.error(`Falta a variável ${nombre} no .env.local (veja .env.example).`);
    process.exit(1);
  }
  return v;
}
