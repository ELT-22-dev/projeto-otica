/**
 * Serviço do WhatsApp: mantém o WhatsApp da ótica vinculado como "dispositivo conectado" (QR).
 *
 *   npm run whatsapp
 *
 * Precisa ficar ligado o tempo todo, por isso não roda na Vercel (Railway, Render, VPS…).
 * O app fala com ele por HTTP, com o token WHATSAPP_TOKEN:
 *   GET  /estado       estado, QR e número conectado
 *   POST /conectar     gera o QR
 *   POST /desconectar  desvincula (some de "Dispositivos vinculados" no celular)
 *   POST /mensajes     envia um aviso
 * O banco só é usado quando algo acontece (mensagem chega ou sai): sem consultas periódicas,
 * o Neon pode dormir e o plano grátis aguenta.
 *
 * Não atende nem recusa ligações: elas continuam tocando no celular normalmente.
 * Não marca mensagens como lidas: a equipe continua vendo tudo no celular.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { config } from "dotenv";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateMessageIDV2,
  isJidBroadcast,
  isJidGroup,
  isJidNewsletter,
  isLidUser,
  isPnUser,
  jidDecode,
  makeCacheableSignalKeyStore,
  normalizeMessageContent,
  type ConnectionState,
  type WAMessage,
  type WAMessageContent,
  type WAMessageKey,
  type WASocket,
} from "baileys";
import pg from "pg";
import pino from "pino";
import { z } from "zod";
import { configIADesdeEnv, crearIA } from "@/adapters/ia/fabrica";
import { PostgresCitaRepository } from "@/adapters/postgres/PostgresCitaRepository";
import { PostgresPedidoRepository } from "@/adapters/postgres/PostgresPedidoRepository";
import { PostgresClienteRepository, PostgresOrganizacionRepository } from "@/adapters/postgres/PostgresRepositorios";
import { PostgresWhatsappRepository } from "@/adapters/postgres/PostgresWhatsappRepository";
import type { Sql } from "@/adapters/postgres/sql";
import { crearCasosDeUsoBot } from "@/application";
import { variantesWhatsapp } from "@/domain/cliente/telefono";
import { ANTIGUEDAD_MAXIMA_RESPUESTA_MS, type ConexionWhatsapp } from "@/domain/whatsapp/whatsapp";
import { borrarAuth, usarAuthPostgres } from "./auth-postgres";

config({ path: ".env.local", quiet: true });

/** Espera depois da última mensagem do cliente: junta "oi" + "tudo bem?" + a pergunta numa resposta só. */
const ESPERA_RESPUESTA_MS = 8_000;
const MAX_INTENTOS_ENVIO = 3;
const REINTENTO_ENVIO_MS = 30_000;

function requerida(nombre: string, minimo = 1): string {
  const v = process.env[nombre]?.trim() ?? "";
  if (v.length < minimo) {
    console.error(`Falta ${nombre}${minimo > 1 ? ` (mínimo ${minimo} caracteres)` : ""}. Veja .env.example.`);
    process.exit(1);
  }
  return v;
}

const URL_BANCO = process.env.DATABASE_URL_UNPOOLED?.trim() || requerida("DATABASE_URL");
const TOKEN = requerida("WHATSAPP_TOKEN", 32);
const PUERTO = Number(process.env.PORT ?? 3200);

const logger = pino({ level: process.env.WHATSAPP_LOG ?? "warn" });
const log = (...a: unknown[]) => console.log(new Date().toISOString(), "[whatsapp]", ...a);

// Conexões ociosas fecham em 10 s: sem conexão aberta, o Neon pode suspender.
const pool = new pg.Pool({ connectionString: URL_BANCO, max: 4, idleTimeoutMillis: 10_000 });
const sql: Sql = {
  query: async <T>(texto: string, params: unknown[] = []) => (await pool.query(texto, params)).rows as T[],
};

const configIA = configIADesdeEnv(process.env);
const ia = configIA ? crearIA(configIA) : null;
const mensajes = new PostgresWhatsappRepository(sql);
const bot = crearCasosDeUsoBot({
  whatsapp: mensajes,
  clientes: new PostgresClienteRepository(sql),
  pedidos: new PostgresPedidoRepository(sql),
  citas: new PostgresCitaRepository(sql),
  organizacion: new PostgresOrganizacionRepository(sql),
  asistente: ia?.asistente ?? null,
  reloj: { ahora: () => new Date() },
});

