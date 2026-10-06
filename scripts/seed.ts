/**
 * Seed da demo.
 *
 *   npm run seed            → cria tudo; recusa se já houver pedidos
 *   npm run seed -- --reset → apaga clientes/pedidos e recria os dados de demo
 *
 * Credenciais vêm do .env.local (nunca do código). Ver .env.example.
 */
import { normalizarWhatsapp } from "../src/domain/cliente/telefono";
import { fechaLocal } from "../src/domain/shared/fecha";
import { hashSenha } from "../src/infra/password";
import { conectar, requerida } from "./_db";
import { sembrarDemo, type UsuarioSeed } from "./datos-demo";

async function main() {
  const usuarios: UsuarioSeed[] = [
    {
      email: requerida("SEED_ADMIN_EMAIL"),
      nombre: process.env.SEED_ADMIN_NOMBRE || "Administrador",
      rol: "admin",
      passwordHash: await hashSenha(requerida("SEED_ADMIN_PASSWORD")),
    },
  ];
  if (process.env.SEED_ATENDENTE_EMAIL && process.env.SEED_ATENDENTE_PASSWORD) {
    usuarios.push({
      email: process.env.SEED_ATENDENTE_EMAIL,
      nombre: process.env.SEED_ATENDENTE_NOMBRE || "Nataly",
      rol: "atendente",
      passwordHash: await hashSenha(process.env.SEED_ATENDENTE_PASSWORD),
    });
  }
  const demoWhatsapp = process.env.SEED_DEMO_WHATSAPP?.trim() ? normalizarWhatsapp(process.env.SEED_DEMO_WHATSAPP) : null;

  const db = await conectar();
  try {
    const { rows } = await db.query<{ n: string }>("select count(*) as n from pedidos");
    if (Number(rows[0]!.n) > 0 && !process.argv.includes("--reset")) {
      console.error("Já existem pedidos no banco. Para apagar e recriar os dados de demo: npm run seed -- --reset");
      process.exit(1);
    }

    await db.query("begin");
    const hoy = fechaLocal(new Date());
    const r = await sembrarDemo(async (texto, params) => (await db.query(texto, params)).rows, {
      hoy,
      usuarios,
      demoWhatsapp,
    });
    await db.query("commit");

    console.log(`✓ Óticas Latina: ${r.clientes} clientes, ${r.pedidos} pedidos (2 elegíveis para renovação) — hoje: ${hoy}`);
    console.log(`✓ Usuários: ${usuarios.map((u) => `${u.email} (${u.rol})`).join(", ")}`);
    if (!demoWhatsapp) console.log("  Dica: defina SEED_DEMO_WHATSAPP com seu número para a demo abrir uma conversa real.");
  } catch (e) {
    await db.query("rollback").catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
