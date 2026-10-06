/**
 * Casos de uso reais + repositórios Postgres reais + migrations reais (PGlite).
 * Só a sessão e o relógio são simulados.
 */
import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { WaMeNotificador } from "@/adapters/notificador/WaMeNotificador";
import { PostgresPedidoRepository } from "@/adapters/postgres/PostgresPedidoRepository";
import {
  PostgresClienteRepository,
  PostgresNotificacionRepository,
  PostgresOrganizacionRepository,
  PostgresRecetaRepository,
  PostgresRenovacionRepository,
  PostgresUsuarioRepository,
} from "@/adapters/postgres/PostgresRepositorios";
import { crearCasosDeUso } from "@/application";
import type { UsuarioActual } from "@/domain/usuario/Usuario";
import { sembrarDemo } from "../../scripts/datos-demo";
import { crearBaseDeDatos, sqlDe } from "./pglite";

const AHORA = new Date("2026-10-05T15:00:00.000Z");
const HOY = "2026-10-05";

let db: PGlite;
let usuario: UsuarioActual;

function casos(u: UsuarioActual | null = usuario) {
  const sql = sqlDe(db);
  return crearCasosDeUso({
    clientes: new PostgresClienteRepository(sql),
    pedidos: new PostgresPedidoRepository(sql),
    recetas: new PostgresRecetaRepository(sql),
    notificaciones: new PostgresNotificacionRepository(sql),
    renovaciones: new PostgresRenovacionRepository(sql),
    organizacion: new PostgresOrganizacionRepository(sql),
    sesion: { usuarioActual: async () => u },
    notificador: new WaMeNotificador(),
    reloj: { ahora: () => AHORA },
    lectorReceta: null,
    asistente: null,
  });
}

beforeEach(async () => {
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
