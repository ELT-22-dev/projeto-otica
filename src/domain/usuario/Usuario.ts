import { ErrorDominio } from "../shared/errores";

export const ROLES = ["admin", "atendente"] as const;
export type Rol = (typeof ROLES)[number];

export interface UsuarioActual {
  id: string;
  nombre: string;
  rol: Rol;
}

export function esAdmin(u: Pick<UsuarioActual, "rol">): boolean {
  return u.rol === "admin";
}

export const MIN_CONTRASENA = 8;

/**
 * Proteções da gestão de usuários: ninguém desativa a si mesmo nem tira o próprio
 * acesso de admin, e a ótica nunca fica sem nenhum admin ativo.
 */
export function validarCambioUsuario(p: {
  actorId: string;
  objetivo: { id: string; rol: Rol; activo: boolean };
  cambios: { rol?: Rol; activo?: boolean };
  adminsActivos: number;
}): void {
  const { actorId, objetivo, cambios, adminsActivos } = p;
  const esUnoMismo = actorId === objetivo.id;
  if (esUnoMismo && cambios.activo === false) throw new ErrorDominio("operacion_no_permitida", "desactivarse");
  if (esUnoMismo && cambios.rol && cambios.rol !== "admin") {
    throw new ErrorDominio("operacion_no_permitida", "quitarse admin");
  }
  const dejaDeSerAdminActivo =
    objetivo.rol === "admin" &&
    objetivo.activo &&
    (cambios.activo === false || (cambios.rol && cambios.rol !== "admin"));
  if (dejaDeSerAdminActivo && adminsActivos <= 1) throw new ErrorDominio("operacion_no_permitida", "ultimo admin");
}
