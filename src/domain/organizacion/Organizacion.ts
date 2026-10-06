import type { WhatsappE164 } from "../cliente/telefono";
import type { TipoNotificacion } from "../notificacion/Notificacion";
import type { Idioma } from "../shared/idioma";

export type Plantillas = Record<TipoNotificacion, Record<Idioma, string>>;

/** A ótica: nome, WhatsApp e templates de mensagem. */
export interface Organizacion {
  nombre: string;
  telefonoWhatsapp: WhatsappE164 | null;
  idiomaDefault: Idioma;
  plantillas: Plantillas;
}

export function plantillaPara(org: Pick<Organizacion, "plantillas">, tipo: TipoNotificacion, idioma: Idioma): string {
  return org.plantillas[tipo][idioma];
}
