import { jwtVerify, SignJWT } from "jose";

/** Sem dependência de next/headers: usado também pelo proxy. */
export const COOKIE_SESION = "sesion";
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * 30;

function clave(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function firmarToken(usuarioId: string, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(clave(secret));
}

/** Devolve o id do usuário ou null se o token for inválido/expirado. */
export async function verificarToken(token: string | undefined, secret: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(secret), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
