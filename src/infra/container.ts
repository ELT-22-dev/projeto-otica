import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { WaMeNotificador } from "@/adapters/notificador/WaMeNotificador";
import { PostgresPedidoRepository } from "@/adapters/postgres/PostgresPedidoRepository";
import {
  PostgresClienteRepository,
  PostgresNotificacionRepository,
  PostgresOrganizacionRepository,
  PostgresRecetaRepository,
  PostgresRenovacionRepository,
} from "@/adapters/postgres/PostgresRepositorios";
import { crearCasosDeUso, type CasosDeUso } from "@/application";
import { SesionCookie } from "./auth";
import { sql } from "./db";

/**
 * Composition root: o único lugar que conhece application e adapters ao mesmo tempo.
 * Trocar o WhatsApp (wa.me → envio automático) é trocar o notificador aqui.
 * Uma instância por request (React cache), porque a sessão é do usuário daquele request.
 */
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
  });
});
