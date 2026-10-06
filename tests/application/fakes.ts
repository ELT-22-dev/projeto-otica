import type { Dependencias } from "@/application";
import type { Cita } from "@/domain/cita/Cita";
import type { Cliente } from "@/domain/cliente/Cliente";
import type { NuevaNotificacion } from "@/domain/notificacion/Notificacion";
import type { Organizacion } from "@/domain/organizacion/Organizacion";
import type { Pedido } from "@/domain/pedido/Pedido";
import type { CandidatoRenovacion } from "@/domain/renovacion/regla-renovacion";
import type { UsuarioActual } from "@/domain/usuario/Usuario";
import type { ConexionWhatsapp } from "@/domain/whatsapp/whatsapp";
import { NotificadorWhatsapp } from "@/adapters/notificador/NotificadorWhatsapp";
import type {
  HerramientaAsistente,
  LecturaReceta,
  MensajeWhatsapp,
  PedidoConCliente,
  RegistroPedido,
  ServicioWhatsappPort,
  UsuarioListado,
  WhatsappRepository,
} from "@/ports";

export const ORG: Organizacion = {
  nombre: "Óticas Latina",
  telefonoWhatsapp: null,
  idiomaDefault: "es",
  plantillas: {
    listo: {
      es: "Hola {nombre}! 👋 Te escribimos de {optica}. Tus lentes (pedido #{numero}) ya están listos.",
      pt: "Olá {nombre}! Aqui é da {optica}. Seus óculos (pedido #{numero}) já estão prontos.",
    },
    renovacion: {
      es: "Hola {nombre}! Ya pasó casi un año desde tus últimos lentes en {optica}.",
      pt: "Olá {nombre}! Já faz quase um ano desde seus últimos óculos na {optica}.",
    },
    cita: {
      es: "Hola {nombre}! Tu cita en {optica} quedó para el {fecha} a las {hora}.",
      pt: "Olá {nombre}! Seu horário na {optica} ficou para {fecha} às {hora}.",
    },
  },
  bot: { responde: "clientes", info: "Rua Teste 123. Lunes a sábado 9 a 18 h." },
};

export const ATENDENTE: UsuarioActual = {
  id: "00000000-0000-4000-8000-0000000000a1",
  nombre: "Nataly",
  rol: "atendente",
};
export const ADMIN: UsuarioActual = {
  ...ATENDENTE,
  id: "00000000-0000-4000-8000-0000000000a2",
  nombre: "Eddy",
  rol: "admin",
};

