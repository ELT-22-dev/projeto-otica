import "server-only";
import { ZodError } from "zod";
import { ErrorDominio, type CodigoErrorDominio } from "@/domain/shared/errores";
import { t } from "@/i18n";

export type ResultadoAccion<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; campo?: string };

/** Campo do formulário onde mostrar cada erro de domínio. */
const CAMPO_POR_ERROR: Partial<Record<CodigoErrorDominio, string>> = {
  telefono_invalido: "whatsapp",
  nombre_invalido: "nombre",
  descripcion_requerida: "descripcionArmazon",
  monto_invalido: "valorTotal",
  adelanto_mayor_que_total: "valorAdelanto",
  fecha_invalida: "fechaEntregaPrevista",
  receta_invalida: "receta",
};

/** Converte exceções em mensagens para a UI. Detalhes técnicos ficam só no log do servidor. */
export async function ejecutar<T>(fn: () => Promise<T>): Promise<ResultadoAccion<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ErrorDominio) {
      return { ok: false, error: t.errores[e.codigo], campo: CAMPO_POR_ERROR[e.codigo] };
    }
    if (e instanceof ZodError) {
      const issue = e.issues[0];
      const campo = issue?.path.filter((p) => typeof p === "string").at(-1);
      const mensaje = issue?.code === "too_small" ? t.validacion.requerido : t.validacion.invalido;
      return { ok: false, error: mensaje, campo };
    }
    console.error(e);
    return { ok: false, error: t.app.errorGenerico };
  }
}