let sock: WASocket | null = null;
const estado: ConexionWhatsapp = { estado: "desconectado", qr: null, numero: null, nombre: null };
/** Desconexão pedida pela tela: ao fechar, apaga as credenciais em vez de reconectar. */
let desvinculando = false;
let intentosReconexion = 0;
let enviando = false;
let reintentoProgramado: NodeJS.Timeout | null = null;
/** IDs das mensagens que este serviço enviou: o eco delas não é "a equipe respondeu pelo celular". */
const enviadosPorNosotros = new Set<string>();
const respuestasProgramadas = new Map<string, NodeJS.Timeout>();

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mensagens --------------------------------------------------------------------

/** Texto da mensagem; mídia vira um marcador que a IA entende. null = ignorar (reação, figurinha, sistema). */
function textoDe(contenido: WAMessageContent | null | undefined): string | null {
  const m = normalizeMessageContent(contenido);
  if (!m) return null;
  const texto = m.conversation ?? m.extendedTextMessage?.text;
  if (texto?.trim()) return texto.trim();
  if (m.imageMessage) return `[imagen]${m.imageMessage.caption ? ` ${m.imageMessage.caption}` : ""}`;
  if (m.videoMessage) return `[video]${m.videoMessage.caption ? ` ${m.videoMessage.caption}` : ""}`;
  if (m.audioMessage) return "[audio]";
  if (m.documentMessage) return "[documento]";
  if (m.locationMessage) return "[ubicación]";
  if (m.contactMessage || m.contactsArrayMessage) return "[contacto]";
  return null;
}

const PATRON_TELEFONO = /^[1-9]\d{9,14}$/;

/** Número de quem escreve. Com os novos IDs anônimos (LID) do WhatsApp, pede o número ao mapa do Baileys. */
async function telefonoDe(s: WASocket, key: WAMessageKey): Promise<string | null> {
  for (const jid of [key.remoteJid, key.remoteJidAlt]) {
    if (jid && isPnUser(jid)) {
      const user = jidDecode(jid)?.user;
      if (user && PATRON_TELEFONO.test(user)) return user;
    }
  }
  if (key.remoteJid && isLidUser(key.remoteJid)) {
    const pn = await s.signalRepository.lidMapping.getPNForLID(key.remoteJid).catch(() => null);
    const user = pn ? jidDecode(pn)?.user : undefined;
    if (user && PATRON_TELEFONO.test(user)) return user;
  }
  return null;
}

function esChatPrivado(jid: string): boolean {
  return !isJidGroup(jid) && !isJidBroadcast(jid) && !isJidNewsletter(jid);
}

async function procesarMensaje(s: WASocket, msg: WAMessage) {
  const original = msg.key.remoteJid;
  const id = msg.key.id;
  if (!original || !id || !esChatPrivado(original)) return;
  const texto = textoDe(msg.message);
  if (texto === null) return;

  const whatsapp = await telefonoDe(s, msg.key);
  // Mesmo endereço para a conversa venha ela pelo número ou pelo LID.
  const jid = whatsapp ? `${whatsapp}@s.whatsapp.net` : original;

  if (msg.key.fromMe) {
    if (!enviadosPorNosotros.has(id)) await bot.registrarMensajeDelTelefono({ jid, whatsapp, texto, idExterno: id });
    return;
  }

  const nombre = msg.pushName ?? null;
  await bot.registrarMensajeCliente({ jid, whatsapp, nombre, texto, idExterno: id });

  // Mensagens que chegaram enquanto o serviço estava desligado não recebem resposta atrasada.
  const enviadoEn = Number(msg.messageTimestamp ?? 0) * 1000;
  if (enviadoEn && Date.now() - enviadoEn > ANTIGUEDAD_MAXIMA_RESPUESTA_MS) return;
  programarRespuesta({ jid, whatsapp, nombre });
}

function programarRespuesta(chat: { jid: string; whatsapp: string | null; nombre: string | null }) {
  clearTimeout(respuestasProgramadas.get(chat.jid));
  respuestasProgramadas.set(
    chat.jid,
    setTimeout(async () => {
      respuestasProgramadas.delete(chat.jid);
      try {
        const r = await bot.responderConversacion(chat);
        log(r.respondido ? `IA respondió a ${chat.jid}` : `sin respuesta a ${chat.jid}: ${r.motivo}`);
        if (r.respondido) await enviarPendientes();
      } catch (e) {
        log("error al responder", e);
      }
    }, ESPERA_RESPUESTA_MS),
  );
}

// Fila de envio ------------------------------------------------------------------

/** Celulares antigos estão no WhatsApp sem o 9: pergunta ao WhatsApp qual forma existe. */
async function resolverJid(s: WASocket, whatsapp: string): Promise<string | null> {
  for (const numero of variantesWhatsapp(whatsapp)) {
    const [r] = (await s.onWhatsApp(numero)) ?? [];
    if (r?.exists) return r.jid;
  }
  return null;
}

