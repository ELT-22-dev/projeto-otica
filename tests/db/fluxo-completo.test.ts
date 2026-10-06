/**
 * Casos de uso reais + repositórios Postgres reais + migrations reais (PGlite).
 * Só a sessão e o relógio são simulados.
 */
import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { NotificadorWhatsapp } from "@/adapters/notificador/NotificadorWhatsapp";
import { PostgresCitaRepository } from "@/adapters/postgres/PostgresCitaRepository";
import { PostgresConsultas } from "@/adapters/postgres/PostgresConsultas";
import { PostgresPedidoRepository } from "@/adapters/postgres/PostgresPedidoRepository";
import {
  PostgresClienteRepository,
  PostgresNotificacionRepository,
  PostgresOrganizacionRepository,
  PostgresRecetaRepository,
  PostgresRenovacionRepository,
  PostgresUsuarioRepository,
} from "@/adapters/postgres/PostgresRepositorios";
import { PostgresWhatsappRepository } from "@/adapters/postgres/PostgresWhatsappRepository";
import { crearCasosDeUso, crearCasosDeUsoBot, type Dependencias } from "@/application";
import type { UsuarioActual } from "@/domain/usuario/Usuario";
import { sembrarDemo } from "../../scripts/datos-demo";
import { crearBaseDeDatos, sqlDe } from "./pglite";

const AHORA = new Date("2026-10-05T15:00:00.000Z");
const HOY = "2026-10-05";

let db: PGlite;
let estadoServicio: Awaited<ReturnType<Dependencias["servicioWhatsapp"]["estado"]>> = null;
let usuario: UsuarioActual;

function dependencias(u: UsuarioActual | null = usuario, asistente: Dependencias["asistente"] = null): Dependencias {
  const sql = sqlDe(db);
  const reloj = { ahora: () => AHORA };
  const whatsapp = new PostgresWhatsappRepository(sql);
  // Serviço do WhatsApp simulado: grava na fila do banco como o worker faz.
  const servicio: Dependencias["servicioWhatsapp"] = {
    estado: async () => estadoServicio,
    conectar: async () => {},
    desconectar: async () => {},
    enviar: (m) =>
      whatsapp.registrarMensaje({
        ...m,
        direccion: "saliente",
        origen: m.origen === "equipo" ? "telefono" : "aviso",
        estado: "pendiente",
        nombre: null,
      }),
  };
  return {
    clientes: new PostgresClienteRepository(sql),
    pedidos: new PostgresPedidoRepository(sql),
    recetas: new PostgresRecetaRepository(sql),
    notificaciones: new PostgresNotificacionRepository(sql),
    renovaciones: new PostgresRenovacionRepository(sql),
    organizacion: new PostgresOrganizacionRepository(sql),
    sesion: { usuarioActual: async () => u },
    notificador: new NotificadorWhatsapp(servicio),
    reloj,
    consultas: new PostgresConsultas(sql),
    usuarios: new PostgresUsuarioRepository(sql),
    hasher: { hash: async (c) => `h:${c}` },
    citas: new PostgresCitaRepository(sql),
    whatsapp,
    servicioWhatsapp: servicio,
    lectorReceta: null,
    asistente,
  };
}

function casos(u: UsuarioActual | null = usuario) {
  return crearCasosDeUso(dependencias(u));
}

beforeEach(async () => {
  estadoServicio = null;
  db = await crearBaseDeDatos();
  const q = async <T>(texto: string, params?: unknown[]) => (await db.query<T>(texto, params)).rows;
  await sembrarDemo(q, {
    hoy: HOY,
    usuarios: [
      { email: "Admin@Optica.com", nombre: "Eddy", rol: "admin", passwordHash: "x" },
      { email: "nataly@optica.com", nombre: "Nataly", rol: "atendente", passwordHash: "x" },
    ],
    demoWhatsapp: null,
  });
  const u = await new PostgresUsuarioRepository(sqlDe(db)).obtenerActivoPorEmail("nataly@optica.com");
  usuario = { id: u!.id, nombre: u!.nombre, rol: u!.rol };
}, 60_000);

