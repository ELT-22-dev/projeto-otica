import { describe, expect, it } from "vitest";
import { crearCasosDeUso } from "@/application";
import { crearFakes } from "./fakes";

const IMAGEN = { tipo: "image/jpeg", base64: "A".repeat(200) };

describe("leerRecetaDeFoto", () => {
  it("devolve os valores lidos já limpos para conferir", async () => {
    const f = crearFakes({
      lectura: {
        esReceta: true,
        valores: { odEsfera: -2.25, odEje: 180, oiEsfera: -2, oiEje: 999, dnpOd: 31.54 },
        fechaReceta: "2026-09-30",
        observaciones: "  Antirreflejo  ",
        advertencias: null,
      },
    });
    const r = await crearCasosDeUso(f.deps).leerRecetaDeFoto(IMAGEN);
    expect(r).toMatchObject({
      odEsfera: -2.25,
      odEje: 180,
      oiEsfera: -2,
      oiEje: null, // fora de faixa: a atendente preenche
      dnpOd: 31.5,
      fechaReceta: "2026-09-30",
      observaciones: "Antirreflejo",
    });
  });

  it("foto que não é receta, ou sem nenhum valor legível, é recusada", async () => {
    const naoReceta = crearFakes();
    await expect(crearCasosDeUso(naoReceta.deps).leerRecetaDeFoto(IMAGEN)).rejects.toThrow("receta_no_legible");

    const vazia = crearFakes({
      lectura: {
        esReceta: true,
        valores: { odEje: 500 },
        fechaReceta: "ontem",
        observaciones: null,
        advertencias: null,
      },
    });
    await expect(crearCasosDeUso(vazia.deps).leerRecetaDeFoto(IMAGEN)).rejects.toThrow("receta_no_legible");
  });

  it("valida a imagem e exige IA configurada e usuário logado", async () => {
    const casos = crearCasosDeUso(crearFakes().deps);
    await expect(casos.leerRecetaDeFoto({ tipo: "image/gif", base64: "A".repeat(200) })).rejects.toThrow(
      "imagen_invalida",
    );
    await expect(casos.leerRecetaDeFoto({ tipo: "image/jpeg", base64: "não é base64!".repeat(20) })).rejects.toThrow(
      "imagen_invalida",
    );
    await expect(crearCasosDeUso(crearFakes({ sinIA: true }).deps).leerRecetaDeFoto(IMAGEN)).rejects.toThrow(
      "ia_no_disponible",
    );
    await expect(crearCasosDeUso(crearFakes({ usuario: null }).deps).leerRecetaDeFoto(IMAGEN)).rejects.toThrow(
      "no_autorizado",
    );
  });
});

describe("preguntarAsistente", () => {
  it("passa instruções com a ótica, a data e só ferramentas de consulta", async () => {
    const f = crearFakes();
    const resposta = await crearCasosDeUso(f.deps).preguntarAsistente({ pregunta: "¿Qué está atrasado?" });
    expect(resposta).toBe("respuesta");
    expect(f.asistente.pregunta).toBe("¿Qué está atrasado?");
    expect(f.asistente.instrucciones).toContain("Óticas Latina");
    expect(f.asistente.instrucciones).toContain("2026-10-05");
    expect(f.asistente.herramientas.map((h) => h.nombre)).toEqual([
      "resumen_pedidos",
      "listar_pedidos",
      "buscar_pedidos",
      "listar_renovaciones",
    ]);
  });

  it("ferramentas validam a entrada que vem do modelo", async () => {
    const f = crearFakes();
    await crearCasosDeUso(f.deps).preguntarAsistente({ pregunta: "hola" });
    const listar = f.asistente.herramientas.find((h) => h.nombre === "listar_pedidos")!;
    await expect(listar.ejecutar({ estado: "borrado" })).rejects.toThrow();
    expect(listar.esquemaEntrada).toMatchObject({ type: "object", required: ["estado"] });
  });

  it("limita tamanho da pergunta e do histórico", async () => {
    const casos = crearCasosDeUso(crearFakes().deps);
    await expect(casos.preguntarAsistente({ pregunta: "x".repeat(501) })).rejects.toThrow();
    await expect(
      casos.preguntarAsistente({
        pregunta: "hola",
        historial: Array.from({ length: 13 }, () => ({ rol: "usuario", texto: "a" })),
      }),
    ).rejects.toThrow();
  });

  it("sem IA configurada avisa em vez de quebrar", async () => {
    await expect(
      crearCasosDeUso(crearFakes({ sinIA: true }).deps).preguntarAsistente({ pregunta: "hola" }),
    ).rejects.toThrow("ia_no_disponible");
  });
});
