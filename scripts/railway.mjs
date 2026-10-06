/**
 * Um repositório, dois serviços no Railway. Decide pelo nome do serviço (RAILWAY_SERVICE_NAME,
 * que o Railway informa no build e na execução):
 *   "sistema"          → telas do sistema (next build / next start)
 *   qualquer outro     → serviço do WhatsApp (worker/whatsapp.ts), sem build do Next
 *
 *   node scripts/railway.mjs build | start
 */
import { spawn } from "node:child_process";

const fase = process.argv[2];
const servicio = process.env.SERVICIO || process.env.RAILWAY_SERVICE_NAME || "";
const esSistema = servicio === "sistema";

const comando = {
  build: esSistema ? "npm run build" : null,
  start: esSistema ? "npm start" : "npm run whatsapp",
}[fase];

if (comando === undefined) {
  console.error("Uso: node scripts/railway.mjs build|start");
  process.exit(1);
}
console.log(`[railway] serviço "${servicio}" → ${comando ?? "sem build"}`);
if (comando === null) process.exit(0);

const hijo = spawn(comando, { stdio: "inherit", shell: true });
// Repassa o desligamento (deploy novo) para o processo filho fechar com calma.
for (const senal of ["SIGTERM", "SIGINT"]) process.on(senal, () => hijo.kill(senal));
hijo.on("exit", (codigo, senal) => process.exit(codigo ?? (senal ? 1 : 0)));
