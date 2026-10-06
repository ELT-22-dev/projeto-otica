import { ErrorDominio } from "@/domain/shared/errores";
import { esAdmin, type UsuarioActual } from "@/domain/usuario/Usuario";
import type {
  AsistentePort,
  CitaRepository,
  ClienteRepository,
  ConsultasRepository,
  HasherPort,
  LectorRecetaPort,
  NotificacionRepository,
  NotificadorPort,
  OrganizacionRepository,
  PedidoRepository,
  RecetaRepository,
  Reloj,
  RenovacionRepository,
  ServicioWhatsappPort,
  SesionPort,
  UsuarioRepository,
  WhatsappRepository,
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
  consultas: ConsultasRepository;
  usuarios: UsuarioRepository;
  hasher: HasherPort;
  citas: CitaRepository;
  whatsapp: WhatsappRepository;
  servicioWhatsapp: ServicioWhatsappPort;
  /** null quando não há chave de IA configurada: as funções de IA ficam desligadas. */
  lectorReceta: LectorRecetaPort | null;
  asistente: AsistentePort | null;
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
