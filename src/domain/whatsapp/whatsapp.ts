import type { ModoRespuestaIA } from "../organizacion/Organizacion";

export const ESTADOS_WHATSAPP = ["desconectado", "esperando_qr", "conectado"] as const;
export type EstadoWhatsapp = (typeof ESTADOS_WHATSAPP)[number];

/** O que o serviço do WhatsApp informa. `null` em vez disso = serviço desligado ou inacessível. */
export interface ConexionWhatsapp {
  estado: EstadoWhatsapp;
  /** Conteúdo do QR enquanto espera alguém escanear. */
  qr: string | null;
  numero: string | null;
  nombre: string | null;
}

/** Só envia sozinho com o serviço no ar e o celular vinculado; senão o app volta para o wa.me. */
export function envioAutomaticoDisponible(c: ConexionWhatsapp | null): boolean {
  return c?.estado === "conectado";
}

/** Depois que alguém da ótica responde pelo celular, a IA não se mete nessa conversa por um tempo. */
export const PAUSA_TRAS_HUMANO_MS = 12 * 60 * 60 * 1000;
/** Freio contra loops (outro robô respondendo) e contra gastar a IA à toa. */
export const MAX_RESPUESTAS_IA_POR_HORA = 8;
/** Mensagens que chegaram enquanto o serviço estava desligado não recebem resposta atrasada. */
export const ANTIGUEDAD_MAXIMA_RESPUESTA_MS = 10 * 60 * 1000;

export interface SituacionChat {
  modo: ModoRespuestaIA;
  iaDisponible: boolean;
  esCliente: boolean;
  /** Última mensagem enviada pela equipe direto do celular nessa conversa. */
  ultimaRespuestaHumana: string | null;
  respuestasIaUltimaHora: number;
  /** Quando chegou a última mensagem do cliente. */
  ultimoMensajeCliente: string;
}

export type DecisionRespuesta =
  | { responder: true }
  | { responder: false; motivo: "desactivada" | "no_cliente" | "humano_atendiendo" | "limite" | "antiguo" };

export function decidirRespuesta(s: SituacionChat, ahora: Date): DecisionRespuesta {
  const t = ahora.getTime();
  if (s.modo === "nadie" || !s.iaDisponible) return { responder: false, motivo: "desactivada" };
  if (s.modo === "clientes" && !s.esCliente) return { responder: false, motivo: "no_cliente" };
  if (t - Date.parse(s.ultimoMensajeCliente) > ANTIGUEDAD_MAXIMA_RESPUESTA_MS) {
    return { responder: false, motivo: "antiguo" };
  }
  if (s.ultimaRespuestaHumana && t - Date.parse(s.ultimaRespuestaHumana) < PAUSA_TRAS_HUMANO_MS) {
    return { responder: false, motivo: "humano_atendiendo" };
  }
  if (s.respuestasIaUltimaHora >= MAX_RESPUESTAS_IA_POR_HORA) return { responder: false, motivo: "limite" };
  return { responder: true };
}
