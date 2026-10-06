import { normalizarBusqueda } from "@/domain/cliente/Cliente";
import { ErrorDominio } from "@/domain/shared/errores";
import { requerirAdmin, requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaBuscarClientes, esquemaId } from "../esquemas";

const LIMITE_SUGERENCIAS = 8;

/** Busca para o formulário de pedido: por nome (sem acento) ou por trecho do telefone. */
export function buscarClientes(deps: Pick<Dependencias, "clientes" | "sesion">) {
  return async (entrada: unknown) => {
    await requerirUsuario(deps.sesion);
    const texto = esquemaBuscarClientes.parse(entrada);
    const digitos = texto.replace(/[\s()+-]/g, "");
    if (/^\d{4,}$/.test(digitos)) return deps.clientes.buscar({ telefono: digitos }, LIMITE_SUGERENCIAS);
    const nombre = normalizarBusqueda(texto);
    if (nombre.length < 2) return [];
    return deps.clientes.buscar({ nombre }, LIMITE_SUGERENCIAS);
  };
}

/** Só o administrador: apaga o cliente e todo o histórico dele. Não tem volta. */
export function eliminarCliente(deps: Pick<Dependencias, "clientes" | "sesion">) {
  return async (entrada: unknown): Promise<void> => {
    await requerirAdmin(deps.sesion);
    const id = esquemaId.parse(entrada);
    if (!(await deps.clientes.eliminar(id))) throw new ErrorDominio("no_encontrado", "cliente");
  };
}

export function obtenerFichaCliente(
  deps: Pick<Dependencias, "clientes" | "pedidos" | "recetas" | "notificaciones" | "sesion">,
) {
  return async (entrada: unknown) => {
    await requerirUsuario(deps.sesion);
    const id = esquemaId.parse(entrada);
    const cliente = await deps.clientes.obtenerPorId(id);
    if (!cliente) throw new ErrorDominio("no_encontrado", "cliente");
    const [pedidos, recetas, notificaciones] = await Promise.all([
      deps.pedidos.listarPorCliente(id),
      deps.recetas.listarPorCliente(id),
      deps.notificaciones.listarPorCliente(id),
    ]);
    return { cliente, pedidos, recetas, notificaciones };
  };
}
