import { ZONA_HORARIA } from "@/domain/shared/fecha";

const reales = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatearReales(centavos: number): string {
  return reales.format(centavos / 100);
}

/** "2026-10-05" → "05/10/2026", sem passar por Date (evita deslocamento de fuso). */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

const instante = new Intl.DateTimeFormat("pt-BR", {
  timeZone: ZONA_HORARIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatearInstante(iso: string): string {
  return instante.format(new Date(iso));
}

/** Para preencher o campo de valor: 35050 → "350,50". */
export function centavosATexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

const fechaLarga = new Intl.DateTimeFormat("es", {
  timeZone: ZONA_HORARIA,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "lunes, 5 de octubre" */
export function formatearFechaLarga(instante: Date): string {
  return fechaLarga.format(instante);
}
