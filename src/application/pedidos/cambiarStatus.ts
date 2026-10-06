import { cambiarStatus } from "@/domain/pedido/Pedido";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { ErrorDominio } from "@/domain/shared/errores";
import { requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaCambiarStatus } from "../esquemas";

type Deps = Pick<Dependencias, "pedidos" | "sesion" | "reloj">;

export function cambiarStatusPedido(deps: Deps) {
  return async (entrada: unknown) => {
    await requerirUsuario(deps.sesion);
    const { pedidoId, status } = esquemaCambiarStatus.parse(entrada);

    const pedido = await deps.pedidos.obtenerPorId(pedidoId);
    if (!pedido) throw new ErrorDominio("no_encontrado", "pedido");

    const cambio = cambiarStatus(pedido, status, deps.reloj.ahora());
    const aplicado = await deps.pedidos.actualizarStatus(pedido.id, pedido.status, cambio);
    if (!aplicado) throw new ErrorDominio("conflicto");
    return cambio;
  };
}

const atajo = (status: StatusPedido) => (deps: Deps) => (pedidoId: unknown) =>
  cambiarStatusPedido(deps)({ pedidoId, status });

export const marcarComoListo = atajo("listo");
export const marcarComoEntregado = atajo("entregado");
export const volverALaboratorio = atajo("en_laboratorio");
export const cancelarPedido = atajo("cancelado");