/** Envia o que estiver pendente no banco (avisos do app e respostas da IA), um de cada vez. */
async function enviarPendientes() {
  const s = sock;
  if (enviando || !s || estado.estado !== "conectado") return;
  enviando = true;
  let reintentar = false;
  try {
    const { rows } = await pool.query<{
      id: string;
      jid: string | null;
      whatsapp: string | null;
      texto: string;
      intentos: number;
    }>(
      `select id, jid, whatsapp, texto, intentos from mensajes_whatsapp
        where estado = 'pendiente' and direccion = 'saliente' order by created_at limit 20`,
    );
    for (const m of rows) {
      try {
        const jid = m.jid ?? (m.whatsapp ? await resolverJid(s, m.whatsapp) : null);
        if (!jid) {
          await pool.query(
            "update mensajes_whatsapp set estado = 'error', error = 'Este número no tiene WhatsApp' where id = $1",
            [m.id],
          );
          continue;
        }
        const idMensaje = generateMessageIDV2(s.user?.id);
        enviadosPorNosotros.add(idMensaje);
        await s.sendMessage(jid, { text: m.texto }, { messageId: idMensaje });
        await pool.query(
          `update mensajes_whatsapp set estado = 'enviado', jid = $2, id_externo = $3, enviado_en = now(),
             intentos = intentos + 1, error = null
           where id = $1`,
          [m.id, jid, idMensaje],
        );
        log(`enviado a ${jid}`);
      } catch (e) {
        const intentos = m.intentos + 1;
        reintentar ||= intentos < MAX_INTENTOS_ENVIO;
        await pool.query(
          `update mensajes_whatsapp set intentos = $2, error = $3,
             estado = case when $2 >= ${MAX_INTENTOS_ENVIO} then 'error'::estado_mensaje else estado end
           where id = $1`,
          [m.id, intentos, String(e instanceof Error ? e.message : e).slice(0, 500)],
        );
        log(`fallo al enviar ${m.id} (intento ${intentos})`, e);
      }
      // Ritmo de gente: várias mensagens seguidas, instantâneas, chamam atenção do WhatsApp.
      await esperar(1_500 + Math.random() * 2_000);
    }
    reintentar ||= rows.length === 20;
  } catch (e) {
    reintentar = true;
    log("error en la fila de envío", e);
  } finally {
    enviando = false;
  }
  // Só agenda nova ida ao banco quando há motivo: falha a repetir ou mais mensagens na fila.
  if (reintentar && !reintentoProgramado) {
    reintentoProgramado = setTimeout(() => {
      reintentoProgramado = null;
      void enviarPendientes();
    }, REINTENTO_ENVIO_MS);
  }
}

// Conexão ------------------------------------------------------------------------

async function conectar() {
  if (sock) return;
  const { state, saveCreds } = await usarAuthPostgres(pool);
  const version = await fetchLatestBaileysVersion()
    .then((v) => v.version)
    .catch(() => undefined);

  const s = makeWASocket({
    ...(version ? { version } : {}),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    logger,
    browser: Browsers.ubuntu("Sistema Pedidos"),
    // Se ficasse "online", o celular pararia de receber notificações.
    markOnlineOnConnect: false,
    // Histórico recente só serve para o Baileys montar o mapa número ↔ LID; não é gravado.
    syncFullHistory: false,
    shouldIgnoreJid: (jid) => !esChatPrivado(jid),
    getMessage: async () => undefined,
  });
  sock = s;

  s.ev.on("creds.update", saveCreds);
  s.ev.on("connection.update", (u) => {
    alCambiarConexion(s, u).catch((e) => log("error en connection.update", e));
  });
  s.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) await procesarMensaje(s, m).catch((e) => log("error al procesar mensaje", e));
  });
  // Sem handler de "call": ligações não são atendidas nem recusadas por aqui.
}

