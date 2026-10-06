import type { Centavos } from "../shared/dinero";
import { ErrorDominio } from "../shared/errores";
import { compararFechas, esFechaISO, type FechaISO } from "../shared/fecha";
import { asegurarTransicion, type StatusPedido } from "./status-pedido";

export interface Pedido {
  id: string;
  clienteId: string;
  numero: number;
  descripcionArmazon: string;
  tipoLente: string | null;
  valorTotal: Centavos;
  valorAdelanto: Centavos;
  fechaPedido: FechaISO;
  fechaEntregaPrevista: FechaISO;
  status: StatusPedido;
  /** Instantes ISO 8601. */
  fechaListo: string | null;
  fechaEntregado: string | null;
  createdAt: string;
}

export interface DatosNuevoPedido {
  descripcionArmazon: string;
  tipoLente: string | null;
  valorTotal: Centavos;
  valorAdelanto: Centavos;
  fechaPedido: FechaISO;
  fechaEntregaPrevista: FechaISO;
}

export interface CambioStatus {
  status: StatusPedido;
  fechaListo: string | null;
  fechaEntregado: string | null;
}

export function saldoPendiente(p: Pick<Pedido, "valorTotal" | "valorAdelanto">): Centavos {
  return p.valorTotal - p.valorAdelanto;
}

export function estaAtrasado(
  p: Pick<Pedido, "status" | "fechaEntregaPrevista">,
  hoy: FechaISO,
): boolean {
  return p.status === "en_laboratorio" && compararFechas(p.fechaEntregaPrevista, hoy) < 0;
}

export function validarNuevoPedido(datos: DatosNuevoPedido): DatosNuevoPedido {
  const descripcionArmazon = datos.descripcionArmazon.trim();
  if (descripcionArmazon === "") throw new ErrorDominio("descripcion_requerida");
  const tipoLente = datos.tipoLente?.trim() || null;

  if (!Number.isInteger(datos.valorTotal) || datos.valorTotal < 0) {
    throw new ErrorDominio("monto_invalido", "valor_total");
  }
  if (!Number.isInteger(datos.valorAdelanto) || datos.valorAdelanto < 0) {
    throw new ErrorDominio("monto_invalido", "valor_adelanto");
  }
  if (datos.valorAdelanto > datos.valorTotal) throw new ErrorDominio("adelanto_mayor_que_total");

  if (!esFechaISO(datos.fechaPedido) || !esFechaISO(datos.fechaEntregaPrevista)) {
    throw new ErrorDominio("fecha_invalida");
  }
  if (compararFechas(datos.fechaEntregaPrevista, datos.fechaPedido) < 0) {
    throw new ErrorDominio("fecha_invalida", "entrega antes del pedido");
  }

  return { ...datos, descripcionArmazon, tipoLente };
}

/** Calcula o novo estado do pedido, incluindo as datas que acompanham cada status. */
export function cambiarStatus(
  p: Pick<Pedido, "status" | "fechaListo" | "fechaEntregado">,
  hacia: StatusPedido,
  ahora: Date,
): CambioStatus {
  asegurarTransicion(p.status, hacia);
  const instante = ahora.toISOString();

  switch (hacia) {
    case "listo":
      // Ao desfazer uma entrega, o pedido continua pronto desde a data original.
      return {
        status: hacia,
        fechaListo: p.status === "entregado" && p.fechaListo ? p.fechaListo : instante,
        fechaEntregado: null,
      };
    case "entregado":
      return { status: hacia, fechaListo: p.fechaListo ?? instante, fechaEntregado: instante };
    case "en_laboratorio":
      return { status: hacia, fechaListo: null, fechaEntregado: null };
    case "cancelado":
      return { status: hacia, fechaListo: p.fechaListo, fechaEntregado: p.fechaEntregado };
  }
}
