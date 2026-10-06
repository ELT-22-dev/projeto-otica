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
