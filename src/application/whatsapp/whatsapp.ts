import { ErrorDominio } from "@/domain/shared/errores";
import { esAdmin } from "@/domain/usuario/Usuario";
import { envioAutomaticoDisponible, type EstadoWhatsapp } from "@/domain/whatsapp/whatsapp";
import type { MensajeWhatsapp } from "@/ports";
import { requerirAdmin, requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaJid, esquemaRespuestaManual } from "../esquemas";

type DepsServicio = Pick<Dependencias, "servicioWhatsapp" | "sesion">;

export interface EstadoPanelWhatsapp {
  estado: EstadoWhatsapp;
  /** Texto do QR; só para o administrador (quem escaneia vincula o WhatsApp da ótica). */
  qr: string | null;
  numero: string | null;
  nombre: string | null;
  /** O serviço que mantém o WhatsApp conectado está no ar? */
  servicioEnLinea: boolean;
}

export function obtenerWhatsapp(deps: DepsServicio) {
  return async (): Promise<EstadoPanelWhatsapp> => {
    const usuario = await requerirUsuario(deps.sesion);
    const c = await deps.servicioWhatsapp.estado();
    if (!c) return { estado: "desconectado", qr: null, numero: null, nombre: null, servicioEnLinea: false };
    return {
      ...c,
      qr: c.estado === "esperando_qr" && esAdmin(usuario) ? c.qr : null,
      servicioEnLinea: true,
    };
  };
}

function exigirServicio(deps: DepsServicio, accion: "conectar" | "desconectar") {
  return async (): Promise<void> => {
    await requerirAdmin(deps.sesion);
    if (!(await deps.servicioWhatsapp.estado())) throw new ErrorDominio("whatsapp_servicio_apagado");
    await deps.servicioWhatsapp[accion]();
  };
}

export const conectarWhatsapp = (deps: DepsServicio) => exigirServicio(deps, "conectar");
export const desconectarWhatsapp = (deps: DepsServicio) => exigirServicio(deps, "desconectar");

export interface Conversacion {
  jid: string;
  nombre: string;
  whatsapp: string | null;
  clienteId: string | null;
  requiereAtencion: boolean;
  ultimo: string;
  /** Da mais antiga para a mais nova. */
  mensajes: MensajeWhatsapp[];
}

/** Conversas recentes do WhatsApp conectado: as que pedem atenção primeiro. */
export function listarConversaciones(deps: Pick<Dependencias, "whatsapp" | "sesion">) {
  return async (): Promise<Conversacion[]> => {
    await requerirUsuario(deps.sesion);
    const recientes = await deps.whatsapp.recientes(400);
    const porChat = new Map<string, MensajeWhatsapp[]>();
    for (const m of recientes) {
      const clave = m.jid ?? m.whatsapp!;
      porChat.set(clave, [...(porChat.get(clave) ?? []), m]);
    }
    const conversaciones = [...porChat].slice(0, 30).map(([jid, mensajes]): Conversacion => {
      const conNombre = mensajes.find((m) => m.clienteNombre) ?? mensajes.find((m) => m.nombre);
      return {
        jid,
        nombre: conNombre?.clienteNombre ?? conNombre?.nombre ?? mensajes.find((m) => m.whatsapp)?.whatsapp ?? jid,
        whatsapp: mensajes.find((m) => m.whatsapp)?.whatsapp ?? null,
        clienteId: mensajes.find((m) => m.clienteId)?.clienteId ?? null,
        requiereAtencion: mensajes.some((m) => m.requiereAtencion),
        ultimo: mensajes[0]!.createdAt,
        mensajes: mensajes.slice(0, 8).reverse(),
      };
    });
    return conversaciones.sort((a, b) => Number(b.requiereAtencion) - Number(a.requiereAtencion));
  };
}

export function marcarConversacionAtendida(deps: Pick<Dependencias, "whatsapp" | "sesion">) {
  return async (entrada: unknown): Promise<void> => {
    await requerirUsuario(deps.sesion);
    await deps.whatsapp.marcarAtencion(esquemaJid.parse(entrada), false);
  };
}

/**
 * Alguém da ótica responde pela tela. Sai pelo WhatsApp conectado e conta como resposta humana:
 * a IA fica quieta nessa conversa por um tempo, e o sinal de "necesita respuesta" apaga.
 */
export function responderConversacion(deps: Pick<Dependencias, "whatsapp" | "servicioWhatsapp" | "sesion">) {
  return async (entrada: unknown): Promise<void> => {
    await requerirUsuario(deps.sesion);
    const { jid, texto } = esquemaRespuestaManual.parse(entrada);
    if (!envioAutomaticoDisponible(await deps.servicioWhatsapp.estado())) {
      throw new ErrorDominio("whatsapp_no_conectado");
    }
    const historial = await deps.whatsapp.historial(jid, 20);
    if (historial.length === 0) throw new ErrorDominio("no_encontrado", "conversación");
    await deps.servicioWhatsapp.enviar({
      jid,
      whatsapp: historial.findLast((m) => m.whatsapp)?.whatsapp ?? null,
      clienteId: historial.findLast((m) => m.clienteId)?.clienteId ?? null,
      texto,
      origen: "equipo",
    });
    await deps.whatsapp.marcarAtencion(jid, false);
  };
}

/** Para o menu e para os botões de aviso. */
export function resumenWhatsapp(deps: Pick<Dependencias, "whatsapp" | "servicioWhatsapp">) {
  return async () => {
    const [c, atencion] = await Promise.all([deps.servicioWhatsapp.estado(), deps.whatsapp.contarChatsConAtencion()]);
    return { automatico: envioAutomaticoDisponible(c), atencion };
  };
}