async function alCambiarConexion(s: WASocket, u: Partial<ConnectionState>) {
  if (s !== sock) return;
  if (u.qr) {
    Object.assign(estado, { estado: "esperando_qr", qr: u.qr });
    log("QR nuevo: escanéalo en la pantalla Avisos WhatsApp del sistema");
  }
  if (u.connection === "open") {
    intentosReconexion = 0;
    Object.assign(estado, {
      estado: "conectado",
      qr: null,
      numero: jidDecode(s.user?.id)?.user ?? null,
      nombre: s.user?.name ?? null,
    });
    log(`conectado como ${estado.numero}`);
    // O que ficou na fila enquanto estava desconectado.
    void enviarPendientes();
  }
  if (u.connection !== "close") return;

  sock = null;
  const codigo = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
  const vinculado = Boolean(s.authState.creds.me);

  if (codigo === DisconnectReason.loggedOut || desvinculando || !vinculado) {
    // Desconectado pelo celular, pela tela, ou o QR expirou sem ninguém escanear.
    desvinculando = false;
    await borrarAuth(pool);
    Object.assign(estado, { estado: "desconectado", qr: null, numero: null, nombre: null });
    log(`desvinculado (código ${codigo ?? "?"})`);
    return;
  }
  if (codigo === DisconnectReason.restartRequired) {
    // Normal logo depois de escanear o QR.
    await conectar();
    return;
  }
  Object.assign(estado, { estado: "desconectado", qr: null });
  if (codigo === DisconnectReason.connectionReplaced) {
    // Outro serviço abriu a mesma sessão: não brigar com ele.
    log("sesión abierta en otro lugar; este servicio queda en espera");
    return;
  }
  // Queda de rede: o app usa wa.me enquanto reconecta.
  const espera = Math.min(60_000, 2_000 * 2 ** intentosReconexion++);
  log(`conexión cerrada (código ${codigo ?? "?"}); reintento en ${espera / 1000}s`);
  setTimeout(() => conectar().catch((e) => log("error al reconectar", e)), espera);
}

async function desvincular() {
  const s = sock;
  if (!s) {
    await borrarAuth(pool);
    Object.assign(estado, { estado: "desconectado", qr: null, numero: null, nombre: null });
    return;
  }
  desvinculando = true;
  try {
    // Remove o aparelho da lista "Dispositivos vinculados" do celular.
    await s.logout();
  } catch {
    // Ainda no QR (sem vínculo): só fecha.
    s.end(undefined);
  }
}

// HTTP ---------------------------------------------------------------------------

const digestoToken = createHash("sha256").update(TOKEN).digest();

function autorizado(req: IncomingMessage): boolean {
  const recibido = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1] ?? "";
  return timingSafeEqual(createHash("sha256").update(recibido).digest(), digestoToken);
}

async function leerJson(req: IncomingMessage): Promise<unknown> {
  let cuerpo = "";
  for await (const parte of req) {
    cuerpo += parte;
    if (cuerpo.length > 16_000) throw new Error("cuerpo demasiado grande");
  }
  return JSON.parse(cuerpo || "{}");
}

function responder(res: ServerResponse, status: number, datos: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(datos));
}

const EsquemaMensaje = z.object({
  whatsapp: z.string().regex(PATRON_TELEFONO),
  jid: z.string().max(100).nullable(),
  clienteId: z.uuid().nullable(),
  texto: z.string().trim().min(1).max(4000),
});

async function atender(req: IncomingMessage, res: ServerResponse) {
  const ruta = `${req.method} ${new URL(req.url ?? "/", "http://x").pathname}`;
  // Para o "health check" da hospedagem; não revela nada.
  if (ruta === "GET /") return responder(res, 200, { ok: true });
  if (!autorizado(req)) return responder(res, 401, { error: "no autorizado" });

  switch (ruta) {
    case "GET /estado":
      return responder(res, 200, estado);
    case "POST /conectar":
      await conectar();
      return responder(res, 202, estado);
    case "POST /desconectar":
      await desvincular();
      return responder(res, 202, { ok: true });
    case "POST /mensajes": {
      if (estado.estado !== "conectado") return responder(res, 409, { error: "whatsapp no conectado" });
      const m = EsquemaMensaje.safeParse(await leerJson(req));
      if (!m.success) return responder(res, 400, { error: "mensaje inválido" });
      const id = await mensajes.registrarMensaje({
        ...m.data,
        direccion: "saliente",
        origen: "aviso",
        estado: "pendiente",
        nombre: null,
      });
      void enviarPendientes();
      return responder(res, 202, { id });
    }
    default:
      return responder(res, 404, { error: "no encontrado" });
  }
}

const servidor = createServer((req, res) => {
  atender(req, res).catch((e) => {
    log("error en la solicitud", e);
    if (!res.headersSent) responder(res, 500, { error: "error interno" });
  });
});

async function apagar() {
  log("apagando…");
  servidor.close();
  sock?.end(undefined);
  await pool.end().catch(() => {});
  process.exit(0);
}

async function main() {
  log(`iniciando. IA: ${ia ? `${ia.proveedor} (${ia.modelo})` : "desactivada"}`);
  servidor.listen(PUERTO, () => log(`escuchando en el puerto ${PUERTO}`));
  // Já vinculado antes (reinício do serviço): reconecta sem QR.
  if ((await usarAuthPostgres(pool)).registrado) await conectar();
  process.on("SIGINT", apagar);
  process.on("SIGTERM", apagar);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
