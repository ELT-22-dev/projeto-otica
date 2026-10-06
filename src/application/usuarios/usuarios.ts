import { z } from "zod";
import { ErrorDominio } from "@/domain/shared/errores";
import { MIN_CONTRASENA, ROLES, validarCambioUsuario } from "@/domain/usuario/Usuario";
import { requerirAdmin, type Dependencias } from "../dependencias";

type Deps = Pick<Dependencias, "usuarios" | "hasher" | "sesion">;

const esquemaNuevo = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(200)),
  nombre: z.string().trim().min(2).max(120),
  rol: z.enum(ROLES),
  contrasena: z.string().max(200),
});

const esquemaCambio = z.object({
  id: z.uuid(),
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
});

const esquemaContrasena = z.object({ id: z.uuid(), contrasena: z.string().max(200) });

function validarContrasena(c: string) {
  if (c.length < MIN_CONTRASENA) throw new ErrorDominio("contrasena_corta");
}

export function listarUsuarios(deps: Deps) {
  return async () => {
    await requerirAdmin(deps.sesion);
    return deps.usuarios.listar();
  };
}

export function crearUsuario(deps: Deps) {
  return async (entrada: unknown) => {
    await requerirAdmin(deps.sesion);
    const d = esquemaNuevo.parse(entrada);
    validarContrasena(d.contrasena);
    if (await deps.usuarios.existeEmail(d.email)) throw new ErrorDominio("email_en_uso");
    return deps.usuarios.crear({
      email: d.email,
      nombre: d.nombre,
      rol: d.rol,
      passwordHash: await deps.hasher.hash(d.contrasena),
    });
  };
}

export function actualizarUsuario(deps: Deps) {
  return async (entrada: unknown) => {
    const actor = await requerirAdmin(deps.sesion);
    const { id, ...cambios } = esquemaCambio.parse(entrada);
    const [lista, adminsActivos] = await Promise.all([deps.usuarios.listar(), deps.usuarios.contarAdminsActivos()]);
    const objetivo = lista.find((u) => u.id === id);
    if (!objetivo) throw new ErrorDominio("no_encontrado", "usuario");
    validarCambioUsuario({ actorId: actor.id, objetivo, cambios, adminsActivos });
    await deps.usuarios.actualizar(id, cambios);
  };
}

export function restablecerContrasena(deps: Deps) {
  return async (entrada: unknown) => {
    await requerirAdmin(deps.sesion);
    const { id, contrasena } = esquemaContrasena.parse(entrada);
    validarContrasena(contrasena);
    if (!(await deps.usuarios.actualizar(id, { passwordHash: await deps.hasher.hash(contrasena) }))) {
      throw new ErrorDominio("no_encontrado", "usuario");
    }
  };
}
