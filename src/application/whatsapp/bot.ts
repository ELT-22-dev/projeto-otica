import { z } from "zod";
import { variantesWhatsapp, type WhatsappE164 } from "@/domain/cliente/telefono";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { saldoPendiente } from "@/domain/pedido/Pedido";
import { aReales } from "@/domain/shared/dinero";
import { ErrorDominio } from "@/domain/shared/errores";
import { fechaLocal } from "@/domain/shared/fecha";
import { decidirRespuesta, type DecisionRespuesta } from "@/domain/whatsapp/whatsapp";
import type { Cliente } from "@/domain/cliente/Cliente";
import type { MensajeAsistente, MensajeWhatsapp } from "@/ports";
import type { Dependencias } from "../dependencias";
import { herramienta } from "../ia/asistente";

/**
 * Casos de uso do serviço do WhatsApp (worker). Não há usuário logado: quem age é o sistema,
 * por isso ficam fora de crearCasosDeUso e nunca são expostos como server action.
 */
type DepsBot = Pick<
  Dependencias,
  "whatsapp" | "clientes" | "pedidos" | "citas" | "organizacion" | "asistente" | "reloj"
>;

export interface MensajeRecibido {
  jid: string;
  whatsapp: WhatsappE164 | null;
  /** Nome do perfil do WhatsApp. */
  nombre: string | null;
  texto: string;
  idExterno: string;
}

async function clientesDe(deps: Pick<DepsBot, "clientes">, whatsapp: WhatsappE164 | null): Promise<Cliente[]> {
  return whatsapp ? deps.clientes.buscarPorWhatsapp(variantesWhatsapp(whatsapp)) : [];
}

export function registrarMensajeCliente(deps: DepsBot) {
  return async (m: MensajeRecibido): Promise<void> => {
    if (await deps.whatsapp.existeIdExterno(m.idExterno)) return;
    const [cliente] = await clientesDe(deps, m.whatsapp);
    await deps.whatsapp.registrarMensaje({
      direccion: "entrante",
      origen: "cliente",
      estado: "recibido",
      jid: m.jid,
      whatsapp: m.whatsapp,
      clienteId: cliente?.id ?? null,
      nombre: m.nombre?.slice(0, 120) ?? null,
      texto: m.texto.slice(0, 4000),
      idExterno: m.idExterno,
    });
  };
}

/** Alguém da ótica escreveu direto no celular: fica no histórico e a IA dá um tempo nessa conversa. */
export function registrarMensajeDelTelefono(deps: DepsBot) {
  return async (m: Omit<MensajeRecibido, "nombre">): Promise<void> => {
    if (await deps.whatsapp.existeIdExterno(m.idExterno)) return;
    const [cliente] = await clientesDe(deps, m.whatsapp);
    await deps.whatsapp.registrarMensaje({
      direccion: "saliente",
      origen: "telefono",
      estado: "enviado",
      jid: m.jid,
      whatsapp: m.whatsapp,
      clienteId: cliente?.id ?? null,
      nombre: null,
      texto: m.texto.slice(0, 4000),
      idExterno: m.idExterno,
    });
  };
}

/** Histórico em turnos alternados (as APIs de IA esperam usuário/assistente intercalados, começando pelo usuário). */
function aTurnos(mensajes: MensajeWhatsapp[]): MensajeAsistente[] {
  const turnos: MensajeAsistente[] = [];
  for (const m of mensajes) {
    const rol = m.origen === "cliente" ? "usuario" : "asistente";
    const ultimo = turnos.at(-1);
    if (ultimo?.rol === rol) ultimo.texto += `\n${m.texto}`;
    else turnos.push({ rol, texto: m.texto });
  }
  if (turnos[0]?.rol === "asistente") turnos.unshift({ rol: "usuario", texto: "(inicio de la conversación)" });
  return turnos;
}

const UNA_HORA = 60 * 60 * 1000;

