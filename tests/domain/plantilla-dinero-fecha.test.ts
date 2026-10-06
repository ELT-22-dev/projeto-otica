import { describe, expect, it } from "vitest";
import { normalizarBusqueda, normalizarNombre, primerNombre } from "@/domain/cliente/Cliente";
import { renderizarPlantilla, validarPlantilla, variablesDesconocidas } from "@/domain/notificacion/plantilla";
import { validarReceta, recetaVacia, type DatosReceta } from "@/domain/receta/Receta";
import { parsearMonto } from "@/domain/shared/dinero";
import { fechaLocal, mesesCompletosEntre, sumarDias, sumarMeses } from "@/domain/shared/fecha";

describe("plantillas", () => {
  const listoEs = "Hola {nombre}! 👋 Te escribimos de {optica}. Tus lentes (pedido #{numero}) ya están listos.";

  it("preenche as variáveis usando o primeiro nome", () => {
    expect(
      renderizarPlantilla(listoEs, {
        nombreCliente: "María José Quispe",
        optica: "Óticas Latina",
        numeroPedido: "0007",
      }),
    ).toBe("Hola María! 👋 Te escribimos de Óticas Latina. Tus lentes (pedido #0007) ya están listos.");
  });

  it("variável desconhecida fica como está e é apontada na validação", () => {
    const p = "Hola {nombre}, tu receta {receta}";
    expect(renderizarPlantilla(p, { nombreCliente: "Ana", optica: "X" })).toBe("Hola Ana, tu receta {receta}");
    expect(variablesDesconocidas(p)).toEqual(["receta"]);
    expect(() => validarPlantilla(p)).toThrow("plantilla_invalida");
  });

  it("template vazio é inválido", () => {
    expect(() => validarPlantilla("   ")).toThrow("plantilla_invalida");
  });
});

describe("cliente", () => {
  it("normaliza nome", () => {
    expect(normalizarNombre("  María   Quispe ")).toBe("María Quispe");
    expect(() => normalizarNombre(" a ")).toThrow("nombre_invalido");
  });

  it("primeiro nome", () => {
    expect(primerNombre("  Rosa Gutiérrez")).toBe("Rosa");
  });

  it("busca sem acento e sem maiúscula", () => {
    expect(normalizarBusqueda("  JOSÉ  Gutiérrez ")).toBe("jose gutierrez");
  });
});

describe("parsearMonto", () => {
  it.each([
    ["350", 35000],
    ["350,50", 35050],
    ["350,5", 35050],
    ["1.200,50", 120050],
    ["1.200", 120000],
    ["350.50", 35050],
    ["R$ 80", 8000],
    ["0", 0],
  ])("%s → %i centavos", (texto, esperado) => {
    expect(parsearMonto(texto)).toBe(esperado);
  });

  it.each([["abc"], [""], ["-10"], ["1,2,3"], ["10,999"]])("rejeita %s", (texto) => {
    expect(() => parsearMonto(texto)).toThrow("monto_invalido");
  });
});

describe("datas", () => {
  it("soma meses respeitando fim de mês", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2024-03-31", -1)).toBe("2024-02-29");
    expect(sumarMeses("2026-10-05", -13)).toBe("2025-09-05");
  });

  it("soma dias atravessando o ano", () => {
    expect(sumarDias("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("meses completos considera o dia do mês", () => {
    expect(mesesCompletosEntre("2025-10-30", "2026-10-05")).toBe(11);
    expect(mesesCompletosEntre("2025-10-05", "2026-10-05")).toBe(12);
    expect(mesesCompletosEntre("2026-01-31", "2026-02-28")).toBe(1);
    expect(mesesCompletosEntre("2026-01-05", "2026-02-04")).toBe(0);
  });

  it("data local em São Paulo", () => {
    expect(fechaLocal("2026-10-06T02:30:00.000Z")).toBe("2026-10-05");
  });
});

describe("receta", () => {
  const vacia: DatosReceta = {
    odEsfera: null,
    odCilindro: null,
    odEje: null,
    oiEsfera: null,
    oiCilindro: null,
    oiEje: null,
    adicion: null,
    dnpOd: null,
    dnpOi: null,
    observaciones: null,
    fechaReceta: null,
  };

  it("detecta receita vazia", () => {
    expect(recetaVacia(vacia)).toBe(true);
    expect(recetaVacia({ ...vacia, odEsfera: -1.25 })).toBe(false);
  });

  it("aceita valores comuns", () => {
    expect(() => validarReceta({ ...vacia, odEsfera: -2.5, odCilindro: -0.75, odEje: 180, adicion: 2 })).not.toThrow();
  });

  it("rejeita eixo fora de 0–180 ou fracionado", () => {
    expect(() => validarReceta({ ...vacia, odEje: 181 })).toThrow("receta_invalida");
    expect(() => validarReceta({ ...vacia, oiEje: 90.5 })).toThrow("receta_invalida");
  });
});