describe("dados de demo", () => {
  it("contagem por status bate com o seed", async () => {
    expect(await casos().contarPedidosPorStatus()).toEqual({ en_laboratorio: 2, listo: 2, entregado: 6, cancelado: 0 });
  });

  it("renovações mostram exatamente Carlos e Rosa", async () => {
    const lista = await casos().listarRenovaciones();
    expect(lista.map((c) => c.nombre)).toEqual(["Carlos Mamani", "Rosa Gutiérrez"]);
    expect(lista.every((c) => !c.yaAvisado)).toBe(true);
  });

  it("aba En laboratorio vem ordenada pela entrega (atrasado primeiro)", async () => {
    const lista = await casos().listarPedidos({ status: "en_laboratorio" });
    expect(lista.map((p) => p.cliente.nombre)).toEqual(["Diego Flores", "Lucía Vargas"]);
    expect(lista[0]!.fechaEntregaPrevista).toBe("2026-10-04");
  });
});

describe("fluxo da demo", () => {
  it("cadastrar → listo y avisar → entregar", async () => {
    const c = casos();
    const { pedidoId, numero } = await c.crearPedido({
      cliente: { tipo: "nuevo", nombre: "María Quispe", whatsapp: "11 98765-4321", idioma: "es" },
      descripcionArmazon: "Ray-Ban negro",
      valorTotal: "450,50",
      valorAdelanto: "200",
      fechaEntregaPrevista: "2026-10-12",
      receta: { odEsfera: "-1,25", odEje: "90" },
    });
    expect(numero).toBe(11);

    const { pedido, receta } = await c.obtenerPedido(pedidoId);
    expect(pedido).toMatchObject({
      status: "en_laboratorio",
      valorTotal: 45050,
      valorAdelanto: 20000,
      fechaPedido: HOY,
      cliente: { nombre: "María Quispe", whatsapp: "5511987654321", idioma: "es" },
    });
    expect(receta).toMatchObject({ odEsfera: -1.25, odEje: 90, oiEsfera: null });

    const aviso = await c.listoYAvisar(pedidoId);
    expect(aviso.tipo === "requiere_accion" && decodeURIComponent(aviso.url)).toBe(
      "https://wa.me/5511987654321?text=Hola María! 👋 Te escribimos de Óticas Latina. Tus lentes (pedido #0011) ya están listos. Puedes pasar a recogerlos o, si prefieres, te los enviamos por motoboy. ¡Te esperamos!",
    );

    await c.marcarComoEntregado(pedidoId);
    const ficha = await c.obtenerFichaCliente(pedido.cliente.id);
    expect(ficha.pedidos[0]).toMatchObject({ status: "entregado" });
    expect(ficha.notificaciones).toHaveLength(1);
    expect(ficha.recetas).toHaveLength(1);

    const { rows } = await db.query<{ created_by: string }>("select created_by from pedidos where id = $1", [pedidoId]);
    expect(rows[0]!.created_by).toBe(usuario.id);
  });

  it("aviso de renovação aparece como já avisado", async () => {
    const c = casos();
    const [carlos] = await c.listarRenovaciones();
    await c.avisarRenovacion(carlos!.clienteId);
    const depois = await c.listarRenovaciones();
    expect(depois.find((x) => x.clienteId === carlos!.clienteId)?.yaAvisado).toBe(true);
  });

  it("cliente existente reaproveitado", async () => {
    const c = casos();
    const [ana] = await c.buscarClientes("ana tor");
    const { pedidoId } = await c.crearPedido({
      cliente: { tipo: "existente", id: ana!.id },
      descripcionArmazon: "Repuesto",
      valorTotal: "100",
      fechaEntregaPrevista: "2026-10-06",
    });
    expect((await c.obtenerPedido(pedidoId)).pedido.cliente.nombre).toBe("Ana Torres");
    expect(await c.buscarClientes("ana")).toHaveLength(1);
  });
});

