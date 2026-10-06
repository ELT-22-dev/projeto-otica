import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarToken } from "@/infra/token";

const RUTAS_PUBLICAS = ["/login"];

/** Barreira rápida (só confere a assinatura do cookie). Papel e usuário ativo são checados nos casos de uso. */
export async function proxy(request: NextRequest) {
  const secret = process.env.SESSION_SECRET ?? "";
  const autenticado = Boolean(await verificarToken(request.cookies.get(COOKIE_SESION)?.value, secret));
  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (!autenticado && !esPublica) return NextResponse.redirect(new URL("/login", request.url));
  if (autenticado && esPublica) return NextResponse.redirect(new URL("/pedidos", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
