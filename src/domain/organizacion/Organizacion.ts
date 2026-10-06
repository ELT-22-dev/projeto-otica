import type { WhatsappE164 } from "../cliente/telefono";
import type { TipoNotificacion } from "../notificacion/Notificacion";
import type { Idioma } from "../shared/idioma";

export type Plantillas = Record<TipoNotificacion, Record<Idioma, string>>;

/** A quem a IA responde no WhatsApp conectado. */
export const MODOS_RESPUESTA_IA = ["nadie", "clientes", "todos"] as const;
export type ModoRespuestaIA = (typeof MODOS_RESPUESTA_IA)[number];

export interface AjustesBot {
  responde: ModoRespuestaIA;
  /** Endereço, horário, serviços: o que a IA pode contar. Vazio = ela não inventa, passa para a equipe. */
  info: string;
}

/** A ótica: nome, WhatsApp e templates de mensagem. */
export interface Organizacion {
  nombre: string;
  telefonoWhatsapp: WhatsappE164 | null;
  idiomaDefault: Idioma;
  plantillas: Plantillas;
  bot: AjustesBot;
}

export function plantillaPara(org: Pick<Organizacion, "plantillas">, tipo: TipoNotificacion, idioma: Idioma): string {
  return org.plantillas[tipo][idioma];
}
