import { avisarRenovacion, generarAvisoCliente, listoYAvisar } from "./avisos/avisos";
import { buscarClientes, obtenerFichaCliente } from "./clientes/clientes";
import type { Dependencias } from "./dependencias";
import { actualizarConfiguracion, obtenerConfiguracion, obtenerContexto } from "./organizacion/organizacion";
import { cambiarStatusPedido, marcarComoEntregado, marcarComoListo } from "./pedidos/cambiarStatus";
import { contarPedidosPorStatus, listarPedidos, obtenerPedido } from "./pedidos/consultas";
import { crearPedido } from "./pedidos/crearPedido";
import { listarRenovaciones } from "./renovaciones/listarRenovaciones";

export function crearCasosDeUso(deps: Dependencias) {
  return {
    crearPedido: crearPedido(deps),
    cambiarStatusPedido: cambiarStatusPedido(deps),
    marcarComoListo: marcarComoListo(deps),
    marcarComoEntregado: marcarComoEntregado(deps),
    listarPedidos: listarPedidos(deps),
    contarPedidosPorStatus: contarPedidosPorStatus(deps),
    obtenerPedido: obtenerPedido(deps),
    generarAvisoCliente: generarAvisoCliente(deps),
    listoYAvisar: listoYAvisar(deps),
    listarRenovaciones: listarRenovaciones(deps),
    avisarRenovacion: avisarRenovacion(deps),
    buscarClientes: buscarClientes(deps),
    obtenerFichaCliente: obtenerFichaCliente(deps),
    obtenerContexto: obtenerContexto(deps),
    obtenerConfiguracion: obtenerConfiguracion(deps),
    actualizarConfiguracion: actualizarConfiguracion(deps),
  };
}

export type CasosDeUso = ReturnType<typeof crearCasosDeUso>;
export type { Dependencias } from "./dependencias";
export type { ClienteParaRenovar } from "./renovaciones/listarRenovaciones";
export type { EntradaConfiguracion, EntradaCrearPedido } from "./esquemas";
export type { ResultadoEnvio, PedidoConCliente } from "@/ports";
