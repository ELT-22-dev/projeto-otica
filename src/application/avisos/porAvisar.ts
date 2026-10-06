import {
  esElegibleRenovacion,
  ventanaRenovacion,
  yaAvisadoRenovacion,
  type CandidatoRenovacion,
} from "@/domain/renovacion/regla-renovacion";
import { fechaLocal } from "@/domain/shared/fecha";
import type { PedidoConCliente } from "@/ports";
import { requerirUsuario, type Dependencias } from "../dependencias";

export interface PorAvisar {
  /** Óculos prontos cujo cliente ainda não recebeu o aviso. */
  listos: PedidoConCliente[];
  /** Clientes na janela de renovação que ainda não foram lembrados. */
  renovaciones: CandidatoRenovacion[];
  total: number;
}

/**
 * Quem está esperando um aviso agora. É o "sinal" para a atendente:
 * cada item sai da lista assim que o aviso é enviado.
 */
export function obtenerPorAvisar(deps: Pick<Dependencias, "consultas" | "renovaciones" | "sesion" | "reloj">) {
  return async (): Promise<PorAvisar> => {
    await requerirUsuario(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const [listos, candidatos] = await Promise.all([
      deps.consultas.listosSinAviso(),
      deps.renovaciones.listarCandidatos(ventanaRenovacion(hoy)),
    ]);
    const renovaciones = candidatos
      .filter((c) => esElegibleRenovacion(c, hoy) && !yaAvisadoRenovacion(c))
      .sort((a, b) => Date.parse(a.ultimaEntrega) - Date.parse(b.ultimaEntrega));
    return { listos, renovaciones, total: listos.length + renovaciones.length };
  };
}
