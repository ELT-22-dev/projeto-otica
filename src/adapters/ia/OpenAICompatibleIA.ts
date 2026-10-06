import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
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

/**
 * OpenAI e qualquer API no mesmo formato (NVIDIA build.nvidia.com, etc.):
 * muda só a baseURL, a chave e o nome do modelo.
 */
async function llamar<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof OpenAI.APIError) {
      console.error(`[IA] ${e.status ?? "sin status"}: ${e.message}`);
      throw new ErrorDominio("ia_no_disponible", e.message);
    }
    throw e;
  }
}

const MAX_ITERACIONES = 8;

export class OpenAICompatibleAsistente implements AsistentePort {
  constructor(
    private readonly client: OpenAI,
    private readonly modelo: string,
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
    const mensajes: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: instrucciones },
      ...historial.map((m): OpenAI.Chat.ChatCompletionMessageParam =>
        m.rol === "usuario" ? { role: "user", content: m.texto } : { role: "assistant", content: m.texto },
      ),
      { role: "user", content: pregunta },
    ];
    const tools: OpenAI.Chat.ChatCompletionTool[] = herramientas.map((h) => ({
      type: "function",
      function: { name: h.nombre, description: h.descripcion, parameters: h.esquemaEntrada },
    }));

    // Laço de ferramentas: o modelo pede uma consulta, a gente executa e devolve o resultado.
    for (let i = 0; i < MAX_ITERACIONES; i++) {
      const respuesta = await llamar(() =>
        this.client.chat.completions.create({
          model: this.modelo,
          messages: mensajes,
          ...(tools.length > 0 ? { tools } : {}),
        }),
      );
      const mensaje = respuesta.choices[0]?.message;
      if (!mensaje) throw new ErrorDominio("ia_no_disponible", "respuesta vacía");
      const llamadas = (mensaje.tool_calls ?? []).filter((c) => c.type === "function");
      if (llamadas.length === 0) return mensaje.content?.trim() || "…";

      mensajes.push({ role: "assistant", content: mensaje.content ?? null, tool_calls: llamadas });
      for (const llamada of llamadas) {
        const h = herramientas.find((x) => x.nombre === llamada.function.name);
        let resultado: unknown;
        try {
          if (!h) throw new Error(`herramienta desconocida: ${llamada.function.name}`);
          resultado = await h.ejecutar(JSON.parse(llamada.function.arguments || "{}"));
        } catch (e) {
          // O modelo recebe o erro e pode tentar de outro jeito.
          resultado = { error: e instanceof Error ? e.message : String(e) };
        }
        mensajes.push({ role: "tool", tool_call_id: llamada.id, content: JSON.stringify(resultado) });
      }
    }
    throw new ErrorDominio("ia_no_disponible", "demasiadas llamadas a herramientas");
  }
}

/** Só para modelos com visão (ex.: os da OpenAI). */
export class OpenAICompatibleLectorReceta implements LectorRecetaPort {
  constructor(
    private readonly client: OpenAI,
    private readonly modelo: string,
  ) {}

  async leer(imagen: ImagenReceta): Promise<LecturaReceta> {
    const respuesta = await llamar(() =>
      this.client.chat.completions.parse({
        model: this.modelo,
        response_format: zodResponseFormat(EsquemaLectura, "lectura_receta"),
        messages: [
          { role: "system", content: INSTRUCCIONES_RECETA },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${imagen.tipo};base64,${imagen.base64}` } },
              { type: "text", text: "Extrae los valores de esta receta." },
            ],
          },
        ],
      }),
    );
    const r = respuesta.choices[0]?.message.parsed;
    if (!r) throw new ErrorDominio("receta_no_legible");
    return aLectura(r);
  }
}
