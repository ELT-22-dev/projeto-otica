import { describe, expect, it } from "vitest";
import { crearCasosDeUso } from "@/application";
import { interpretarBusqueda } from "@/application/pedidos/consultas";
import { ADMIN, crearFakes } from "./fakes";

const PEDIDO_BASE = {
  descripcionArmazon: "Ray-Ban negro",
  valorTotal: "450,00",
  valorAdelanto: "200",
  fechaEntregaPrevista: "2026-10-12",
};

function nuevoPedido(extra: Record<string, unknown> = {}) {
  return {
    cliente: { tipo: "nuevo", nombre: "  María José  Quispe ", whatsapp: "(11) 98765-4321", idioma: "es" },
    ...PEDIDO_BASE,
    ...extra,
  };
}

describe("crearPedido", () => {
  it("normaliza cliente, converte valores e usa hoje em São Paulo", async () => {
    const f = crearFakes({ ahora: new Date("2026-10-06T01:00:00.000Z") }); // 22h do dia 05 em SP
    const casos = crearCasosDeUso(f.deps);
    await casos.crearPedido(nuevoPedido());

    const r = f.registros[0]!;
    expect(r.cliente).toEqual({ tipo: "nuevo", nombre: "María José Quispe", whatsapp: "5511987654321", idioma: "es" });
    expect(r.pedido).toMatchObject({ valorTotal: 45000, valorAdelanto: 20000, fechaPedido: "2026-10-05" });
    expect(r.receta).toBeNull();
  });

  it("receita vazia não é gravada; preenchida é validada", async () => {
    const f = crearFakes();
    const casos = crearCasosDeUso(f.deps);
    await casos.crearPedido(nuevoPedido({ receta: { odEsfera: "", oiEsfera: "" } }));
    await casos.crearPedido(nuevoPedido({ receta: { odEsfera: "-1,25", odEje: "90" } }));
    expect(f.registros[0]!.receta).toBeNull();
    expect(f.registros[1]!.receta).toMatchObject({ odEsfera: -1.25, odEje: 90, oiEsfera: null });
    await expect(casos.crearPedido(nuevoPedido({ receta: { odEje: "200" } }))).rejects.toThrow("receta_invalida");
  });

  it("rejeita telefone inválido e cliente existente desconhecido", async () => {
    const casos = crearCasosDeUso(crearFakes().deps);
    await expect(
      casos.crearPedido(nuevoPedido({ cliente: { tipo: "nuevo", nombre: "Ana", whatsapp: "12345678", idioma: "es" } })),
    ).rejects.toThrow("telefono_invalido");
    await expect(
      casos.crearPedido(nuevoPedido({ cliente: { tipo: "existente", id: "00000000-0000-4000-8000-999999999999" } })),
    ).rejects.toThrow("no_encontrado");
  });

  it("exige usuário logado", async () => {
    const casos = crearCasosDeUso(crearFakes({ usuario: null }).deps);
    await expect(casos.crearPedido(nuevoPedido())).rejects.toThrow("no_autorizado");
  });
});

describe("listoYAvisar", () => {
  it("marca como listo, gera mensagem no idioma do cliente, devolve wa.me e registra o aviso", async () => {
    const f = crearFakes();
    const casos = crearCasosDeUso(f.deps);
    const { pedidoId } = await casos.crearPedido(nuevoPedido());

    const resultado = await casos.listoYAvisar(pedidoId);

    const esperado = "Hola María! 👋 Te escribimos de Óticas Latina. Tus lentes (pedido #0001) ya están listos.";
    expect(resultado).toEqual({
      tipo: "requiere_accion",
      url: `https://wa.me/5511987654321?text=${encodeURIComponent(esperado)}`,
    });
    expect(f.pedidos.get(pedidoId)!.status).toBe("listo");
    expect(f.notificaciones).toEqual([
      { clienteId: expect.any(String), pedidoId, tipo: "listo", canal: "wa_me", mensaje: esperado },
    ]);
  });

  it("cliente em português recebe o template pt", async () => {
    const f = crearFakes();
    const casos = crearCasosDeUso(f.deps);
    const { pedidoId } = await casos.crearPedido(
      nuevoPedido({ cliente: { tipo: "nuevo", nombre: "João Silva", whatsapp: "11 91234-5678", idioma: "pt" } }),
    );
    await casos.listoYAvisar(pedidoId);
    expect(f.notificaciones[0]!.mensaje).toBe(
      "Olá João! Aqui é da Óticas Latina. Seus óculos (pedido #0001) já estão prontos.",
    );
  });

  it("avisar de novo um pedido listo não muda o status", async () => {
    const f = crearFakes();
    const casos = crearCasosDeUso(f.deps);
    const { pedidoId } = await casos.crearPedido(nuevoPedido());
    await casos.listoYAvisar(pedidoId);
    await casos.listoYAvisar(pedidoId);
    expect(f.notificaciones).toHaveLength(2);
    expect(f.pedidos.get(pedidoId)!.status).toBe("listo");
  });

  it("não avisa pedido entregado", async () => {
    const f = crearFakes();
    const casos = crearCasosDeUso(f.deps);
    const { pedidoId } = await casos.crearPedido(nuevoPedido());
    await casos.marcarComoListo(pedidoId);
    await casos.marcarComoEntregado(pedidoId);
    await expect(casos.listoYAvisar(pedidoId)).rejects.toThrow("pedido_no_listo");
  });

  it("a mensagem nunca contém dados da receita", async () => {
    const f = crearFakes();
    const casos = crearCasosDeUso(f.deps);
    const { pedidoId } = await casos.crearPedido(
      nuevoPedido({ receta: { odEsfera: "-3,75", observaciones: "SECRETO" } }),
    );
    const r = await casos.listoYAvisar(pedidoId);
    const url = r.tipo === "requiere_accion" ? decodeURIComponent(r.url) : "";
    expect(url).not.toMatch(/3,75|3\.75|SECRETO/);
  });
});

