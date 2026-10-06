"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { cerrarSesion } from "@/infra/auth";
import { casosDeUso } from "@/infra/container";
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
