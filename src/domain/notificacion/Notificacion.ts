export const TIPOS_NOTIFICACION = ["listo", "renovacion", "cita"] as const;
export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

/** wa_me: a atendente envia pelo link. whatsapp: enviado automaticamente pelo WhatsApp conectado. */
export const CANALES_NOTIFICACION = ["wa_me", "whatsapp"] as const;
export type CanalNotificacion = (typeof CANALES_NOTIFICACION)[number];

export interface NuevaNotificacion {
  clienteId: string;
  pedidoId: string | null;
  tipo: TipoNotificacion;
  canal: CanalNotificacion;
  mensaje: string;
}

export interface Notificacion extends NuevaNotificacion {
  id: string;
  createdAt: string;
}