export function herramientasBot(
  deps: DepsBot,
  chat: { jid: string; whatsapp: WhatsappE164 | null; nombre: string | null },
) {
  return [
    herramienta(
      "estado_de_mis_pedidos",
      "Pedidos de lentes de la persona que escribe (buscados por su número de WhatsApp): estado, fecha prevista y saldo. No necesita parámetros.",
      z.object({}),
      async () => {
        const clientes = await clientesDe(deps, chat.whatsapp);
        if (clientes.length === 0) return { encontrado: false, motivo: "Este número no está registrado como cliente." };
        const hoy = fechaLocal(deps.reloj.ahora());
        const pedidos = (await Promise.all(clientes.map((c) => deps.pedidos.listarPorCliente(c.id))))
          .flat()
          .filter((p) => p.status !== "cancelado")
          .slice(0, 5);
        return {
          encontrado: true,
          hoy,
          // Mesmo número pode ser de vários membros da família.
          clientes: clientes.map((c) => c.nombre),
          pedidos: pedidos.map((p) => ({
            numero: formatearNumeroPedido(p.numero),
            cliente: clientes.find((c) => c.id === p.clienteId)?.nombre,
            descripcion: p.descripcionArmazon,
            estado: p.status,
            entrega_prevista: p.fechaEntregaPrevista,
            listo_desde: p.fechaListo ? fechaLocal(p.fechaListo) : null,
            entregado_el: p.fechaEntregado ? fechaLocal(p.fechaEntregado) : null,
            saldo_pendiente_reales: aReales(saldoPendiente(p)),
          })),
        };
      },
    ),
    herramienta(
      "solicitar_cita",
      "Registra que la persona quiere agendar (examen de vista, ajuste, retiro, etc.). El equipo de la óptica confirma el día y la hora después. Úsala una sola vez por pedido de cita.",
      z.object({
        preferencia: z
          .string()
          .min(1)
          .max(200)
          .describe("Día y horario que prefiere, con sus palabras (ej: 'sábado por la mañana')"),
        motivo: z.string().min(1).max(200).describe("Para qué es la cita (ej: 'examen de vista')"),
        nombre: z.string().max(120).optional().describe("Nombre de la persona, si lo dijo y no es cliente registrado"),
      }),
      async ({ preferencia, motivo, nombre }) => {
        const solicitudes = await deps.citas.listarSolicitadas();
        if (solicitudes.some((c) => c.jid === chat.jid)) {
          return { registrada: true, nota: "Ya había una solicitud pendiente; el equipo la confirmará." };
        }
        const [cliente] = await clientesDe(deps, chat.whatsapp);
        await deps.citas.crear(
          {
            clienteId: cliente?.id ?? null,
            nombre: (cliente?.nombre ?? nombre?.trim() ?? chat.nombre?.trim()) || "Cliente de WhatsApp",
            whatsapp: chat.whatsapp,
            jid: chat.jid,
            fecha: null,
            hora: null,
            motivo,
            preferencia,
            notas: null,
            estado: "solicitada",
            origen: "whatsapp",
          },
          null,
        );
        return { registrada: true };
      },
    ),
    herramienta(
      "avisar_al_equipo",
      "Pide que una persona de la óptica revise esta conversación: cuando no sabes la respuesta, piden presupuesto, hay un reclamo, mandan audio o foto, o piden hablar con alguien.",
      z.object({ motivo: z.string().min(1).max(200) }),
      async () => {
        await deps.whatsapp.marcarAtencion(chat.jid, true);
        return { avisado: true };
      },
    ),
  ];
}

