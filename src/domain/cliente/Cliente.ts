import { ErrorDominio } from "../shared/errores";
import type { Idioma } from "../shared/idioma";
import { normalizarWhatsapp, type WhatsappE164 } from "./telefono";

export interface Cliente {
  id: string;
  nombre: string;
  whatsapp: WhatsappE164;
  idioma: Idioma;
  notas: string | null;
  createdAt: string;
}

export interface DatosNuevoCliente {
  nombre: string;
  whatsapp: WhatsappE164;
  idioma: Idioma;
}

export function normalizarNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (limpio.length < 2) throw new ErrorDominio("nombre_invalido");
  return limpio;
}

export function nuevoCliente(datos: { nombre: string; whatsapp: string; idioma: Idioma }): DatosNuevoCliente {
  return {
    nombre: normalizarNombre(datos.nombre),
    whatsapp: normalizarWhatsapp(datos.whatsapp),
    idioma: datos.idioma,
  };
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** Mesma normalização que o banco aplica em clientes.nombre_busqueda (lower + unaccent). */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