describe("busca", () => {
  it.each([
    ["lucia", ["Lucía Vargas"]],
    ["GUTIERREZ", ["Rosa Gutiérrez"]],
    ["#3", ["Rosa Gutiérrez"]],
    ["900000107", ["Miguel Choque"]],
    ["50%_", []],
  ])("%s", async (texto, esperados) => {
    const lista = await casos().listarPedidos({ busqueda: texto });
    expect(lista.map((p) => p.cliente.nombre)).toEqual(esperados);
  });
});

describe("configuração", () => {
  it("admin salva e o próximo aviso usa o template novo", async () => {
    const admin = { ...usuario, rol: "admin" as const };
    await casos(admin).actualizarConfiguracion({
      nombre: "Óticas Latina SP",
      telefonoWhatsapp: "+55 11 3333-4444",
      idiomaDefault: "es",
      plantillaListoEs: "¡{nombre}, pedido #{numero} listo en {optica}!",
      plantillaListoPt: "Olá {nombre}",
      plantillaRenovacionEs: "Hola {nombre}",
      plantillaRenovacionPt: "Olá {nombre}",
      plantillaCitaEs: "Hola {nombre}, {fecha} {hora}",
      plantillaCitaPt: "Olá {nombre}, {fecha} {hora}",
      iaResponde: "clientes",
      infoParaIa: "",
    });
    const [miguel] = await casos().listarPedidos({ busqueda: "miguel" });
    const r = await casos().listoYAvisar(miguel!.id);
    expect(r.tipo === "requiere_accion" && decodeURIComponent(r.url)).toMatch(
      /¡Miguel, pedido #\d{4} listo en Óticas Latina SP!$/,
    );
    expect((await casos(admin).obtenerConfiguracion()).telefonoWhatsapp).toBe("551133334444");
  });

  it("atendente não acessa configuração", async () => {
    await expect(casos().obtenerConfiguracion()).rejects.toThrow("no_autorizado");
  });
});

describe("ferramentas do assistente com dados reais", () => {
  async function ejecutar(nombre: string, entrada: unknown = {}) {
    const { herramientasAsistente } = await import("@/application/ia/asistente");
    const sql = sqlDe(db);
    const h = herramientasAsistente({
      pedidos: new PostgresPedidoRepository(sql),
      renovaciones: new PostgresRenovacionRepository(sql),
      reloj: { ahora: () => AHORA },
    }).find((x) => x.nombre === nombre)!;
    return h.ejecutar(entrada) as Promise<Record<string, unknown> & unknown[]>;
  }

  it("resumen: atrasados e saldo a cobrar dos pedidos abertos", async () => {
    const r = await ejecutar("resumen_pedidos");
    expect(r).toMatchObject({
      pedidos_por_estado: { en_laboratorio: 2, listo: 2, entregado: 6, cancelado: 0 },
      listos_esperando_retiro: 2,
      saldo_pendiente_total_reales: 1560, // 560 + 300 + 480 + 220
    });
    expect((r.atrasados as { cliente: string }[]).map((p) => p.cliente)).toEqual(["Diego Flores"]);
  });

  it("renovações e busca", async () => {
    const renov = (await ejecutar("listar_renovaciones")) as unknown as { cliente: string }[];
    expect(renov.map((c) => c.cliente)).toEqual(["Carlos Mamani", "Rosa Gutiérrez"]);
    const busca = (await ejecutar("buscar_pedidos", { texto: "lucia" })) as unknown as Record<string, unknown>[];
    expect(busca).toHaveLength(1);
  });

  it("nenhuma ferramenta expõe dados de receita", async () => {
    const lucia = (await ejecutar("buscar_pedidos", { texto: "lucia" })) as unknown as Record<string, unknown>[];
    const campos = Object.keys(lucia[0]!).join(",");
    expect(campos).not.toMatch(/esfera|cilindro|eje|adicion|dnp|receta/i);
  });
});