let secuencia = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++secuencia).padStart(12, "0")}`;

export function crearFakes(
  opciones: {
    usuario?: UsuarioActual | null;
    ahora?: Date;
    lectura?: LecturaReceta;
    sinIA?: boolean;
    /** WhatsApp conectado por QR e serviço no ar: avisos saem sozinhos. */
    whatsappConectado?: boolean;
    /** O que o assistente responde (padrão: "respuesta"). Pode chamar as ferramentas antes. */
    respuestaIA?: (p: { herramientas: HerramientaAsistente[]; pregunta: string }) => Promise<string>;
  } = {},
) {
  const ahora = () => opciones.ahora ?? new Date("2026-10-05T15:00:00.000Z");
  const clientes = new Map<string, Cliente>();
  const pedidos = new Map<string, Pedido>();
  const notificaciones: NuevaNotificacion[] = [];
  const registros: RegistroPedido[] = [];
  const candidatos: CandidatoRenovacion[] = [];
  const usuarios: (UsuarioListado & { passwordHash: string })[] = [
    { ...ADMIN, email: "admin@x.com", activo: true, createdAt: "2026-01-01T00:00:00.000Z", passwordHash: "h:x" },
    { ...ATENDENTE, email: "nataly@x.com", activo: true, createdAt: "2026-01-01T00:00:00.000Z", passwordHash: "h:x" },
  ];
  const asistente: { herramientas: HerramientaAsistente[]; instrucciones: string; pregunta: string } = {
    herramientas: [],
    instrucciones: "",
    pregunta: "",
  };
  let org = structuredClone(ORG);
  const citas = new Map<string, Cita>();
  const mensajes: MensajeWhatsapp[] = [];
  /** Serviço do WhatsApp falso: `estado` null = desligado. */
  const servicio = {
    estado: (opciones.whatsappConectado
      ? { estado: "conectado", qr: null, numero: "5511900000000", nombre: "Óptica" }
      : null) as ConexionWhatsapp | null,
    acciones: [] as string[],
  };
  const whatsapp: WhatsappRepository = {
    async registrarMensaje(m) {
      const id = uuid();
      mensajes.push({
        ...m,
        idExterno: m.idExterno ?? null,
        id,
        error: null,
        requiereAtencion: false,
        clienteNombre: m.clienteId ? (clientes.get(m.clienteId)?.nombre ?? null) : null,
        createdAt: ahora().toISOString(),
      });
      return id;
    },
    existeIdExterno: async (id) => mensajes.some((m) => m.idExterno === id),
    historial: async (jid, limite) => mensajes.filter((m) => m.jid === jid).slice(-limite),
    recientes: async (limite) => [...mensajes].reverse().slice(0, limite),
    async marcarAtencion(jid, requiere) {
      const entrantes = mensajes.filter((m) => m.jid === jid && m.direccion === "entrante");
      if (requiere) entrantes.at(-1)!.requiereAtencion = true;
      else entrantes.forEach((m) => (m.requiereAtencion = false));
    },
    contarChatsConAtencion: async () => new Set(mensajes.filter((m) => m.requiereAtencion).map((m) => m.jid)).size,
  };

  const servicioWhatsapp: ServicioWhatsappPort = {
    estado: async () => servicio.estado,
    conectar: async () => void servicio.acciones.push("conectar"),
    desconectar: async () => void servicio.acciones.push("desconectar"),
    enviar: (m) =>
      whatsapp.registrarMensaje({
        ...m,
        direccion: "saliente",
        origen: m.origen === "equipo" ? "telefono" : "aviso",
        estado: "pendiente",
        nombre: null,
      }),
  };

  const conCliente = (p: Pedido): PedidoConCliente => {
    const c = clientes.get(p.clienteId)!;
    return { ...p, cliente: { id: c.id, nombre: c.nombre, whatsapp: c.whatsapp, idioma: c.idioma } };
  };

  const deps: Dependencias = {
    clientes: {
      async buscar() {
        return [...clientes.values()];
      },
      async obtenerPorId(id) {
        return clientes.get(id) ?? null;
      },
      async buscarPorWhatsapp(variantes) {
        return [...clientes.values()].filter((c) => variantes.includes(c.whatsapp));
      },
    },
    pedidos: {
      async registrar(r) {
        registros.push(r);
        const clienteId = r.cliente.tipo === "existente" ? r.cliente.id : uuid();
        if (r.cliente.tipo === "nuevo") {
          clientes.set(clienteId, { id: clienteId, ...r.cliente, notas: null, createdAt: new Date().toISOString() });
        }
        const id = uuid();
        const numero = pedidos.size + 1;
        pedidos.set(id, {
          id,
          clienteId,
          numero,
          ...r.pedido,
          status: "en_laboratorio",
          fechaListo: null,
          fechaEntregado: null,
          createdAt: new Date().toISOString(),
        });
        return { pedidoId: id, numero, clienteId };
      },
      async obtenerPorId(id) {
        const p = pedidos.get(id);
        return p ? conCliente(p) : null;
      },
      async listar() {
        return [...pedidos.values()].map(conCliente);
      },
      async listarPorCliente(clienteId) {
        return [...pedidos.values()].filter((p) => p.clienteId === clienteId);
      },
      async contarPorStatus() {
        return { en_laboratorio: 0, listo: 0, entregado: 0, cancelado: 0 };
      },
      async actualizarStatus(id, esperado, cambio) {
        const p = pedidos.get(id);
        if (!p || p.status !== esperado) return false;
        pedidos.set(id, { ...p, ...cambio });
        return true;
      },
    },
    recetas: {
      async listarPorCliente() {
        return [];
      },
      async obtenerPorPedido() {
        return null;
      },
    },
    notificaciones: {
      async registrar(n) {
        notificaciones.push(n);
      },
      async listarPorCliente() {
        return [];
      },
    },
    renovaciones: {
      async listarCandidatos() {
        return candidatos;
      },
      async obtenerCandidato(clienteId) {
        return candidatos.find((c) => c.clienteId === clienteId) ?? null;
      },
    },
    organizacion: {
      async obtenerActual() {
        return org;
      },
      async actualizar(cambios) {
        org = { ...org, ...cambios };
      },
    },
    sesion: {
      async usuarioActual() {
        return opciones.usuario === undefined ? ATENDENTE : opciones.usuario;
      },
    },
    notificador: new NotificadorWhatsapp(servicioWhatsapp),
    reloj: { ahora },
    consultas: {
      listarClientes: async () => [],
      contarClientes: async () => clientes.size,
      recetasRecientes: async () => [],
      avisosRecientes: async () => [],
      listosSinAviso: async () => [],
      ventasPorMes: async () => [],
      ventasPorTipoLente: async () => [],
      saldoCobradoAlEntregar: async () => 0,
      avisosEnviadosDesde: async () => notificaciones.length,
    },
    usuarios: {
      listar: async () =>
        usuarios.map((u) => ({
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          rol: u.rol,
          activo: u.activo,
          createdAt: u.createdAt,
        })),
      existeEmail: async (email) => usuarios.some((u) => u.email === email.toLowerCase()),
      async crear(u) {
        const id = uuid();
        usuarios.push({ ...u, id, activo: true, createdAt: new Date().toISOString() });
        return id;
      },
      async actualizar(id, c) {
        const u = usuarios.find((x) => x.id === id);
        if (!u) return false;
        Object.assign(u, Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)));
        return true;
      },
      contarAdminsActivos: async () => usuarios.filter((u) => u.rol === "admin" && u.activo).length,
    },
    hasher: { hash: async (c) => `h:${c}` },
    citas: {
      async crear(c) {
        const id = uuid();
        citas.set(id, { ...c, id, createdAt: ahora().toISOString() });
        return id;
      },
      obtenerPorId: async (id) => citas.get(id) ?? null,
      listarEntre: async (desde, hasta) =>
        [...citas.values()].filter((c) => c.fecha !== null && c.fecha >= desde && c.fecha <= hasta),
      listarSolicitadas: async () => [...citas.values()].filter((c) => c.estado === "solicitada"),
      async actualizar(id, esperado, cambio) {
        const c = citas.get(id);
        if (!c || c.estado !== esperado) return false;
        citas.set(id, { ...c, ...Object.fromEntries(Object.entries(cambio).filter(([, v]) => v !== undefined)) });
        return true;
      },
    },
    whatsapp,
    servicioWhatsapp,
    lectorReceta: opciones.sinIA
      ? null
      : {
          async leer() {
            return (
              opciones.lectura ?? {
                esReceta: false,
                valores: {},
                fechaReceta: null,
                observaciones: null,
                advertencias: null,
              }
            );
          },
        },
    asistente: opciones.sinIA
      ? null
      : {
          async responder(p) {
            Object.assign(asistente, p);
            return opciones.respuestaIA ? opciones.respuestaIA(p) : "respuesta";
          },
        },
  };

  return {
    deps,
    clientes,
    pedidos,
    notificaciones,
    registros,
    candidatos,
    asistente,
    usuarios,
    citas,
    mensajes,
    servicio,
    get org() {
      return org;
    },
  };
}
