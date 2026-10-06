import "server-only";
import { ErrorDominio } from "@/domain/shared/errores";

/** Páginas só de admin: atendente vê um aviso em vez de erro. */
export async function soloAdmin<T>(promesa: Promise<T>): Promise<T | null> {
  try {
    return await promesa;
  } catch (e) {
    if (e instanceof ErrorDominio && e.codigo === "no_autorizado") return null;
    throw e;
  }
}
