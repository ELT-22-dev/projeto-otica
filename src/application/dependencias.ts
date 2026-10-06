import { ErrorDominio } from "@/domain/shared/errores";
import { esAdmin, type UsuarioActual } from "@/domain/usuario/Usuario";
import type {
  ClienteRepository,
  NotificacionRepository,
  NotificadorPort,
  OrganizacionRepository,
  PedidoRepository,
  RecetaRepository,
  Reloj,
  RenovacionRepository,
  SesionPort,
} from "@/ports";

export interface Dependencias {
  clientes: ClienteRepository;
  pedidos: PedidoRepository;
  recetas: RecetaRepository;
  notificaciones: NotificacionRepository;
  renovaciones: RenovacionRepository;
  organizacion: OrganizacionRepository;
  sesion: SesionPort;
  notificador: NotificadorPort;
  reloj: Reloj;
}

export async function requerirUsuario(sesion: SesionPort): Promise<UsuarioActual> {
  const usuario = await sesion.usuarioActual();
  if (!usuario) throw new ErrorDominio("no_autorizado");
  return usuario;
}

export async function requerirAdmin(sesion: SesionPort): Promise<UsuarioActual> {
  const usuario = await requerirUsuario(sesion);
  if (!esAdmin(usuario)) throw new ErrorDominio("no_autorizado", "solo admin");
  return usuario;
}
