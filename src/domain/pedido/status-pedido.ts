import { ErrorDominio } from "../shared/errores";

export const STATUS_PEDIDO = ["en_laboratorio", "listo", "entregado", "cancelado"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

/**
 * Fluxo normal: en_laboratorio → listo → entregado.
 * Voltar um passo (listo → en_laboratorio, entregado → listo) existe para corrigir toque errado.
 * Cancelado é final.
 */
const TRANSICIONES: Record<StatusPedido, readonly StatusPedido[]> = {
  en_laboratorio: ["listo", "cancelado"],
  listo: ["entregado", "en_laboratorio", "cancelado"],
  entregado: ["listo"],
  cancelado: [],
};

export function esStatusPedido(valor: unknown): valor is StatusPedido {
  return typeof valor === "string" && (STATUS_PEDIDO as readonly string[]).includes(valor);
}

export function transicionesPosibles(desde: StatusPedido): readonly StatusPedido[] {
  return TRANSICIONES[desde];
}

export function puedeTransicionar(desde: StatusPedido, hacia: StatusPedido): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function asegurarTransicion(desde: StatusPedido, hacia: StatusPedido): void {
  if (!puedeTransicionar(desde, hacia)) {
    throw new ErrorDominio("transicion_invalida", `${desde} → ${hacia}`);
  }
}
