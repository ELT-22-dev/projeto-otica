import { ErrorDominio } from "./errores";

/** Data sem hora, no formato AAAA-MM-DD. */
export type FechaISO = string;

export const ZONA_HORARIA = "America/Sao_Paulo";

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function esFechaISO(valor: string): boolean {
  const m = PATRON_FECHA.exec(valor);
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDelMes(anio, mes);
}

function partes(fecha: FechaISO): [number, number, number] {
  if (!esFechaISO(fecha)) throw new ErrorDominio("fecha_invalida", fecha);
  const [a, m, d] = fecha.split("-").map(Number);
  return [a!, m!, d!];
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function formatear(anio: number, mes: number, dia: number): FechaISO {
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Data local (na zona da ótica) de um instante. */
export function fechaLocal(instante: Date | string, zona: string = ZONA_HORARIA): FechaISO {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  if (Number.isNaN(fecha.getTime())) throw new ErrorDominio("fecha_invalida", String(instante));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

/** Soma meses mantendo o dia; se o mês de destino for mais curto, usa o último dia dele. */
export function sumarMeses(fecha: FechaISO, meses: number): FechaISO {
  const [anio, mes, dia] = partes(fecha);
  const indice = anio * 12 + (mes - 1) + meses;
  const nuevoAnio = Math.floor(indice / 12);
  const nuevoMes = (indice % 12) + 1;
  return formatear(nuevoAnio, nuevoMes, Math.min(dia, diasDelMes(nuevoAnio, nuevoMes)));
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [anio, mes, dia] = partes(fecha);
  const d = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return formatear(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Meses completos de `desde` até `hasta` (05/01 → 04/02 = 0; 05/01 → 05/02 = 1). */
export function mesesCompletosEntre(desde: FechaISO, hasta: FechaISO): number {
  const [a1, m1, d1] = partes(desde);
  const [a2, m2, d2] = partes(hasta);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1 && sumarMeses(desde, meses) > hasta) meses -= 1;
  return meses;
}

/** Comparação lexicográfica é segura no formato AAAA-MM-DD. */
export function compararFechas(a: FechaISO, b: FechaISO): number {
  partes(a);
  partes(b);
  return a < b ? -1 : a > b ? 1 : 0;
}
