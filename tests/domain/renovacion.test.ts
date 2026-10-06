import { describe, expect, it } from "vitest";
import {
  esElegibleRenovacion,
  ventanaRenovacion,
  yaAvisadoRenovacion,
  type CandidatoRenovacion,
} from "@/domain/renovacion/regla-renovacion";

const HOY = "2026-10-05";

/** Meio-dia em São Paulo (15h UTC) para não depender de fuso no teste. */
function instante(fecha: string): string {
  return `${fecha}T15:00:00.000Z`;
}

function candidato(entrega: string, extra: Partial<CandidatoRenovacion> = {}): CandidatoRenovacion {
  return {
    clienteId: "c1",
    nombre: "Carlos Mamani",
    whatsapp: "5511987654321",
    idioma: "es",
    pedidoId: "p1",
    pedidoNumero: 1,
    pedidoCreadoEn: instante("2025-01-01"),
    ultimaEntrega: instante(entrega),
    ultimoPedidoCreadoEn: instante("2025-01-01"),
    pedidosAbiertos: 0,
    ultimoAvisoRenovacion: null,
    ...extra,
  };
}

describe("ventanaRenovacion", () => {
  it("vai de 13 a 11 meses atrás", () => {
    expect(ventanaRenovacion(HOY)).toEqual({ desde: "2025-09-05", hasta: "2025-11-05" });
  });

  it("trata fim de mês", () => {
    expect(ventanaRenovacion("2026-12-31")).toEqual({ desde: "2025-11-30", hasta: "2026-01-31" });
    expect(ventanaRenovacion("2027-01-31")).toEqual({ desde: "2025-12-31", hasta: "2026-02-28" });
  });
});

describe("esElegibleRenovacion", () => {
  it.each([
    ["2025-12-05", false, "10 meses: cedo demais"],
    ["2025-11-06", false, "um dia antes de completar 11 meses"],
    ["2025-11-05", true, "exatamente 11 meses"],
    ["2025-10-05", true, "12 meses"],
    ["2025-09-05", true, "exatamente 13 meses"],
    ["2025-09-04", false, "13 meses e 1 dia: passou da janela"],
  ])("entrega em %s → %s (%s)", (entrega, esperado) => {
    expect(esElegibleRenovacion(candidato(entrega), HOY)).toBe(esperado);
  });

  it("usa a data local de São Paulo, não a UTC", () => {
    // 02:00 UTC de 06/11 ainda é 05/11 em São Paulo → exatamente 11 meses
    expect(esElegibleRenovacion(candidato("x", { ultimaEntrega: "2025-11-06T02:00:00.000Z" }), HOY)).toBe(true);
  });

  it("não é elegível se fez pedido depois", () => {
    const c = candidato("2025-10-05", { ultimoPedidoCreadoEn: instante("2026-03-01") });
    expect(esElegibleRenovacion(c, HOY)).toBe(false);
  });

  it("não é elegível com pedido em aberto", () => {
    expect(esElegibleRenovacion(candidato("2025-10-05", { pedidosAbiertos: 1 }), HOY)).toBe(false);
  });
});

describe("yaAvisadoRenovacion", () => {
  it("sem aviso", () => {
    expect(yaAvisadoRenovacion(candidato("2025-10-05"))).toBe(false);
  });

  it("aviso depois da última entrega conta", () => {
    expect(yaAvisadoRenovacion(candidato("2025-10-05", { ultimoAvisoRenovacion: instante("2026-10-01") }))).toBe(true);
  });

  it("aviso de um ciclo anterior não conta", () => {
    expect(yaAvisadoRenovacion(candidato("2025-10-05", { ultimoAvisoRenovacion: instante("2024-09-01") }))).toBe(false);
  });
});
