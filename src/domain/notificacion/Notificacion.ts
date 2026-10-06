export const TIPOS_NOTIFICACION = ["listo", "renovacion"] as const;
export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

export const CANALES_NOTIFICACION = ["wa_me"] as const;
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
