import type { Cita, EstadoCita, Hora, NuevaCita } from "@/domain/cita/Cita";
import type { Cliente, DatosNuevoCliente } from "@/domain/cliente/Cliente";
import type { WhatsappE164 } from "@/domain/cliente/telefono";
import type { Notificacion, NuevaNotificacion } from "@/domain/notificacion/Notificacion";
import type { AjustesBot, Organizacion, Plantillas } from "@/domain/organizacion/Organizacion";
import type { CambioStatus, DatosNuevoPedido, Pedido } from "@/domain/pedido/Pedido";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import type { DatosReceta, Receta } from "@/domain/receta/Receta";
import type { CandidatoRenovacion, VentanaRenovacion } from "@/domain/renovacion/regla-renovacion";
import type { FechaISO } from "@/domain/shared/fecha";
import type { Idioma } from "@/domain/shared/idioma";
import type { Rol, UsuarioActual } from "@/domain/usuario/Usuario";
import type { ConexionWhatsapp } from "@/domain/whatsapp/whatsapp";

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
  /** Clientes com qualquer uma dessas formas do número (ver variantesWhatsapp). */
  buscarPorWhatsapp(variantes: WhatsappE164[]): Promise<Cliente[]>;
  /** Apaga o cliente com pedidos, receitas, avisos, citas e mensagens. false se não existia. */
  eliminar(id: string): Promise<boolean>;
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
  bot: AjustesBot;
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
  clienteId?: string | null;
  /** Conversa do WhatsApp onde responder, quando conhecida (pedido que chegou pelo próprio WhatsApp). */
  jid?: string | null;
}

/**
 * - `requiere_accion`: o envio depende de uma pessoa (wa.me abre o WhatsApp com o texto pronto).
 * - `enviado`: o WhatsApp conectado por QR envia sozinho (a mensagem entrou na fila do serviço).
 */
export type ResultadoEnvio = { tipo: "requiere_accion"; url: string } | { tipo: "enviado"; idExterno: string };

export interface NotificadorPort {
  enviar(mensaje: MensajeSaliente): Promise<ResultadoEnvio>;
}

export interface Reloj {
  ahora(): Date;
}

// IA ------------------------------------------------------------------------

export type TipoImagen = "image/jpeg" | "image/png" | "image/webp";

export interface ImagenReceta {
  tipo: TipoImagen;
  base64: string;
}

/** O que a IA conseguiu ler da foto. Valores podem estar fora de faixa: o domínio limpa. */
export interface LecturaReceta {
  esReceta: boolean;
  valores: Partial<Record<CampoNumericoReceta, number | null>>;
  fechaReceta: string | null;
  observaciones: string | null;
  advertencias: string | null;
}

export type CampoNumericoReceta =
  "odEsfera" | "odCilindro" | "odEje" | "oiEsfera" | "oiCilindro" | "oiEje" | "adicion" | "dnpOd" | "dnpOi";

export interface LectorRecetaPort {
  leer(imagen: ImagenReceta): Promise<LecturaReceta>;
}

/** Ferramenta de consulta que o assistente pode usar. A entrada chega sem validar: `ejecutar` valida. */
export interface HerramientaAsistente {
  nombre: string;
  descripcion: string;
  esquemaEntrada: { type: "object"; [clave: string]: unknown };
  ejecutar(entrada: unknown): Promise<unknown>;
}

export interface MensajeAsistente {
  rol: "usuario" | "asistente";
  texto: string;
}

export interface AsistentePort {
  responder(pedido: {
    instrucciones: string;
    historial: MensajeAsistente[];
    pregunta: string;
    herramientas: HerramientaAsistente[];
  }): Promise<string>;
}

// Consultas de gestão (dashboard, finanças, relatórios, CRM) --------------------

export interface ClienteResumen {
  id: string;
  nombre: string;
  whatsapp: WhatsappE164;
  idioma: Idioma;
  pedidos: number;
  ultimoPedido: string | null;
}

export interface RecetaConCliente extends Receta {
  clienteNombre: string;
}

export interface AvisoConCliente extends Notificacion {
  clienteNombre: string;
  pedidoNumero: number | null;
}

export interface VentasMes {
  /** AAAA-MM */
  mes: string;
  pedidos: number;
  total: number;
  adelantos: number;
}

export interface VentasPorTipoLente {
  tipo: string | null;
  pedidos: number;
  total: number;
}

