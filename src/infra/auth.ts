import "server-only";
import { cookies } from "next/headers";
import { PostgresUsuarioRepository } from "@/adapters/postgres/PostgresRepositorios";
import type { UsuarioActual } from "@/domain/usuario/Usuario";
import type { SesionPort } from "@/ports";
import { sql } from "./db";
import { env } from "./env";
import { HASH_FICTICIO, verificarSenha } from "./password";
import { COOKIE_SESION, DURACION_SESION_SEGUNDOS, firmarToken, verificarToken } from "./token";

export async function iniciarSesion(email: string, password: string): Promise<boolean> {
  const usuario = await new PostgresUsuarioRepository(sql()).obtenerActivoPorEmail(email);
  // Verifica mesmo sem usuário para a resposta levar o mesmo tempo (não revela quais e-mails existem).
  const valida = await verificarSenha(password, usuario?.passwordHash ?? HASH_FICTICIO);
  if (!usuario || !valida) return false;

  const token = await firmarToken(usuario.id, env().SESSION_SECRET);
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
  return true;
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
}

/** Usuário do cookie de sessão, conferido no banco (usuário desativado perde o acesso na hora). */
export class SesionCookie implements SesionPort {
  private cache: Promise<UsuarioActual | null> | null = null;

  usuarioActual(): Promise<UsuarioActual | null> {
    this.cache ??= this.cargar();
    return this.cache;
  }

  private async cargar(): Promise<UsuarioActual | null> {
    const token = (await cookies()).get(COOKIE_SESION)?.value;
    const id = await verificarToken(token, env().SESSION_SECRET);
    if (!id) return null;
    return new PostgresUsuarioRepository(sql()).obtenerActivoPorId(id);
  }
}
