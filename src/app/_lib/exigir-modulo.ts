import "server-only";
import { notFound } from "next/navigation";
import { moduloActivo, type Modulo } from "@/lib/modulos";

/** Módulo desligado não existe para o usuário: a página responde 404. */
export function exigirModulo(m: Modulo): void {
  if (!moduloActivo(m)) notFound();
}