describe("cambiarStatusPedido", () => {
  it("bloqueia transição inválida e detecta conflito", async () => {
    const f = crearFakes();
    const casos = crearCasosDeUso(f.deps);
    const { pedidoId } = await casos.crearPedido(nuevoPedido());
    await expect(casos.marcarComoEntregado(pedidoId)).rejects.toThrow("transicion_invalida");

    // Outra pessoa muda o pedido entre a leitura e a escrita.
    const original = f.deps.pedidos.obtenerPorId.bind(f.deps.pedidos);
    f.deps.pedidos.obtenerPorId = async (id) => {
      const p = await original(id);
      f.pedidos.set(id, { ...f.pedidos.get(id)!, status: "cancelado" });
      return p;
    };
    await expect(casos.marcarComoListo(pedidoId)).rejects.toThrow("conflicto");
  });
});

describe("renovações", () => {
  const base = {
    nombre: "Carlos Mamani",
    whatsapp: "5511900000001",
    idioma: "es" as const,
    pedidoNumero: 1,
    pedidoCreadoEn: "2025-09-20T15:00:00.000Z",
    ultimoPedidoCreadoEn: "2025-09-20T15:00:00.000Z",
    pedidosAbiertos: 0,
    ultimoAvisoRenovacion: null,
  };

  it("lista só elegíveis, mais antigos primeiro, indicando quem já foi avisado", async () => {
    const f = crearFakes();
    f.candidatos.push(
      { ...base, clienteId: "a", pedidoId: "pa", ultimaEntrega: "2025-10-20T15:00:00.000Z" },
      {
        ...base,
        clienteId: "b",
        pedidoId: "pb",
        ultimaEntrega: "2025-09-10T15:00:00.000Z",
        ultimoAvisoRenovacion: "2026-09-30T15:00:00.000Z",
      },
      { ...base, clienteId: "c", pedidoId: "pc", ultimaEntrega: "2025-10-01T15:00:00.000Z", pedidosAbiertos: 1 },
    );
    const lista = await crearCasosDeUso(f.deps).listarRenovaciones();
    expect(lista.map((c) => [c.clienteId, c.yaAvisado])).toEqual([
      ["b", true],
      ["a", false],
    ]);
  });

  it("avisar renovação usa o template e registra com o último pedido", async () => {
    const f = crearFakes();
    const clienteId = "00000000-0000-4000-8000-0000000000aa";
    f.candidatos.push({ ...base, clienteId, pedidoId: "pa", ultimaEntrega: "2025-10-05T15:00:00.000Z" });
    const r = await crearCasosDeUso(f.deps).avisarRenovacion(clienteId);
    expect(r.tipo).toBe("requiere_accion");
    expect(f.notificaciones[0]).toMatchObject({
      clienteId,
      pedidoId: "pa",
      tipo: "renovacion",
      mensaje: "Hola Carlos! Ya pasó casi un año desde tus últimos lentes en Óticas Latina.",
    });
  });

  it("não avisa cliente fora da janela", async () => {
    const f = crearFakes();
    const clienteId = "00000000-0000-4000-8000-0000000000bb";
    f.candidatos.push({ ...base, clienteId, pedidoId: "pa", ultimaEntrega: "2026-06-01T15:00:00.000Z" });
    await expect(crearCasosDeUso(f.deps).avisarRenovacion(clienteId)).rejects.toThrow("cliente_no_elegible");
  });
});

describe("configuração", () => {
  const entrada = {
    nombre: "Óticas Latina",
    telefonoWhatsapp: "11 3333-4444",
    idiomaDefault: "es",
    plantillaListoEs: "Hola {nombre}",
    plantillaListoPt: "Olá {nombre}",
    plantillaRenovacionEs: "Hola {nombre}, {optica}",
    plantillaRenovacionPt: "Olá {nombre}, {optica}",
  };

  it("só admin altera", async () => {
    await expect(crearCasosDeUso(crearFakes().deps).actualizarConfiguracion(entrada)).rejects.toThrow("no_autorizado");
    const f = crearFakes({ usuario: ADMIN });
    await crearCasosDeUso(f.deps).actualizarConfiguracion(entrada);
    expect(f.org.telefonoWhatsapp).toBe("551133334444");
  });

  it("rejeita variável desconhecida no template", async () => {
    const casos = crearCasosDeUso(crearFakes({ usuario: ADMIN }).deps);
    await expect(casos.actualizarConfiguracion({ ...entrada, plantillaListoEs: "Hola {cliente}" })).rejects.toThrow(
      "plantilla_invalida",
    );
  });
});

describe("interpretarBusqueda", () => {
  it.each([
    ["#12", { numero: 12 }],
    ["12", { numero: 12, telefono: "12" }],
    ["98765-4321", { telefono: "987654321" }],
    ["José", { nombre: "jose" }],
    ["", null],
  ])("%s", (texto, esperado) => {
    expect(interpretarBusqueda(texto)).toEqual(esperado);
  });
});