describe("módulos de gestão com dados reais", () => {
  const admin = () => casos({ ...usuario, rol: "admin" });

  it("inicio: atrasados, entregas de hoje, sem aviso, a cobrar e renovações", async () => {
    const p = await casos().obtenerPanel();
    expect(p.atrasados.map((x) => x.cliente.nombre)).toEqual(["Diego Flores"]);
    expect(p.listosSinAviso.map((x) => x.cliente.nombre).sort()).toEqual(["Miguel Choque", "Patrícia Rocha"]);
    expect(p.porCobrar).toBe(156000);
    expect(p.renovacionesPendientes).toBe(2);
    expect(p.clientes).toBe(9);
    // Outubro/2026: Lucía (03/10) é o único pedido criado no mês
    expect(p.ventasMes).toMatchObject({ mes: "2026-10", pedidos: 1, total: 45000 });
  });

  it("aviso enviado tira o pedido da lista de 'sem aviso'", async () => {
    const [miguel] = await casos().listarPedidos({ busqueda: "miguel" });
    await casos().listoYAvisar(miguel!.id);
    const crm = await casos().obtenerCrm();
    expect(crm.listosSinAviso.map((x) => x.cliente.nombre)).toEqual(["Patrícia Rocha"]);
    expect(crm.avisos[0]).toMatchObject({ clienteNombre: "Miguel Choque", tipo: "listo", pedidoNumero: 9 });
    expect(crm.avisosHoy).toBe(1);
  });

  it("laboratório agrupa por urgência", async () => {
    const l = await casos().obtenerLaboratorio();
    expect(l.grupos.atrasados.map((x) => x.cliente.nombre)).toEqual(["Diego Flores"]);
    expect(l.grupos.semana.map((x) => x.cliente.nombre)).toEqual(["Lucía Vargas"]);
    expect(l.total).toBe(2);
  });

  it("finanças e relatórios (só admin)", async () => {
    await expect(casos().obtenerFinanzas()).rejects.toThrow("no_autorizado");
    const fin = await admin().obtenerFinanzas();
    expect(fin.porCobrar).toBe(156000);
    expect(fin.pendientes[0]!.cliente.nombre).toBe("Diego Flores"); // maior saldo: R$ 560
    expect(fin.adelantosMes).toBe(15000);

    const rep = await admin().obtenerReportes();
    expect(rep.meses).toHaveLength(6);
    expect(rep.meses.at(-1)!.mes).toBe("2026-10");
    expect(rep.porTipo.length).toBeGreaterThan(0);
  });

  it("clientes e receitas", async () => {
    const todos = await casos().listarClientes("");
    expect(todos).toHaveLength(9);
    expect(todos.find((c) => c.nombre === "Ana Torres")?.pedidos).toBe(2);
    expect((await casos().listarClientes("gutierrez")).map((c) => c.nombre)).toEqual(["Rosa Gutiérrez"]);
    expect(await casos().listarClientes("900000104")).toHaveLength(1);
    const recetas = await casos().listarRecetas();
    expect(recetas.map((r) => r.clienteNombre).sort()).toEqual(["Carlos Mamani", "Lucía Vargas"]);
  });

  it("usuários no banco: lista, cria e protege o último admin", async () => {
    const a = admin();
    const lista = await a.listarUsuarios();
    expect(lista.map((u) => u.email).sort()).toEqual(["admin@optica.com", "nataly@optica.com"]);
    await a.crearUsuario({ email: "nuevo@optica.com", nombre: "Nuevo", rol: "atendente", contrasena: "segura123" });
    expect(await a.listarUsuarios()).toHaveLength(3);
    const eddy = lista.find((u) => u.rol === "admin")!;
    await expect(a.actualizarUsuario({ id: eddy.id, rol: "atendente" })).rejects.toThrow("operacion_no_permitida");
  });
});