/** Agregações somente leitura sobre pedidos, avisos e receitas. Valores em centavos. */
export interface ConsultasRepository {
  listarClientes(filtro: { nombre?: string; telefono?: string; limite: number }): Promise<ClienteResumen[]>;
  contarClientes(): Promise<number>;
  recetasRecientes(limite: number): Promise<RecetaConCliente[]>;
  avisosRecientes(limite: number): Promise<AvisoConCliente[]>;
  listosSinAviso(): Promise<PedidoConCliente[]>;
  /** Pedidos não cancelados, agrupados pelo mês da data do pedido, a partir de `desde`. */
  ventasPorMes(desde: FechaISO): Promise<VentasMes[]>;
  ventasPorTipoLente(desde: FechaISO): Promise<VentasPorTipoLente[]>;
  /** Saldo dos pedidos entregues no período (datas locais, inclusive): cobrado na retirada. */
  saldoCobradoAlEntregar(desde: FechaISO, hasta: FechaISO): Promise<number>;
  avisosEnviadosDesde(desde: FechaISO): Promise<number>;
}

// Usuários ------------------------------------------------------------------

export interface UsuarioListado {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
}

export interface UsuarioRepository {
  listar(): Promise<UsuarioListado[]>;
  existeEmail(email: string): Promise<boolean>;
  crear(u: { email: string; nombre: string; rol: Rol; passwordHash: string }): Promise<string>;
  actualizar(id: string, cambios: { rol?: Rol; activo?: boolean; passwordHash?: string }): Promise<boolean>;
  contarAdminsActivos(): Promise<number>;
}

export interface HasherPort {
  hash(contrasena: string): Promise<string>;
}

// Agenda --------------------------------------------------------------------

export interface CambioCita {
  estado: EstadoCita;
  fecha?: FechaISO;
  hora?: Hora;
  notas?: string | null;
}

export interface CitaRepository {
  crear(cita: NuevaCita, creadoPor: string | null): Promise<string>;
  obtenerPorId(id: string): Promise<Cita | null>;
  /** Citas com data no intervalo (inclusive), de qualquer estado. */
  listarEntre(desde: FechaISO, hasta: FechaISO): Promise<Cita[]>;
  listarSolicitadas(): Promise<Cita[]>;
  /** Aplica só se a cita ainda estiver em `estadoEsperado`. */
  actualizar(id: string, estadoEsperado: EstadoCita, cambio: CambioCita): Promise<boolean>;
}

// WhatsApp conectado --------------------------------------------------------

export type DireccionMensaje = "entrante" | "saliente";
export type OrigenMensaje = "cliente" | "aviso" | "ia" | "telefono";
export type EstadoMensaje = "recibido" | "pendiente" | "enviado" | "error";

export interface NuevoMensajeWhatsapp {
  direccion: DireccionMensaje;
  origen: OrigenMensaje;
  estado: EstadoMensaje;
  jid: string | null;
  whatsapp: WhatsappE164 | null;
  clienteId: string | null;
  nombre: string | null;
  texto: string;
  idExterno?: string | null;
}

export interface MensajeWhatsapp extends NuevoMensajeWhatsapp {
  id: string;
  error: string | null;
  requiereAtencion: boolean;
  clienteNombre: string | null;
  createdAt: string;
}

/**
 * O serviço que mantém o WhatsApp da ótica vinculado por QR (worker/whatsapp.ts), acessado por HTTP.
 * Fica fora da Vercel porque precisa de uma conexão aberta o tempo todo.
 */
export interface ServicioWhatsappPort {
  /** null quando o serviço não responde (desligado, sem internet ou não configurado). */
  estado(): Promise<ConexionWhatsapp | null>;
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  /** Entrega a mensagem ao serviço, que envia e grava no histórico. Devolve o id do registro. */
  enviar(m: {
    whatsapp: WhatsappE164 | null;
    jid: string | null;
    clienteId: string | null;
    texto: string;
    /** aviso: automático do sistema · equipo: alguém da ótica respondeu pela tela (a IA dá um tempo). */
    origen?: "aviso" | "equipo";
  }): Promise<string>;
}

/** Histórico das conversas do WhatsApp conectado (e fila de envio do serviço). */
export interface WhatsappRepository {
  registrarMensaje(m: NuevoMensajeWhatsapp): Promise<string>;
  existeIdExterno(idExterno: string): Promise<boolean>;
  /** Últimas mensagens da conversa, da mais antiga para a mais nova. */
  historial(jid: string, limite: number): Promise<MensajeWhatsapp[]>;
  /** Últimas mensagens de todas as conversas, da mais nova para a mais antiga. */
  recientes(limite: number): Promise<MensajeWhatsapp[]>;
  marcarAtencion(jid: string, requiere: boolean): Promise<void>;
  contarChatsConAtencion(): Promise<number>;
}
