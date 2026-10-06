import type { Dependencias } from "@/application";
import type { Cliente } from "@/domain/cliente/Cliente";
import type { NuevaNotificacion } from "@/domain/notificacion/Notificacion";
import type { Organizacion } from "@/domain/organizacion/Organizacion";
import type { Pedido } from "@/domain/pedido/Pedido";
import type { CandidatoRenovacion } from "@/domain/renovacion/regla-renovacion";
import type { UsuarioActual } from "@/domain/usuario/Usuario";
import { WaMeNotificador } from "@/adapters/notificador/WaMeNotificador";
import type {
  HerramientaAsistente,
  LecturaReceta,
  PedidoConCliente,
  RegistroPedido,
  UsuarioListado,
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
  },
};

export const ATENDENTE: UsuarioActual = { id: "00000000-0000-4000-8000-0000000000a1", nombre: "Nataly", rol: "atendente" };
export const ADMIN: UsuarioActual = { ...ATENDENTE, id: "00000000-0000-4000-8000-0000000000a2", nombre: "Eddy", rol: "admin" };

let secuencia = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++secuencia).padStart(12, "0")}`;

export function crearFakes(
  opciones: { usuario?: UsuarioActual | null; ahora?: Date; lectura?: LecturaReceta; sinIA?: boolean } = {},
) {
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
    notificador: new WaMeNotificador(),
    reloj: { ahora: () => opciones.ahora ?? new Date("2026-10-05T15:00:00.000Z") },
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
      listar: async () => usuarios.map((u) => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, activo: u.activo, createdAt: u.createdAt })),
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
            return "respuesta";
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
    get org() {
      return org;
    },
  };
}
