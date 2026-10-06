import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { configIADesdeEnv, crearIA, type IA } from "@/adapters/ia/fabrica";
import { NotificadorWhatsapp } from "@/adapters/notificador/NotificadorWhatsapp";
import { PostgresCitaRepository } from "@/adapters/postgres/PostgresCitaRepository";
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
import { PostgresWhatsappRepository } from "@/adapters/postgres/PostgresWhatsappRepository";
import { ServicioWhatsappHttp, servicioWhatsappApagado } from "@/adapters/whatsapp/ServicioWhatsappHttp";
import { crearCasosDeUso, type CasosDeUso } from "@/application";
import { SesionCookie } from "./auth";
import { sql } from "./db";
import { hashSenha } from "./password";

/**
 * Composition root: o único lugar que conhece application e adapters ao mesmo tempo.
 * Uma instância por request (React cache), porque a sessão é do usuário daquele request.
 *
 * IA: Claude, OpenAI ou NVIDIA conforme IA_PROVEEDOR (ver adapters/ia/fabrica.ts).
 * Sem IA_ACTIVA=1 e chave, o sistema funciona normalmente, só sem as funções de IA.
 */
let ia: IA | null | undefined;
function iaConfigurada(): IA | null {
  if (ia === undefined) {
    const config = configIADesdeEnv(process.env);
    ia = config ? crearIA(config) : null;
  }
  return ia;
}

/** Serviço do WhatsApp por QR (worker/whatsapp.ts). Sem WHATSAPP_URL, o sistema usa só wa.me. */
function servicioWhatsapp() {
  const url = process.env.WHATSAPP_URL?.trim();
  const token = process.env.WHATSAPP_TOKEN?.trim();
  return url && token ? new ServicioWhatsappHttp(url.endsWith("/") ? url : `${url}/`, token) : servicioWhatsappApagado;
}

export const casosDeUso = cache(async (): Promise<CasosDeUso> => {
  // Dados de sessão e do banco: nunca pré-renderizar no build.
  await connection();
  const db = sql();
  const reloj = { ahora: () => new Date() };
  const servicio = servicioWhatsapp();
  return crearCasosDeUso({
    clientes: new PostgresClienteRepository(db),
    pedidos: new PostgresPedidoRepository(db),
    recetas: new PostgresRecetaRepository(db),
    notificaciones: new PostgresNotificacionRepository(db),
    renovaciones: new PostgresRenovacionRepository(db),
    organizacion: new PostgresOrganizacionRepository(db),
    sesion: new SesionCookie(),
    // WhatsApp conectado por QR envia sozinho; sem conexão, cai no wa.me.
    notificador: new NotificadorWhatsapp(servicio),
    reloj,
    consultas: new PostgresConsultas(db),
    usuarios: new PostgresUsuarioRepository(db),
    hasher: { hash: hashSenha },
    citas: new PostgresCitaRepository(db),
    whatsapp: new PostgresWhatsappRepository(db),
    servicioWhatsapp: servicio,
    lectorReceta: iaConfigurada()?.lectorReceta ?? null,
    asistente: iaConfigurada()?.asistente ?? null,
  });
});