function instruccionesBot(org: { nombre: string; info: string }, hoy: string, esCliente: boolean): string {
  const diaSemana = new Intl.DateTimeFormat("es", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${hoy}T12:00:00Z`),
  );
  return [
    `Eres el asistente virtual de la óptica "${org.nombre}" en São Paulo y respondes mensajes de WhatsApp de clientes.`,
    `Hoy es ${diaSemana} ${hoy}.`,
    "Responde en el idioma del cliente (normalmente español o portugués), con mensajes cortos (1 a 3 frases), cálidos y claros.",
    "Texto simple de WhatsApp: sin títulos ni tablas. Puedes usar *negrita* con asteriscos simples.",
    "En tu primera respuesta de una conversación, preséntate brevemente como asistente virtual de la óptica.",
    "",
    "Lo que puedes hacer:",
    "- Estado de pedidos: usa estado_de_mis_pedidos. 'listo' significa que puede pasar a retirar. Habla del pedido por su número (#0001).",
    "- Citas: si quiere agendar, pregunta qué día y horario prefiere (si no lo dijo) y usa solicitar_cita.",
    "  Después dile que el equipo le confirmará el horario por aquí. Nunca confirmes tú un día u hora.",
    "- Dudas sobre la óptica: responde solo con la información de abajo.",
    "- Si no sabes algo, piden presupuesto o precios que no están abajo, hay un reclamo, mandan audio/foto",
    "  o piden hablar con una persona: usa avisar_al_equipo y di que alguien del equipo responderá pronto.",
    "",
    "Reglas:",
    "- Nunca inventes datos, precios, horarios ni estados de pedidos.",
    "- No das consejos médicos ni interpretas recetas: para eso, sugiere un examen de vista.",
    "- No pidas ni repitas datos de salud o de la receta.",
    esCliente ? "" : "- Este número no está registrado como cliente: no tiene pedidos que consultar.",
    "",
    "Información de la óptica:",
    org.info.trim() ||
      "(La óptica todavía no cargó dirección, horarios ni precios: para esas preguntas usa avisar_al_equipo.)",
  ]
    .filter((l, i, todas) => l !== "" || todas[i - 1] !== "")
    .join("\n");
}

export type ResultadoRespuesta = { respondido: true; texto: string } | { respondido: false; motivo: string };

/**
 * Chamado pelo worker alguns segundos depois da última mensagem do cliente (junta mensagens seguidas).
 * Se for para responder, a resposta entra na fila de envio.
 */
export function responderConversacion(deps: DepsBot) {
  return async (chat: {
    jid: string;
    whatsapp: WhatsappE164 | null;
    nombre: string | null;
  }): Promise<ResultadoRespuesta> => {
    const historial = await deps.whatsapp.historial(chat.jid, 30);
    const ultimaSalida = historial.findLastIndex((m) => m.direccion === "saliente");
    const sinResponder = historial.slice(ultimaSalida + 1).filter((m) => m.origen === "cliente");
    if (sinResponder.length === 0) return { respondido: false, motivo: "nada_nuevo" };

    const ahora = deps.reloj.ahora();
    const [org, clientes] = await Promise.all([deps.organizacion.obtenerActual(), clientesDe(deps, chat.whatsapp)]);
    const decision: DecisionRespuesta = decidirRespuesta(
      {
        modo: org.bot.responde,
        iaDisponible: deps.asistente !== null,
        esCliente: clientes.length > 0,
        ultimaRespuestaHumana: historial.findLast((m) => m.origen === "telefono")?.createdAt ?? null,
        respuestasIaUltimaHora: historial.filter(
          (m) => m.origen === "ia" && ahora.getTime() - Date.parse(m.createdAt) < UNA_HORA,
        ).length,
        ultimoMensajeCliente: sinResponder.at(-1)!.createdAt,
      },
      ahora,
    );
    if (!decision.responder) return { respondido: false, motivo: decision.motivo };

    let texto: string;
    try {
      texto = (
        await deps.asistente!.responder({
          instrucciones: instruccionesBot(
            { nombre: org.nombre, info: org.bot.info },
            fechaLocal(ahora),
            clientes.length > 0,
          ),
          historial: aTurnos(historial.slice(0, ultimaSalida + 1)),
          pregunta: sinResponder.map((m) => m.texto).join("\n"),
          herramientas: herramientasBot(deps, chat),
        })
      ).trim();
    } catch (e) {
      // IA fora do ar: a equipe vê a conversa marcada e responde pelo celular.
      if (e instanceof ErrorDominio && e.codigo === "ia_no_disponible") {
        await deps.whatsapp.marcarAtencion(chat.jid, true);
        return { respondido: false, motivo: "ia_no_disponible" };
      }
      throw e;
    }
    if (!texto || texto === "…") return { respondido: false, motivo: "sin_texto" };

    await deps.whatsapp.registrarMensaje({
      direccion: "saliente",
      origen: "ia",
      estado: "pendiente",
      jid: chat.jid,
      whatsapp: chat.whatsapp,
      clienteId: clientes[0]?.id ?? null,
      nombre: null,
      texto: texto.slice(0, 4000),
    });
    return { respondido: true, texto };
  };
}

export function crearCasosDeUsoBot(deps: DepsBot) {
  return {
    registrarMensajeCliente: registrarMensajeCliente(deps),
    registrarMensajeDelTelefono: registrarMensajeDelTelefono(deps),
    responderConversacion: responderConversacion(deps),
  };
}
export type CasosDeUsoBot = ReturnType<typeof crearCasosDeUsoBot>;