describe("sinal de 'para avisar'", () => {
  it("junta óculos prontos sem aviso e renovações pendentes; cada aviso tira o item da lista", async () => {
    const c = casos();
    const antes = await c.obtenerPorAvisar();
    expect(antes.listos.map((p) => p.cliente.nombre).sort()).toEqual(["Miguel Choque", "Patrícia Rocha"]);
    expect(antes.renovaciones.map((r) => r.nombre)).toEqual(["Carlos Mamani", "Rosa Gutiérrez"]);
    expect(antes.total).toBe(4);

    await c.listoYAvisar(antes.listos.find((p) => p.cliente.nombre === "Miguel Choque")!.id);
    await c.avisarRenovacion(antes.renovaciones[0]!.clienteId);

    const depois = await c.obtenerPorAvisar();
    expect(depois.listos.map((p) => p.cliente.nombre)).toEqual(["Patrícia Rocha"]);
    expect(depois.renovaciones.map((r) => r.nombre)).toEqual(["Rosa Gutiérrez"]);
    expect(depois.total).toBe(2);
  });

  it("pedido marcado como pronto entra na lista até ser avisado", async () => {
    const c = casos();
    const [diego] = await c.listarPedidos({ busqueda: "diego" });
    await c.marcarComoListo(diego!.id);
    expect((await c.obtenerPorAvisar()).listos.map((p) => p.cliente.nombre)).toContain("Diego Flores");
  });
});

describe("agenda e WhatsApp no banco", () => {
  const JID = "5511900000102@s.whatsapp.net";

  it("cita: cria, aparece no dia, remarca e é atendida", async () => {
    const c = casos();
    const [rosa] = await c.buscarClientes("rosa");
    const { id } = await c.crearCita({
      cliente: { tipo: "existente", id: rosa!.id },
      fecha: HOY,
      hora: "16:30",
      motivo: "Examen",
      avisar: false,
    });
    let agenda = await c.obtenerAgenda();
    expect(agenda.citasHoy).toBe(1);
    expect(agenda.dias).toMatchObject([{ fecha: HOY, citas: [{ id, hora: "16:30", nombre: "Rosa Gutiérrez" }] }]);

    const r = await c.confirmarCita({ id, fecha: "2026-10-08", hora: "09:00" });
    expect(r.envio?.tipo).toBe("requiere_accion");
    agenda = await c.obtenerAgenda();
    expect(agenda.dias).toMatchObject([{ fecha: "2026-10-08", citas: [{ id, hora: "09:00" }] }]);
    const ficha = await c.obtenerFichaCliente(rosa!.id);
    expect(ficha?.notificaciones.map((n) => n.tipo)).toContain("cita");

    await c.cambiarEstadoCita({ id, estado: "atendida" });
    await expect(c.cambiarEstadoCita({ id, estado: "cancelada" })).rejects.toThrow("transicion_invalida");
  });

  it("serviço no ar e celular vinculado: aviso vai para o serviço em vez do wa.me", async () => {
    estadoServicio = { estado: "conectado", qr: null, numero: "5511900000000", nombre: null };
    const c = casos();
    const [miguel] = await c.listarPedidos({ busqueda: "miguel" });
    const r = await c.listoYAvisar(miguel!.id);
    expect(r.tipo).toBe("enviado");

    const { rows } = await db.query<{ estado: string; origen: string; whatsapp: string }>(
      "select estado::text as estado, origen::text as origen, whatsapp from mensajes_whatsapp",
    );
    expect(rows).toEqual([{ estado: "pendiente", origen: "aviso", whatsapp: miguel!.cliente.whatsapp }]);
    expect((await casos().obtenerPorAvisar()).listos.map((p) => p.cliente.nombre)).not.toContain("Miguel Choque");
    expect((await casos().resumenWhatsapp()).automatico).toBe(true);

    // Serviço desligou: volta para o wa.me.
    estadoServicio = null;
    const [patricia] = await c.listarPedidos({ busqueda: "patricia" });
    expect((await casos().listoYAvisar(patricia!.id)).tipo).toBe("requiere_accion");
  });

  it("bot: guarda a conversa, cria solicitação de cita e marca para a equipe", async () => {
    const deps = dependencias(usuario, {
      async responder({ herramientas }) {
        await herramientas
          .find((h) => h.nombre === "solicitar_cita")!
          .ejecutar({
            preferencia: "jueves a la tarde",
            motivo: "examen de vista",
          });
        const pedidos = await herramientas.find((h) => h.nombre === "estado_de_mis_pedidos")!.ejecutar({});
        expect(pedidos).toMatchObject({ encontrado: true, clientes: ["Rosa Gutiérrez"] });
        await herramientas.find((h) => h.nombre === "avisar_al_equipo")!.ejecutar({ motivo: "pide precio" });
        return "Listo, el equipo te confirma.";
      },
    });
    const bot = crearCasosDeUsoBot(deps);
    const chat = { jid: JID, whatsapp: "5511900000102", nombre: "Rosa" };
    await bot.registrarMensajeCliente({ ...chat, texto: "quiero un examen el jueves", idExterno: "ABC1" });
    expect(await bot.responderConversacion(chat)).toEqual({ respondido: true, texto: "Listo, el equipo te confirma." });

    const c = casos();
    expect(await c.resumenAgenda()).toEqual({ solicitudes: 1, hoy: 0 });
    const [conversacion] = await c.listarConversaciones();
    expect(conversacion).toMatchObject({ jid: JID, nombre: "Rosa Gutiérrez", requiereAtencion: true });
    expect(conversacion!.mensajes.map((m) => [m.origen, m.estado])).toEqual([
      ["cliente", "recibido"],
      ["ia", "pendiente"],
    ]);
    expect(await deps.whatsapp.existeIdExterno("ABC1")).toBe(true);
    await c.marcarConversacionAtendida(JID);
    expect((await c.resumenWhatsapp()).atencion).toBe(0);

    await c.eliminarConversacion(JID);
    expect(await c.listarConversaciones()).toEqual([]);
    // A solicitação de cita que veio da conversa continua na agenda.
    expect(await c.resumenAgenda()).toEqual({ solicitudes: 1, hoy: 0 });
  });
});

