import { primerNombre } from "../cliente/Cliente";
import { ErrorDominio } from "../shared/errores";

export const VARIABLES_PLANTILLA = ["nombre", "optica", "numero"] as const;
export type VariablePlantilla = (typeof VARIABLES_PLANTILLA)[number];

/**
 * Únicos dados que podem entrar numa mensagem. Receita e valores ficam de fora
 * por construção: não há como passá-los para o template.
 */
export interface DatosPlantilla {
  nombreCliente: string;
  optica: string;
  numeroPedido?: string;
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
  };
  return plantilla.replace(PATRON_VARIABLE, (original, nombre: string) =>
    nombre in valores ? valores[nombre as VariablePlantilla] : original,
  );
}
