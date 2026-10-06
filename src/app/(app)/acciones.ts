"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { cerrarSesion } from "@/infra/auth";
import { casosDeUso } from "@/infra/container";
import { qrSvg } from "@/lib/qr";
import type { ResultadoEnvio } from "@/application";
import { ejecutar, type ResultadoAccion } from "../_lib/resultado";

function refrescar() {
  revalidatePath("/", "layout");
}

export async function crearPedidoAccion(
  entrada: unknown,
): Promise<ResultadoAccion<{ pedidoId: string; numero: number }>> {
  const r = await ejecutar(async () => {
    const { pedidoId, numero } = await (await casosDeUso()).crearPedido(entrada);
    return { pedidoId, numero };
  });
  if (r.ok) refrescar();
  return r;
}

export async function cambiarStatusAccion(pedidoId: string, status: StatusPedido): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).cambiarStatusPedido({ pedidoId, status });
    return null;
  });
  if (r.ok) refrescar();
  return r;
}

export async function listoYAvisarAccion(pedidoId: string): Promise<ResultadoAccion<ResultadoEnvio>> {
  const r = await ejecutar(async () => (await casosDeUso()).listoYAvisar(pedidoId));
  if (r.ok) refrescar();
  return r;
}

export async function avisarRenovacionAccion(clienteId: string): Promise<ResultadoAccion<ResultadoEnvio>> {
  const r = await ejecutar(async () => (await casosDeUso()).avisarRenovacion(clienteId));
  if (r.ok) refrescar();
  return r;
}

export interface SugerenciaCliente {
  id: string;
  nombre: string;
  whatsapp: string;
  idioma: "es" | "pt";
}

export async function buscarClientesAccion(texto: string): Promise<ResultadoAccion<SugerenciaCliente[]>> {
  return ejecutar(async () => {
    const clientes = await (await casosDeUso()).buscarClientes(texto);
    return clientes.map(({ id, nombre, whatsapp, idioma }) => ({ id, nombre, whatsapp, idioma }));
  });
}

export async function actualizarConfiguracionAccion(entrada: unknown): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).actualizarConfiguracion(entrada);
    return null;
  });
  if (r.ok) refrescar();
  return r;
}

export async function cerrarSesionAccion() {
  await cerrarSesion();
  redirect("/login");
}

export interface RecetaLeida {
  odEsfera: number | null;
  odCilindro: number | null;
  odEje: number | null;
  oiEsfera: number | null;
  oiCilindro: number | null;
  oiEje: number | null;
  adicion: number | null;
  dnpOd: number | null;
  dnpOi: number | null;
  fechaReceta: string | null;
  observaciones: string | null;
  advertencias: string | null;
}

export async function leerRecetaAccion(imagen: unknown): Promise<ResultadoAccion<RecetaLeida>> {
  return ejecutar(async () => (await casosDeUso()).leerRecetaDeFoto(imagen));
}

export async function preguntarAsistenteAccion(entrada: unknown): Promise<ResultadoAccion<string>> {
  return ejecutar(async () => (await casosDeUso()).preguntarAsistente(entrada));
}

export async function crearUsuarioAccion(entrada: unknown): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).crearUsuario(entrada);
    return null;
  });
  if (r.ok) refrescar();
  return r;
}

export async function actualizarUsuarioAccion(entrada: unknown): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).actualizarUsuario(entrada);
    return null;
  });
  if (r.ok) refrescar();
  return r;
}

export async function restablecerContrasenaAccion(entrada: unknown): Promise<ResultadoAccion> {
  return ejecutar(async () => {
    await (await casosDeUso()).restablecerContrasena(entrada);
    return null;
  });
}

// Agenda ----------------------------------------------------------------------

export async function crearCitaAccion(entrada: unknown): Promise<ResultadoAccion<ResultadoEnvio | null>> {
  const r = await ejecutar(async () => (await (await casosDeUso()).crearCita(entrada)).envio);
  if (r.ok) refrescar();
  return r;
}

export async function confirmarCitaAccion(entrada: unknown): Promise<ResultadoAccion<ResultadoEnvio | null>> {
  const r = await ejecutar(async () => (await (await casosDeUso()).confirmarCita(entrada)).envio);
  if (r.ok) refrescar();
  return r;
}

export async function cambiarEstadoCitaAccion(id: string, estado: "atendida" | "cancelada"): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).cambiarEstadoCita({ id, estado });
    return null;
  });
  if (r.ok) refrescar();
  return r;
}

// WhatsApp conectado ----------------------------------------------------------

export interface EstadoWhatsappVista {
  estado: "desconectado" | "esperando_qr" | "conectado";
  /** QR já desenhado (SVG), só para o administrador. */
  qrSvg: string | null;
  numero: string | null;
  servicioEnLinea: boolean;
}

/** Consultado a cada poucos segundos pela tela enquanto espera o QR ou a conexão. */
export async function estadoWhatsappAccion(): Promise<ResultadoAccion<EstadoWhatsappVista>> {
  return ejecutar(async () => {
    const e = await (await casosDeUso()).obtenerWhatsapp();
    return {
      estado: e.estado,
      qrSvg: e.qr ? await qrSvg(e.qr) : null,
      numero: e.numero ? formatearWhatsapp(e.numero) : null,
      servicioEnLinea: e.servicioEnLinea,
    };
  });
}

export async function conectarWhatsappAccion(): Promise<ResultadoAccion> {
  return ejecutar(async () => {
    await (await casosDeUso()).conectarWhatsapp();
    return null;
  });
}

export async function desconectarWhatsappAccion(): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).desconectarWhatsapp();
    return null;
  });
  if (r.ok) refrescar();
  return r;
}

export async function responderConversacionAccion(jid: string, texto: string): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).responderConversacion({ jid, texto });
    return null;
  });
  if (r.ok) refrescar();
  return r;
}

export async function marcarConversacionAtendidaAccion(jid: string): Promise<ResultadoAccion> {
  const r = await ejecutar(async () => {
    await (await casosDeUso()).marcarConversacionAtendida(jid);
    return null;
  });
  if (r.ok) refrescar();
  return r;
}
