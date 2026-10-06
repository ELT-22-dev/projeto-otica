import "server-only";
import { notFound } from "next/navigation";
import { ZodError } from "zod";
import { ErrorDominio } from "@/domain/shared/errores";

/** Id inválido ou inexistente vira 404. */
export async function oNotFound<T>(promesa: Promise<T>): Promise<T> {
  try {
    return await promesa;
  } catch (e) {
    if (e instanceof ZodError || (e instanceof ErrorDominio && e.codigo === "no_encontrado")) notFound();
    throw e;
  }
}
