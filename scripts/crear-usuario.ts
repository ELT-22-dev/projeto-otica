/**
 * Cria ou atualiza um usuário (também serve para trocar senha).
 *
 *   npm run usuario -- nataly@email.com "Nataly" atendente
 *   npm run usuario -- dono@email.com "Eddy" admin
 *
 * A senha é pedida no terminal (não fica no histórico do shell).
 */
import { createInterface } from "node:readline/promises";
import { hashSenha } from "../src/infra/password";
import { conectar } from "./_db";

async function main() {
  const [email, nombre, rol = "atendente"] = process.argv.slice(2);
  if (!email || !nombre || !["admin", "atendente"].includes(rol)) {
    console.error('Uso: npm run usuario -- <email> "<nome>" <admin|atendente>');
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("Senha (mín. 8 caracteres): ");
  rl.close();
  if (password.length < 8) {
    console.error("Senha muito curta.");
    process.exit(1);
  }

  const db = await conectar();
  try {
    await db.query(
      `insert into usuarios (email, nombre, rol, password_hash) values ($1, $2, $3, $4)
       on conflict (email) do update set nombre = excluded.nombre, rol = excluded.rol,
         password_hash = excluded.password_hash, activo = true`,
      [email.trim().toLowerCase(), nombre, rol, await hashSenha(password)],
    );
    console.log(`✓ Usuário ${email} (${rol}) pronto.`);
  } finally {
    await db.end();
  }
}

main();
