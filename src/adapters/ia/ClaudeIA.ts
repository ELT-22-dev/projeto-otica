import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ErrorDominio } from "@/domain/shared/errores";
import type {
  AsistentePort,
  HerramientaAsistente,
  ImagenReceta,
  LecturaReceta,
  LectorRecetaPort,
  MensajeAsistente,
} from "@/ports";

const MODELO = "claude-opus-5-5";

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

const numero = z.number().nullable();

const EsquemaLectura = z.object({
  es_receta_optica: z.boolean().describe("true si la imagen es una receta o prescripción de lentes"),
  od_esfera: numero,
  od_cilindro: numero,
  od_eje: numero,
  oi_esfera: numero,
  oi_cilindro: numero,
  oi_eje: numero,
  adicion: numero,
  dnp_od: numero,
  dnp_oi: numero,
  fecha_receta: z.string().nullable().describe("AAAA-MM-DD"),
  observaciones: z.string().nullable(),
  advertencias: z.string().nullable(),
});

const INSTRUCCIONES_RECETA = `Lees recetas de lentes (prescripciones oftalmológicas) fotografiadas en una óptica de São Paulo.
Las recetas pueden estar en portugués o español, impresas o escritas a mano.

Equivalencias:
- Ojo derecho: OD. Ojo izquierdo: OI en español, OE ("olho esquerdo") en portugués. Ambos van en los campos oi_*.
- Esfera: "esf", "esférico". Cilindro: "cil", "cilíndrico". Eje: "eixo", "eje", en grados.
- Adición: "adição", "add".
- DNP: distancia naso-pupilar de cada ojo (en mm, normalmente 25-38).

Reglas:
- Copia los valores tal como están escritos, con su signo. "Plano", "pl" o "0,00" en esfera es 0.
- Usa los valores de lejos ("longe"/"lejos"). Si solo hay valores de cerca, déjalos en null y explícalo en advertencias.
- Si solo hay una distancia pupilar total (DP/DIP), deja dnp_od y dnp_oi en null y anota la DP total en advertencias.
- Si un número es ilegible o dudoso, déjalo en null y menciónalo en advertencias. Es mejor null que un valor inventado.
- observaciones: indicaciones del médico relevantes para la óptica (tipo de lente, uso, tratamientos). Sin datos personales.
- advertencias: breve, en español, solo si hay algo que la atendente deba revisar.
- Si la imagen no es una receta de lentes, es_receta_optica = false y todo lo demás null.`;

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
  constructor(private readonly client: Anthropic) {}

  async leer(imagen: ImagenReceta): Promise<LecturaReceta> {
    const respuesta = await llamar(() =>
      this.client.beta.messages.parse({
        ...conFallback(),
        model: MODELO,
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

    return {
      esReceta: r.es_receta_optica,
      valores: {
        odEsfera: r.od_esfera,
        odCilindro: r.od_cilindro,
        odEje: r.od_eje,
        oiEsfera: r.oi_esfera,
        oiCilindro: r.oi_cilindro,
        oiEje: r.oi_eje,
        adicion: r.adicion,
        dnpOd: r.dnp_od,
        dnpOi: r.dnp_oi,
      },
      fechaReceta: r.fecha_receta,
      observaciones: r.observaciones,
      advertencias: r.advertencias,
    };
  }
}

export class ClaudeAsistente implements AsistentePort {
  constructor(private readonly client: Anthropic) {}

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
        model: MODELO,
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
