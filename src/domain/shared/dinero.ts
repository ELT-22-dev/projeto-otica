import { ErrorDominio } from "./errores";

/** Valores monetários circulam no domínio como inteiros em centavos. */
export type Centavos = number;

const MAXIMO_CENTAVOS = 99_999_999; // numeric(10,2) no banco

export function aCentavos(reales: number): Centavos {
  if (!Number.isFinite(reales) || reales < 0) throw new ErrorDominio("monto_invalido");
  const centavos = Math.round(reales * 100);
  if (centavos > MAXIMO_CENTAVOS) throw new ErrorDominio("monto_invalido");
  return centavos;
}

export function aReales(centavos: Centavos): number {
  return centavos / 100;
}

/**
 * Interpreta o que a atendente digita: "350", "350,50", "1.200,50", "R$ 80" ou "350.50".
 * Vírgula é sempre o separador decimal; ponto só é decimal quando não há vírgula
 * e é seguido de 1 ou 2 dígitos no fim.
 */
export function parsearMonto(texto: string): Centavos {
  let limpio = texto.replace(/R\$|\s/gi, "");
  if (limpio === "") throw new ErrorDominio("monto_invalido");

  if (limpio.includes(",")) {
    limpio = limpio.replace(/\./g, "").replace(",", ".");
  } else if (!/\.\d{1,2}$/.test(limpio)) {
    limpio = limpio.replace(/\./g, "");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) throw new ErrorDominio("monto_invalido");
  return aCentavos(Number(limpio));
}
