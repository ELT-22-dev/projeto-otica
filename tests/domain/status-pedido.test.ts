import { describe, expect, it } from "vitest";
import { cambiarStatus, estaAtrasado, saldoPendiente, validarNuevoPedido } from "@/domain/pedido/Pedido";
import { formatearNumeroPedido, parsearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { puedeTransicionar, STATUS_PEDIDO, type StatusPedido } from "@/domain/pedido/status-pedido";
import { ErrorDominio } from "@/domain/shared/errores";

const PERMITIDAS = new Set([
  "en_laboratorio→listo",
  "en_laboratorio→cancelado",
  "listo→entregado",
  "listo→en_laboratorio",
  "listo→cancelado",
  "entregado→listo",
]);

describe("transições de status", () => {
  for (const desde of STATUS_PEDIDO) {
    for (const hacia of STATUS_PEDIDO) {
      const clave = `${desde}→${hacia}`;
      const esperado = PERMITIDAS.has(clave);
      it(`${clave} ${esperado ? "é permitida" : "é bloqueada"}`, () => {
        expect(puedeTransicionar(desde, hacia)).toBe(esperado);
      });
    }
  }

  it("cancelado é final", () => {
    for (const hacia of STATUS_PEDIDO) expect(puedeTransicionar("cancelado", hacia)).toBe(false);
  });
});

describe("cambiarStatus", () => {
  const ahora = new Date("2026-10-05T15:00:00.000Z");
  const base = { fechaListo: null, fechaEntregado: null } as const;

  it("marcar como listo grava a data", () => {
    expect(cambiarStatus({ ...base, status: "en_laboratorio" }, "listo", ahora)).toEqual({
      status: "listo",
      fechaListo: ahora.toISOString(),
      fechaEntregado: null,
    });
  });

  it("entregar mantém a data de listo e grava a de entrega", () => {
    const listo = { status: "listo" as StatusPedido, fechaListo: "2026-10-01T10:00:00.000Z", fechaEntregado: null };
    expect(cambiarStatus(listo, "entregado", ahora)).toEqual({
      status: "entregado",
      fechaListo: "2026-10-01T10:00:00.000Z",
      fechaEntregado: ahora.toISOString(),
    });
  });

  it("desfazer entrega volta para listo com a data original de listo", () => {
    const entregado = {
      status: "entregado" as StatusPedido,
      fechaListo: "2026-10-01T10:00:00.000Z",
      fechaEntregado: "2026-10-02T10:00:00.000Z",
    };
    expect(cambiarStatus(entregado, "listo", ahora)).toEqual({
      status: "listo",
      fechaListo: "2026-10-01T10:00:00.000Z",
      fechaEntregado: null,
    });
  });

  it("voltar ao laboratório limpa as datas", () => {
    const listo = { status: "listo" as StatusPedido, fechaListo: "2026-10-01T10:00:00.000Z", fechaEntregado: null };
    expect(cambiarStatus(listo, "en_laboratorio", ahora)).toEqual({
      status: "en_laboratorio",
      fechaListo: null,
      fechaEntregado: null,
    });
  });

  it("transição inválida lança ErrorDominio", () => {
    expect(() => cambiarStatus({ ...base, status: "en_laboratorio" }, "entregado", ahora)).toThrow(ErrorDominio);
  });
});

describe("regras do pedido", () => {
  const datos = {
    descripcionArmazon: "  Ray-Ban preto  ",
    tipoLente: "",
    valorTotal: 50000,
    valorAdelanto: 20000,
    fechaPedido: "2026-10-05",
    fechaEntregaPrevista: "2026-10-12",
  };

  it("normaliza descrição e tipo de lente vazio", () => {
    expect(validarNuevoPedido(datos)).toMatchObject({ descripcionArmazon: "Ray-Ban preto", tipoLente: null });
  });

  it("rejeita sinal maior que o total", () => {
    expect(() => validarNuevoPedido({ ...datos, valorAdelanto: 60000 })).toThrow("adelanto_mayor_que_total");
  });

  it("rejeita entrega prevista antes do pedido", () => {
    expect(() => validarNuevoPedido({ ...datos, fechaEntregaPrevista: "2026-10-04" })).toThrow("fecha_invalida");
  });

  it("rejeita descrição vazia", () => {
    expect(() => validarNuevoPedido({ ...datos, descripcionArmazon: "   " })).toThrow("descripcion_requerida");
  });

  it("calcula saldo", () => {
    expect(saldoPendiente({ valorTotal: 50000, valorAdelanto: 20000 })).toBe(30000);
  });

  it("atrasado só quando em laboratório e a data prevista já passou", () => {
    expect(estaAtrasado({ status: "en_laboratorio", fechaEntregaPrevista: "2026-10-04" }, "2026-10-05")).toBe(true);
    expect(estaAtrasado({ status: "en_laboratorio", fechaEntregaPrevista: "2026-10-05" }, "2026-10-05")).toBe(false);
    expect(estaAtrasado({ status: "listo", fechaEntregaPrevista: "2026-10-01" }, "2026-10-05")).toBe(false);
  });
});

describe("número do pedido", () => {
  it("formata com 4 dígitos", () => {
    expect(formatearNumeroPedido(1)).toBe("#0001");
    expect(formatearNumeroPedido(12345)).toBe("#12345");
  });

  it("reconhece o que a atendente digita na busca", () => {
    expect(parsearNumeroPedido("#12")).toBe(12);
    expect(parsearNumeroPedido("0012")).toBe(12);
    expect(parsearNumeroPedido("12")).toBe(12);
    expect(parsearNumeroPedido("maria")).toBeNull();
    expect(parsearNumeroPedido("0")).toBeNull();
  });
});
