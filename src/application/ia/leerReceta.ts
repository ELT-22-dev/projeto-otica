import { limpiarLecturaReceta } from "@/domain/receta/Receta";
import { ErrorDominio } from "@/domain/shared/errores";
import { esFechaISO } from "@/domain/shared/fecha";
import { requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaImagenReceta } from "../esquemas";

/**
 * Lê a foto de uma receita e devolve os valores para a atendente conferir no formulário.
 * Nada é gravado aqui: a imagem não é armazenada e a receita só é salva junto com o pedido.
 */
export function leerRecetaDeFoto(deps: Pick<Dependencias, "lectorReceta" | "sesion">) {
  return async (entrada: unknown) => {
    await requerirUsuario(deps.sesion);
    if (!deps.lectorReceta) throw new ErrorDominio("ia_no_disponible");

    const r = esquemaImagenReceta.safeParse(entrada);
    if (!r.success) throw new ErrorDominio("imagen_invalida");

    const lectura = await deps.lectorReceta.leer(r.data);
    const valores = limpiarLecturaReceta(lectura.valores);
    const leyoAlgo = Object.values(valores).some((v) => v !== null);
    if (!lectura.esReceta || !leyoAlgo) throw new ErrorDominio("receta_no_legible");

    return {
      ...valores,
      fechaReceta: lectura.fechaReceta && esFechaISO(lectura.fechaReceta) ? lectura.fechaReceta : null,
      observaciones: lectura.observaciones?.trim().slice(0, 500) || null,
      advertencias: lectura.advertencias?.trim().slice(0, 500) || null,
    };
  };
}
