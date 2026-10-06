import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { configIADesdeEnv, crearIA } from "@/adapters/ia/fabrica";
import { OpenAICompatibleAsistente } from "@/adapters/ia/OpenAICompatibleIA";

/** Servidor falso no formato da API de chat da OpenAI (o mesmo da NVIDIA). */
function clienteFalso(respuestas: unknown[], pedidos: Record<string, unknown>[]) {
  const fetchFalso: typeof fetch = async (_url, init) => {
    pedidos.push(JSON.parse(String(init?.body)));
    const mensaje = respuestas.shift();
    if (!mensaje) return new Response(JSON.stringify({ error: { message: "sin crédito" } }), { status: 429 });
    return new Response(
      JSON.stringify({
        id: "x",
        object: "chat.completion",
        created: 0,
        model: "m",
        choices: [{ index: 0, finish_reason: "stop", message: mensaje }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return new OpenAI({ apiKey: "k", baseURL: "http://falso/v1", fetch: fetchFalso, maxRetries: 0 });
}

describe("asistente OpenAI / NVIDIA", () => {
  it("executa a ferramenta pedida e devolve a resposta final", async () => {
    const pedidos: Record<string, unknown>[] = [];
    const cliente = clienteFalso(
      [
        {
          role: "assistant",
          content: null,
          tool_calls: [{ id: "c1", type: "function", function: { name: "estado_de_mis_pedidos", arguments: "{}" } }],
        },
        { role: "assistant", content: "Tu pedido #0001 está listo." },
      ],
      pedidos,
    );
    const llamadas: unknown[] = [];
    const respuesta = await new OpenAICompatibleAsistente(cliente, "meta/llama").responder({
      instrucciones: "sé breve",
      historial: [
        { rol: "usuario", texto: "hola" },
        { rol: "asistente", texto: "¡hola!" },
      ],
      pregunta: "¿mis lentes?",
      herramientas: [
        {
          nombre: "estado_de_mis_pedidos",
          descripcion: "pedidos",
          esquemaEntrada: { type: "object", properties: {} },
          ejecutar: async (e) => {
            llamadas.push(e);
            return { pedidos: [{ numero: "#0001", estado: "listo" }] };
          },
        },
      ],
    });

    expect(respuesta).toBe("Tu pedido #0001 está listo.");
    expect(llamadas).toEqual([{}]);
    expect(pedidos[0]).toMatchObject({
      model: "meta/llama",
      messages: [
        { role: "system", content: "sé breve" },
        { role: "user", content: "hola" },
        { role: "assistant", content: "¡hola!" },
        { role: "user", content: "¿mis lentes?" },
      ],
      tools: [{ type: "function", function: { name: "estado_de_mis_pedidos" } }],
    });
    // Segunda chamada leva o resultado da ferramenta.
    expect((pedidos[1]!.messages as { role: string; content: string }[]).at(-1)).toEqual({
      role: "tool",
      tool_call_id: "c1",
      content: JSON.stringify({ pedidos: [{ numero: "#0001", estado: "listo" }] }),
    });
  });

  it("erro da API vira ia_no_disponible", async () => {
    const asistente = new OpenAICompatibleAsistente(clienteFalso([], []), "m");
    await expect(
      asistente.responder({ instrucciones: "", historial: [], pregunta: "hola", herramientas: [] }),
    ).rejects.toThrow("ia_no_disponible");
  });
});

describe("escolha do provedor pelas variáveis de ambiente", () => {
  it("desligada sem IA_ACTIVA=1 ou sem a chave do provedor", () => {
    expect(configIADesdeEnv({ ANTHROPIC_API_KEY: "a" })).toBeNull();
    expect(configIADesdeEnv({ IA_ACTIVA: "1", IA_PROVEEDOR: "nvidia", ANTHROPIC_API_KEY: "a" })).toBeNull();
    expect(configIADesdeEnv({ IA_ACTIVA: "1", IA_PROVEEDOR: "gemini", ANTHROPIC_API_KEY: "a" })).toBeNull();
  });

  it("claude por padrão; nvidia sem leitura de receita", () => {
    expect(configIADesdeEnv({ IA_ACTIVA: "1", ANTHROPIC_API_KEY: "a" })).toMatchObject({ proveedor: "claude" });
    const nvidia = crearIA(configIADesdeEnv({ IA_ACTIVA: "1", IA_PROVEEDOR: "NVIDIA", NVIDIA_API_KEY: "n" })!);
    expect(nvidia).toMatchObject({ proveedor: "nvidia", modelo: "meta/llama-3.3-70b-instruct", lectorReceta: null });
    const openai = crearIA(
      configIADesdeEnv({ IA_ACTIVA: "1", IA_PROVEEDOR: "openai", OPENAI_API_KEY: "o", IA_MODELO: "gpt-x" })!,
    );
    expect(openai.modelo).toBe("gpt-x");
    expect(openai.lectorReceta).not.toBeNull();
  });
});
