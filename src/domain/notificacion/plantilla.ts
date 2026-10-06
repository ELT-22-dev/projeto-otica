import { primerNombre } from "../cliente/Cliente";
import { ErrorDominio } from "../shared/errores";
import { esFechaISO, type FechaISO } from "../shared/fecha";
import type { Idioma } from "../shared/idioma";

export const VARIABLES_PLANTILLA = ["nombre", "optica", "numero", "fecha", "hora"] as const;
export type VariablePlantilla = (typeof VARIABLES_PLANTILLA)[number];

/**
 * Únicos dados que podem entrar numa mensagem. Receita e valores ficam de fora
 * por construção: não há como passá-los para o template.
 */
export interface DatosPlantilla {
  nombreCliente: string;
  optica: string;
  numeroPedido?: string;
  /** Já formatados para o cliente (ver fechaParaMensaje). */
  fecha?: string;
  hora?: string;
}

const PATRON_VARIABLE = /\{(\w+)\}/g;

export function variablesDesconocidas(plantilla: string): string[] {
  const desconocidas = new Set<string>();
  for (const [, nombre] of plantilla.matchAll(PATRON_VARIABLE)) {
    if (!(VARIABLES_PLANTILLA as readonly string[]).includes(nombre!)) desconocidas.add(nombre!);
  }
  return [...desconocidas];
}

export function validarPlantilla(plantilla: string): string {
  const texto = plantilla.trim();
  if (texto === "" || texto.length > 1000) throw new ErrorDominio("plantilla_invalida");
  const desconocidas = variablesDesconocidas(texto);
  if (desconocidas.length > 0) throw new ErrorDominio("plantilla_invalida", desconocidas.join(", "));
  return texto;
}

export function renderizarPlantilla(plantilla: string, datos: DatosPlantilla): string {
  const valores: Record<VariablePlantilla, string> = {
    nombre: primerNombre(datos.nombreCliente),
    optica: datos.optica,
    numero: datos.numeroPedido ?? "",
    fecha: datos.fecha ?? "",
    hora: datos.hora ?? "",
  };
  return plantilla.replace(PATRON_VARIABLE, (original, nombre: string) =>
    nombre in valores ? valores[nombre as VariablePlantilla] : original,
  );
}

/** "2026-10-10" → "sábado 10/10", no idioma do cliente. */
export function fechaParaMensaje(fecha: FechaISO, idioma: Idioma): string {
  if (!esFechaISO(fecha)) throw new ErrorDominio("fecha_invalida", fecha);
  const [a, m, d] = fecha.split("-").map(Number);
  const dia = new Intl.DateTimeFormat(idioma === "pt" ? "pt-BR" : "es", { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a!, m! - 1, d!)),
  );
  return `${dia} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}
