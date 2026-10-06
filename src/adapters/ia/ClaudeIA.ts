import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ErrorDominio } from "@/domain/shared/errores";
import type {
  AsistentePort,
  HerramientaAsistente,
  ImagenReceta,
  LecturaReceta,
  LectorRecetaPort,
  MensajeAsistente,
} from "@/ports";
import { aLectura, EsquemaLectura, INSTRUCCIONES_RECETA } from "./receta";

export const MODELO_CLAUDE = "claude-opus-5-5";

/**
 * Se o modelo recusar por segurança, a API refaz a chamada no modelo recomendado
 * para aquela categoria, dentro da mesma requisição.
 */
function conFallback() {
  return {
    betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
    fallbacks: "default" as const,
  };
}

/** Falha da API (sem crédito, limite, indisponível) vira uma mensagem clara na tela; o detalhe fica no log. */
async function llamar<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error(`[IA] ${e.status ?? "sin status"}: ${e.message}`);
      throw new ErrorDominio("ia_no_disponible", e.message);
    }
    throw e;
  }
}

function textoDe(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export class ClaudeLectorReceta implements LectorRecetaPort {
  constructor(
    private readonly client: Anthropic,
    private readonly modelo: string = MODELO_CLAUDE,
  ) {}

  async leer(imagen: ImagenReceta): Promise<LecturaReceta> {
    const respuesta = await llamar(() =>
      this.client.beta.messages.parse({
        ...conFallback(),
        model: this.modelo,
        max_tokens: 4000,
        system: INSTRUCCIONES_RECETA,
        output_config: { format: betaZodOutputFormat(EsquemaLectura) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imagen.tipo, data: imagen.base64 } },
              { type: "text", text: "Extrae los valores de esta receta." },
            ],
          },
        ],
      }),
    );

    const r = respuesta.parsed_output;
    if (respuesta.stop_reason === "refusal" || !r) throw new ErrorDominio("receta_no_legible");

    return aLectura(r);
  }
}

export class ClaudeAsistente implements AsistentePort {
  constructor(
    private readonly client: Anthropic,
    private readonly modelo: string = MODELO_CLAUDE,
  ) {}

  async responder({
    instrucciones,
    historial,
    pregunta,
    herramientas,
  }: {
    instrucciones: string;
    historial: MensajeAsistente[];
    pregunta: string;
    herramientas: HerramientaAsistente[];
  }): Promise<string> {
    const mensajes: Anthropic.Beta.BetaMessageParam[] = [
      ...historial.map((m) => ({
        role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const),
        content: m.texto,
      })),
      { role: "user", content: pregunta },
    ];

    const final = await llamar(async () =>
      this.client.beta.messages.toolRunner({
        ...conFallback(),
        model: this.modelo,
        max_tokens: 16000,
        // Perguntas do balcão são simples: esforço baixo responde rápido e gasta menos.
        output_config: { effort: "low" },
        system: instrucciones,
        messages: mensajes,
        max_iterations: 8,
        tools: herramientas.map((h) =>
          betaTool({
            name: h.nombre,
            description: h.descripcion,
            inputSchema: h.esquemaEntrada,
            run: async (entrada) => JSON.stringify(await h.ejecutar(entrada)),
          }),
        ),
      }),
    );

    if (final.stop_reason === "refusal") throw new ErrorDominio("ia_no_disponible", "refusal");
    return textoDe(final.content) || "…";
  }
}