describe("eliminar cliente no banco", () => {
  it("apaga pedidos, receitas, avisos, citas e mensagens; os outros clientes ficam intactos", async () => {
    const admin = casos({ ...usuario, rol: "admin" });
    const [carlos] = await admin.buscarClientes("carlos");
    const id = carlos!.id;
    await admin.avisarRenovacion(id);
    await admin.crearCita({ cliente: { tipo: "existente", id }, fecha: HOY, hora: "17:00", avisar: false });
    await crearCasosDeUsoBot(dependencias()).registrarMensajeCliente({
      jid: `${carlos!.whatsapp}@s.whatsapp.net`,
      whatsapp: carlos!.whatsapp,
      nombre: "Carlos",
      texto: "hola",
      idExterno: "msg-carlos",
    });
    const antes = await db.query<{ n: number }>("select count(*)::int as n from clientes");

    await admin.eliminarCliente(id);

    const resto = await db.query<{ tabla: string; n: number }>(
      `select 'pedidos' tabla, count(*)::int n from pedidos where cliente_id = $1
       union all select 'recetas', count(*)::int from recetas where cliente_id = $1
       union all select 'notificaciones', count(*)::int from notificaciones where cliente_id = $1
       union all select 'citas', count(*)::int from citas where cliente_id = $1
       union all select 'mensajes', count(*)::int from mensajes_whatsapp where whatsapp = $2`,
      [id, carlos!.whatsapp],
    );
    expect(resto.rows.every((r) => r.n === 0)).toBe(true);
    const despues = await db.query<{ n: number }>("select count(*)::int as n from clientes");
    expect(despues.rows[0]!.n).toBe(antes.rows[0]!.n - 1);
    await expect(admin.obtenerFichaCliente(id)).rejects.toThrow("no_encontrado");
  });
});
