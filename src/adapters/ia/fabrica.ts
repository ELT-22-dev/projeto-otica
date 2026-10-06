import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AsistentePort, LectorRecetaPort } from "@/ports";
import { ClaudeAsistente, ClaudeLectorReceta, MODELO_CLAUDE } from "./ClaudeIA";
import { OpenAICompatibleAsistente, OpenAICompatibleLectorReceta } from "./OpenAICompatibleIA";

export const PROVEEDORES_IA = ["claude", "openai", "nvidia"] as const;
export type ProveedorIA = (typeof PROVEEDORES_IA)[number];

export interface ConfigIA {
  proveedor: ProveedorIA;
  /** Opcional: cada provedor tem um padrão. */
  modelo?: string;
  clave: string;
}

const MODELO_POR_DEFECTO: Record<ProveedorIA, string> = {
  claude: MODELO_CLAUDE,
  openai: "gpt-5.5",
  nvidia: "meta/llama-3.3-70b-instruct",
};

const BASE_URL_NVIDIA = "https://integrate.api.nvidia.com/v1";

export interface IA {
  proveedor: ProveedorIA;
  modelo: string;
  asistente: AsistentePort;
  /** null quando o provedor/modelo não lê imagens de forma confiável. */
  lectorReceta: LectorRecetaPort | null;
}

export function crearIA(config: ConfigIA): IA {
  const modelo = config.modelo?.trim() || MODELO_POR_DEFECTO[config.proveedor];
  switch (config.proveedor) {
    case "claude": {
      const client = new Anthropic({ apiKey: config.clave, timeout: 90_000, maxRetries: 1 });
      return {
        proveedor: "claude",
        modelo,
        asistente: new ClaudeAsistente(client, modelo),
        lectorReceta: new ClaudeLectorReceta(client, modelo),
      };
    }
    case "openai": {
      const client = new OpenAI({ apiKey: config.clave, timeout: 90_000, maxRetries: 1 });
      return {
        proveedor: "openai",
        modelo,
        asistente: new OpenAICompatibleAsistente(client, modelo),
        lectorReceta: new OpenAICompatibleLectorReceta(client, modelo),
      };
    }
    case "nvidia": {
      const client = new OpenAI({ apiKey: config.clave, baseURL: BASE_URL_NVIDIA, timeout: 90_000, maxRetries: 1 });
      return {
        proveedor: "nvidia",
        modelo,
        asistente: new OpenAICompatibleAsistente(client, modelo),
        lectorReceta: null,
      };
    }
  }
}

/**
 * Lê a configuração das variáveis de ambiente (app e worker usam a mesma):
 *   IA_ACTIVA=1, IA_PROVEEDOR=claude|openai|nvidia, IA_MODELO (opcional)
 *   e a chave do provedor: ANTHROPIC_API_KEY, OPENAI_API_KEY ou NVIDIA_API_KEY.
 */
export function configIADesdeEnv(env: Record<string, string | undefined>): ConfigIA | null {
  if (env.IA_ACTIVA !== "1") return null;
  const proveedor = (env.IA_PROVEEDOR?.trim().toLowerCase() || "claude") as ProveedorIA;
  if (!PROVEEDORES_IA.includes(proveedor)) {
    console.error(`[IA] IA_PROVEEDOR desconocido: ${env.IA_PROVEEDOR}`);
    return null;
  }
  const clave = {
    claude: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    nvidia: env.NVIDIA_API_KEY,
  }[proveedor]?.trim();
  if (!clave) return null;
  return { proveedor, modelo: env.IA_MODELO, clave };
}
