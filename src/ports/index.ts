import type { Cliente, DatosNuevoCliente } from "@/domain/cliente/Cliente";
import type { WhatsappE164 } from "@/domain/cliente/telefono";
import type { CanalNotificacion, Notificacion, NuevaNotificacion } from "@/domain/notificacion/Notificacion";
import type { Organizacion, Plantillas } from "@/domain/organizacion/Organizacion";
import type { CambioStatus, DatosNuevoPedido, Pedido } from "@/domain/pedido/Pedido";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import type { DatosReceta, Receta } from "@/domain/receta/Receta";
import type { CandidatoRenovacion, VentanaRenovacion } from "@/domain/renovacion/regla-renovacion";
import type { Idioma } from "@/domain/shared/idioma";
import type { UsuarioActual } from "@/domain/usuario/Usuario";

/** Pedido com os dados do cliente que as telas e os avisos precisam. */
export interface PedidoConCliente extends Pedido {
  cliente: Pick<Cliente, "id" | "nombre" | "whatsapp" | "idioma">;
}

export interface FiltroPedidos {
  status?: StatusPedido;
  /** Texto já normalizado (minúsculo, sem acento). */
  nombre?: string;
  /** Só dígitos. */
  telefono?: string;
  numero?: number;
  limite: number;
}

export interface RegistroPedido {
  cliente: { tipo: "existente"; id: string } | ({ tipo: "nuevo" } & DatosNuevoCliente);
  pedido: DatosNuevoPedido;
  receta: DatosReceta | null;
  creadoPor: string;
}

export interface ClienteRepository {
  buscar(texto: { nombre?: string; telefono?: string }, limite: number): Promise<Cliente[]>;
  obtenerPorId(id: string): Promise<Cliente | null>;
}

export interface PedidoRepository {
  /** Cria cliente (se novo), pedido e receita de forma atômica. */
  registrar(registro: RegistroPedido): Promise<{ pedidoId: string; numero: number; clienteId: string }>;
  obtenerPorId(id: string): Promise<PedidoConCliente | null>;
  listar(filtro: FiltroPedidos): Promise<PedidoConCliente[]>;
  listarPorCliente(clienteId: string): Promise<Pedido[]>;
  contarPorStatus(): Promise<Record<StatusPedido, number>>;
  /**
   * Aplica a mudança só se o pedido ainda estiver em `statusEsperado`
   * (evita que dois toques simultâneos atropelem um ao outro).
   */
  actualizarStatus(id: string, statusEsperado: StatusPedido, cambio: CambioStatus): Promise<boolean>;
}

export interface RecetaRepository {
  listarPorCliente(clienteId: string): Promise<Receta[]>;
  obtenerPorPedido(pedidoId: string): Promise<Receta | null>;
}

export interface NotificacionRepository {
  registrar(n: NuevaNotificacion, creadoPor: string): Promise<void>;
  listarPorCliente(clienteId: string): Promise<Notificacion[]>;
}

export interface RenovacionRepository {
  listarCandidatos(ventana: VentanaRenovacion): Promise<CandidatoRenovacion[]>;
  obtenerCandidato(clienteId: string): Promise<CandidatoRenovacion | null>;
}

export interface CambiosOrganizacion {
  nombre: string;
  telefonoWhatsapp: WhatsappE164 | null;
  idiomaDefault: Idioma;
  plantillas: Plantillas;
}

export interface OrganizacionRepository {
  obtenerActual(): Promise<Organizacion>;
  actualizar(cambios: CambiosOrganizacion): Promise<void>;
}

export interface SesionPort {
  usuarioActual(): Promise<UsuarioActual | null>;
}

export interface MensajeSaliente {
  telefono: WhatsappE164;
  texto: string;
}

/**
 * - `requiere_accion`: o envio depende de uma pessoa (wa.me abre o WhatsApp com o texto pronto).
 * - `enviado`: o adaptador já entregou a mensagem (futuro: Baileys / API oficial).
 */
export type ResultadoEnvio = { tipo: "requiere_accion"; url: string } | { tipo: "enviado"; idExterno: string };

export interface NotificadorPort {
  readonly canal: CanalNotificacion;
  enviar(mensaje: MensajeSaliente): Promise<ResultadoEnvio>;
}

export interface Reloj {
  ahora(): Date;
}
