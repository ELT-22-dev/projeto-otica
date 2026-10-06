import { avisarRenovacion, generarAvisoCliente, listoYAvisar } from "./avisos/avisos";
import { cambiarEstadoCita, confirmarCita, crearCita, obtenerAgenda, resumenAgenda } from "./citas/citas";
import { buscarClientes, eliminarCliente, obtenerFichaCliente } from "./clientes/clientes";
import { obtenerPorAvisar } from "./avisos/porAvisar";
import type { Dependencias } from "./dependencias";
import {
  listarClientes,
  listarRecetas,
  obtenerCrm,
  obtenerFinanzas,
  obtenerLaboratorio,
  obtenerPanel,
  obtenerReportes,
} from "./gestion/gestion";
import { actualizarUsuario, crearUsuario, listarUsuarios, restablecerContrasena } from "./usuarios/usuarios";
import { preguntarAsistente } from "./ia/asistente";
import { leerRecetaDeFoto } from "./ia/leerReceta";
import { actualizarConfiguracion, obtenerConfiguracion, obtenerContexto } from "./organizacion/organizacion";
import { cambiarStatusPedido, marcarComoEntregado, marcarComoListo } from "./pedidos/cambiarStatus";
import { contarPedidosPorStatus, listarPedidos, obtenerPedido } from "./pedidos/consultas";
import { crearPedido } from "./pedidos/crearPedido";
import { listarRenovaciones } from "./renovaciones/listarRenovaciones";
import {
  conectarWhatsapp,
  desconectarWhatsapp,
  listarConversaciones,
  marcarConversacionAtendida,
  obtenerWhatsapp,
  responderConversacion,
  resumenWhatsapp,
} from "./whatsapp/whatsapp";

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
    eliminarCliente: eliminarCliente(deps),
    obtenerContexto: obtenerContexto(deps),
    obtenerConfiguracion: obtenerConfiguracion(deps),
    actualizarConfiguracion: actualizarConfiguracion(deps),
    leerRecetaDeFoto: leerRecetaDeFoto(deps),
    preguntarAsistente: preguntarAsistente(deps),
    obtenerPorAvisar: obtenerPorAvisar(deps),
    obtenerPanel: obtenerPanel(deps),
    listarClientes: listarClientes(deps),
    listarRecetas: listarRecetas(deps),
    obtenerLaboratorio: obtenerLaboratorio(deps),
    obtenerFinanzas: obtenerFinanzas(deps),
    obtenerCrm: obtenerCrm(deps),
    obtenerReportes: obtenerReportes(deps),
    listarUsuarios: listarUsuarios(deps),
    crearUsuario: crearUsuario(deps),
    actualizarUsuario: actualizarUsuario(deps),
    restablecerContrasena: restablecerContrasena(deps),
    crearCita: crearCita(deps),
    confirmarCita: confirmarCita(deps),
    cambiarEstadoCita: cambiarEstadoCita(deps),
    obtenerAgenda: obtenerAgenda(deps),
    resumenAgenda: resumenAgenda(deps),
    obtenerWhatsapp: obtenerWhatsapp(deps),
    conectarWhatsapp: conectarWhatsapp(deps),
    desconectarWhatsapp: desconectarWhatsapp(deps),
    listarConversaciones: listarConversaciones(deps),
    marcarConversacionAtendida: marcarConversacionAtendida(deps),
    responderConversacion: responderConversacion(deps),
    resumenWhatsapp: resumenWhatsapp(deps),
    /** Assistente e respostas no WhatsApp. */
    iaDisponible: deps.asistente !== null,
    /** Leitura de receita por foto: precisa de um modelo com visão. */
    lecturaRecetaDisponible: deps.lectorReceta !== null,
  };
}

export type CasosDeUso = ReturnType<typeof crearCasosDeUso>;
export type { PorAvisar } from "./avisos/porAvisar";
export type { ResultadoCita } from "./citas/citas";
export { crearCasosDeUsoBot, type CasosDeUsoBot, type MensajeRecibido } from "./whatsapp/bot";
export type { Conversacion, EstadoPanelWhatsapp } from "./whatsapp/whatsapp";
export type { Dependencias } from "./dependencias";
export type { ClienteParaRenovar } from "./renovaciones/listarRenovaciones";
export type { EntradaConfiguracion, EntradaCrearCita, EntradaCrearPedido } from "./esquemas";
export type {
  AvisoConCliente,
  ClienteResumen,
  MensajeAsistente,
  MensajeWhatsapp,
  PedidoConCliente,
  RecetaConCliente,
  ResultadoEnvio,
  UsuarioListado,
  VentasMes,
} from "@/ports";
