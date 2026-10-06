import { nuevoCliente } from "@/domain/cliente/Cliente";
import { validarNuevoPedido } from "@/domain/pedido/Pedido";
import { recetaVacia, validarReceta } from "@/domain/receta/Receta";
import { parsearMonto } from "@/domain/shared/dinero";
import { ErrorDominio } from "@/domain/shared/errores";
import { fechaLocal } from "@/domain/shared/fecha";
import type { RegistroPedido } from "@/ports";
import { requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaCrearPedido } from "../esquemas";

export function crearPedido(deps: Pick<Dependencias, "pedidos" | "clientes" | "sesion" | "reloj">) {
  return async (entrada: unknown) => {
    const usuario = await requerirUsuario(deps.sesion);
    const datos = esquemaCrearPedido.parse(entrada);

    const pedido = validarNuevoPedido({
      descripcionArmazon: datos.descripcionArmazon,
      tipoLente: datos.tipoLente ?? null,
      valorTotal: parsearMonto(datos.valorTotal),
      valorAdelanto: datos.valorAdelanto ? parsearMonto(datos.valorAdelanto) : 0,
      fechaPedido: fechaLocal(deps.reloj.ahora()),
      fechaEntregaPrevista: datos.fechaEntregaPrevista,
    });

    let cliente: RegistroPedido["cliente"];
    if (datos.cliente.tipo === "existente") {
      if (!(await deps.clientes.obtenerPorId(datos.cliente.id))) throw new ErrorDominio("no_encontrado", "cliente");
      cliente = { tipo: "existente", id: datos.cliente.id };
    } else {
      cliente = { tipo: "nuevo", ...nuevoCliente(datos.cliente) };
    }

    const receta = datos.receta && !recetaVacia(datos.receta) ? validarReceta(datos.receta) : null;

    return deps.pedidos.registrar({ cliente, pedido, receta, creadoPor: usuario.id });
  };
}
