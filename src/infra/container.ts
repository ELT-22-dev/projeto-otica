import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeAsistente, ClaudeLectorReceta } from "@/adapters/ia/ClaudeIA";
import { WaMeNotificador } from "@/adapters/notificador/WaMeNotificador";
import { PostgresConsultas } from "@/adapters/postgres/PostgresConsultas";
import { PostgresPedidoRepository } from "@/adapters/postgres/PostgresPedidoRepository";
import {
  PostgresClienteRepository,
  PostgresNotificacionRepository,
  PostgresOrganizacionRepository,
  PostgresRecetaRepository,
  PostgresRenovacionRepository,
  PostgresUsuarioRepository,
} from "@/adapters/postgres/PostgresRepositorios";
import { crearCasosDeUso, type CasosDeUso } from "@/application";
import { SesionCookie } from "./auth";
import { sql } from "./db";
import { hashSenha } from "./password";

/**
 * Composition root: o único lugar que conhece application e adapters ao mesmo tempo.
 * Trocar o WhatsApp (wa.me → envio automático) é trocar o notificador aqui.
 * Uma instância por request (React cache), porque a sessão é do usuário daquele request.
 */
/**
 * IA só com IA_ACTIVA=1 e ANTHROPIC_API_KEY. Sem isso o sistema funciona normalmente,
 * apenas sem leitura de receita por foto e sem assistente.
 */
let claude: Anthropic | null | undefined;
function clienteClaude(): Anthropic | null {
  if (claude === undefined) {
    const activa = process.env.IA_ACTIVA === "1" && Boolean(process.env.ANTHROPIC_API_KEY);
    claude = activa ? new Anthropic({ timeout: 90_000, maxRetries: 1 }) : null;
  }
  return claude;
}

export const casosDeUso = cache(async (): Promise<CasosDeUso> => {
  // Dados de sessão e do banco: nunca pré-renderizar no build.
  await connection();
  const db = sql();
  return crearCasosDeUso({
    clientes: new PostgresClienteRepository(db),
    pedidos: new PostgresPedidoRepository(db),
    recetas: new PostgresRecetaRepository(db),
    notificaciones: new PostgresNotificacionRepository(db),
    renovaciones: new PostgresRenovacionRepository(db),
    organizacion: new PostgresOrganizacionRepository(db),
    sesion: new SesionCookie(),
    notificador: new WaMeNotificador(),
    reloj: { ahora: () => new Date() },
    consultas: new PostgresConsultas(db),
    usuarios: new PostgresUsuarioRepository(db),
    hasher: { hash: hashSenha },
    lectorReceta: clienteClaude() ? new ClaudeLectorReceta(clienteClaude()!) : null,
    asistente: clienteClaude() ? new ClaudeAsistente(clienteClaude()!) : null,
  });
});
