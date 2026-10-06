import type { WhatsappE164 } from "../cliente/telefono";
import { ErrorDominio } from "../shared/errores";
import { compararFechas, esFechaISO, type FechaISO } from "../shared/fecha";

/**
 * solicitada: o cliente pediu pelo WhatsApp e a ótica ainda não marcou dia e hora.
 * confirmada: tem dia e hora. atendida / cancelada: finais.
 */
export const ESTADOS_CITA = ["solicitada", "confirmada", "atendida", "cancelada"] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

export const ORIGENES_CITA = ["sistema", "whatsapp"] as const;
export type OrigenCita = (typeof ORIGENES_CITA)[number];

/** "HH:MM", 24 horas. */
export type Hora = string;

export interface Cita {
  id: string;
  clienteId: string | null;
  nombre: string;
  whatsapp: WhatsappE164 | null;
  jid: string | null;
  fecha: FechaISO | null;
  hora: Hora | null;
  motivo: string | null;
  preferencia: string | null;
  notas: string | null;
  estado: EstadoCita;
  origen: OrigenCita;
  createdAt: string;
}

export type NuevaCita = Omit<Cita, "id" | "createdAt">;

const TRANSICIONES: Record<EstadoCita, readonly EstadoCita[]> = {
  solicitada: ["confirmada", "cancelada"],
  // confirmada → confirmada é reprogramar.
  confirmada: ["confirmada", "atendida", "cancelada"],
  atendida: [],
  cancelada: [],
};

export function puedeCambiarCita(de: EstadoCita, a: EstadoCita): boolean {
  return TRANSICIONES[de].includes(a);
}

export function validarCambioCita(de: EstadoCita, a: EstadoCita): void {
  if (!puedeCambiarCita(de, a)) throw new ErrorDominio("transicion_invalida", `${de} → ${a}`);
}

const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Aceita "9:30", "09:30" e "09:30:00" (como o Postgres devolve). */
export function normalizarHora(hora: string): Hora {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hora.trim());
  const normalizada = m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : "";
  if (!PATRON_HORA.test(normalizada)) throw new ErrorDominio("horario_invalido", hora);
  return normalizada;
}

/** Dia e hora para marcar ou remarcar: nunca num dia que já passou. */
export function validarHorario(fecha: string, hora: string, hoy: FechaISO): { fecha: FechaISO; hora: Hora } {
  if (!esFechaISO(fecha) || compararFechas(fecha, hoy) < 0) throw new ErrorDominio("fecha_invalida", fecha);
  return { fecha, hora: normalizarHora(hora) };
}

/** Por dia e hora; solicitações (sem horário) primeiro, da mais antiga para a mais nova. */
export function ordenarCitas(citas: Cita[]): Cita[] {
  const clave = (c: Cita) => `${c.fecha ?? ""}T${c.hora ?? ""}|${c.createdAt}`;
  return [...citas].sort((a, b) => (clave(a) < clave(b) ? -1 : clave(a) > clave(b) ? 1 : 0));
}

export function agruparPorDia(citas: Cita[]): { fecha: FechaISO; citas: Cita[] }[] {
  const grupos = new Map<FechaISO, Cita[]>();
  for (const c of ordenarCitas(citas)) {
    if (!c.fecha) continue;
    grupos.set(c.fecha, [...(grupos.get(c.fecha) ?? []), c]);
  }
  return [...grupos].map(([fecha, lista]) => ({ fecha, citas: lista }));
}
