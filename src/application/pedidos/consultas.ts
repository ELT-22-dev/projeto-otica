import { normalizarBusqueda } from "@/domain/cliente/Cliente";
import { parsearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { ErrorDominio } from "@/domain/shared/errores";
import type { FiltroPedidos } from "@/ports";
import { requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaId, esquemaListarPedidos } from "../esquemas";

const LIMITE_LISTA = 100;

/**
 * Interpreta a busca: "#12" → número; só dígitos curtos → número ou telefone;
 * dígitos longos → telefone; texto → nome. Com busca, procura em todos os status.
 */
export function interpretarBusqueda(texto: string): Omit<FiltroPedidos, "limite" | "status"> | null {
  const t = texto.trim();
  if (t === "") return null;
  if (t.startsWith("#")) {
    const numero = parsearNumeroPedido(t);
    return numero ? { numero } : { nombre: normalizarBusqueda(t.slice(1)) };
  }
  const digitos = t.replace(/[\s()+-]/g, "");
  if (/^\d+$/.test(digitos)) {
    const numero = parsearNumeroPedido(digitos);
    return digitos.length <= 5 && numero ? { numero, telefono: digitos } : { telefono: digitos };
  }
  return { nombre: normalizarBusqueda(t) };
}

export function listarPedidos(deps: Pick<Dependencias, "pedidos" | "sesion">) {
  return async (entrada: unknown) => {
    await requerirUsuario(deps.sesion);
    const { status, busqueda } = esquemaListarPedidos.parse(entrada);
    const criterio = busqueda ? interpretarBusqueda(busqueda) : null;
    return deps.pedidos.listar(criterio ? { ...criterio, limite: LIMITE_LISTA } : { status, limite: LIMITE_LISTA });
  };
}

export function contarPedidosPorStatus(deps: Pick<Dependencias, "pedidos" | "sesion">) {
  return async () => {
    await requerirUsuario(deps.sesion);
    return deps.pedidos.contarPorStatus();
  };
}

export function obtenerPedido(deps: Pick<Dependencias, "pedidos" | "recetas" | "sesion">) {
  return async (entrada: unknown) => {
    await requerirUsuario(deps.sesion);
    const id = esquemaId.parse(entrada);
    const pedido = await deps.pedidos.obtenerPorId(id);
    if (!pedido) throw new ErrorDominio("no_encontrado", "pedido");
    const receta = await deps.recetas.obtenerPorPedido(id);
    return { pedido, receta };
  };
}
