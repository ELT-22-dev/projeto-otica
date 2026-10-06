import { ErrorDominio } from "../shared/errores";
import { esFechaISO, type FechaISO } from "../shared/fecha";

/** Dado de saúde (LGPD). Nunca entra em mensagens nem em URLs. */
export interface DatosReceta {
  odEsfera: number | null;
  odCilindro: number | null;
  odEje: number | null;
  oiEsfera: number | null;
  oiCilindro: number | null;
  oiEje: number | null;
  adicion: number | null;
  dnpOd: number | null;
  dnpOi: number | null;
  observaciones: string | null;
  fechaReceta: FechaISO | null;
}

export interface Receta extends DatosReceta {
  id: string;
  clienteId: string;
  pedidoId: string | null;
  createdAt: string;
}

const RANGOS: Partial<Record<keyof DatosReceta, [number, number]>> = {
  odEsfera: [-30, 30],
  oiEsfera: [-30, 30],
  odCilindro: [-15, 15],
  oiCilindro: [-15, 15],
  odEje: [0, 180],
  oiEje: [0, 180],
  adicion: [0, 5],
  dnpOd: [15, 45],
  dnpOi: [15, 45],
};

export function recetaVacia(d: DatosReceta): boolean {
  return Object.values(d).every((v) => v === null || v === "");
}

export function validarReceta(d: DatosReceta): DatosReceta {
  for (const [campo, [min, max]] of Object.entries(RANGOS) as [keyof DatosReceta, [number, number]][]) {
    const valor = d[campo];
    if (valor === null) continue;
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) {
      throw new ErrorDominio("receta_invalida", campo);
    }
  }
  for (const eje of [d.odEje, d.oiEje]) {
    if (eje !== null && !Number.isInteger(eje)) throw new ErrorDominio("receta_invalida", "eje");
  }
  if (d.fechaReceta !== null && !esFechaISO(d.fechaReceta)) {
    throw new ErrorDominio("receta_invalida", "fecha_receta");
  }
  return { ...d, observaciones: d.observaciones?.trim() || null };
}

const DECIMALES: Partial<Record<keyof DatosReceta, number>> = { odEje: 0, oiEje: 0, dnpOd: 1, dnpOi: 1 };

/**
 * Valores lidos automaticamente (ex.: foto da receita): o que estiver fora de faixa vira null,
 * para a atendente preencher à mão em vez de gravar um número absurdo.
 */
export function limpiarLecturaReceta(
  valores: Partial<Record<keyof DatosReceta, unknown>>,
): Pick<
  DatosReceta,
  "odEsfera" | "odCilindro" | "odEje" | "oiEsfera" | "oiCilindro" | "oiEje" | "adicion" | "dnpOd" | "dnpOi"
> {
  const limpio = {} as Record<string, number | null>;
  for (const [campo, [min, max]] of Object.entries(RANGOS) as [keyof DatosReceta, [number, number]][]) {
    const v = valores[campo];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      limpio[campo] = null;
      continue;
    }
    const factor = 10 ** (DECIMALES[campo] ?? 2);
    const redondeado = Math.round(v * factor) / factor;
    limpio[campo] = redondeado >= min && redondeado <= max ? redondeado : null;
  }
  return limpio as ReturnType<typeof limpiarLecturaReceta>;
}
