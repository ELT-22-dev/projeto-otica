import type { WhatsappE164 } from "../cliente/telefono";
import { compararFechas, fechaLocal, sumarMeses, type FechaISO } from "../shared/fecha";
import type { Idioma } from "../shared/idioma";

export const MESES_RENOVACION_MIN = 11;
export const MESES_RENOVACION_MAX = 13;

export interface VentanaRenovacion {
  /** Entregas a partir desta data (inclusive)… */
  desde: FechaISO;
  /** …até esta data (inclusive). */
  hasta: FechaISO;
}

/** Fatos sobre um cliente com pelo menos um pedido entregado. */
export interface CandidatoRenovacion {
  clienteId: string;
  nombre: string;
  whatsapp: WhatsappE164;
  idioma: Idioma;
  /** Último pedido entregado. */
  pedidoId: string;
  pedidoNumero: number;
  pedidoCreadoEn: string;
  ultimaEntrega: string;
  /** Criação mais recente entre os pedidos não cancelados do cliente. */
  ultimoPedidoCreadoEn: string;
  /** Pedidos em en_laboratorio ou listo. */
  pedidosAbiertos: number;
  ultimoAvisoRenovacion: string | null;
}

export function ventanaRenovacion(hoy: FechaISO): VentanaRenovacion {
  return {
    desde: sumarMeses(hoy, -MESES_RENOVACION_MAX),
    hasta: sumarMeses(hoy, -MESES_RENOVACION_MIN),
  };
}

/**
 * Elegível: o último pedido entregado foi entregue entre 11 e 13 meses atrás,
 * não há pedido (não cancelado) criado depois dele e nenhum pedido está em aberto.
 */
export function esElegibleRenovacion(c: CandidatoRenovacion, hoy: FechaISO): boolean {
  const { desde, hasta } = ventanaRenovacion(hoy);
  const entrega = fechaLocal(c.ultimaEntrega);
  const enVentana = compararFechas(entrega, desde) >= 0 && compararFechas(entrega, hasta) <= 0;
  const tienePedidoPosterior = Date.parse(c.ultimoPedidoCreadoEn) > Date.parse(c.pedidoCreadoEn);
  return enVentana && !tienePedidoPosterior && c.pedidosAbiertos === 0;
}

/** Já avisado = existe aviso de renovação depois da última entrega. */
export function yaAvisadoRenovacion(c: Pick<CandidatoRenovacion, "ultimaEntrega" | "ultimoAvisoRenovacion">): boolean {
  return c.ultimoAvisoRenovacion !== null && Date.parse(c.ultimoAvisoRenovacion) > Date.parse(c.ultimaEntrega);
}
