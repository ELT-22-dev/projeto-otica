import {
  esElegibleRenovacion,
  ventanaRenovacion,
  yaAvisadoRenovacion,
  type CandidatoRenovacion,
} from "@/domain/renovacion/regla-renovacion";
import { fechaLocal } from "@/domain/shared/fecha";
import { requerirUsuario, type Dependencias } from "../dependencias";

export interface ClienteParaRenovar extends CandidatoRenovacion {
  yaAvisado: boolean;
}

/** Clientes elegíveis, quem está há mais tempo sem óculos novos primeiro. */
export function listarRenovaciones(deps: Pick<Dependencias, "renovaciones" | "sesion" | "reloj">) {
  return async (): Promise<ClienteParaRenovar[]> => {
    await requerirUsuario(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const candidatos = await deps.renovaciones.listarCandidatos(ventanaRenovacion(hoy));
    return candidatos
      .filter((c) => esElegibleRenovacion(c, hoy))
      .map((c) => ({ ...c, yaAvisado: yaAvisadoRenovacion(c) }))
      .sort((a, b) => Date.parse(a.ultimaEntrega) - Date.parse(b.ultimaEntrega));
  };
}
