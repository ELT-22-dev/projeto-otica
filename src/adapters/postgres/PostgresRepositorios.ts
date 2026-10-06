import type { Cliente } from "@/domain/cliente/Cliente";
import type { Notificacion, NuevaNotificacion } from "@/domain/notificacion/Notificacion";
import type { Organizacion } from "@/domain/organizacion/Organizacion";
import type { Receta } from "@/domain/receta/Receta";
import type { CandidatoRenovacion, VentanaRenovacion } from "@/domain/renovacion/regla-renovacion";
import type { Rol, UsuarioActual } from "@/domain/usuario/Usuario";
import type {
  CambiosOrganizacion,
  ClienteRepository,
  NotificacionRepository,
  OrganizacionRepository,
  RecetaRepository,
  RenovacionRepository,
} from "@/ports";
import {
  aCandidato,
  aCliente,
  aNotificacion,
  aOrganizacion,
  aReceta,
  COLUMNAS_CANDIDATO,
  COLUMNAS_CLIENTE,
  COLUMNAS_NOTIFICACION,
  COLUMNAS_RECETA,
  type FilaCandidato,
  type FilaCliente,
  type FilaConfiguracion,
  type FilaNotificacion,
  type FilaReceta,
} from "./mappers";
import { consultar, escaparLike, ErrorPersistencia, type Sql } from "./sql";

export class PostgresClienteRepository implements ClienteRepository {
  constructor(private readonly sql: Sql) {}

  async buscar(texto: { nombre?: string; telefono?: string }, limite: number): Promise<Cliente[]> {
    const [columna, valor] = texto.telefono
      ? ["whatsapp", texto.telefono.replace(/\D/g, "")]
      : ["nombre_busqueda", texto.nombre ?? ""];
    const filas = await consultar<FilaCliente>(
      this.sql,
      "buscar clientes",
      `select ${COLUMNAS_CLIENTE} from clientes where ${columna} like $1 order by nombre limit $2`,
      [`%${escaparLike(valor)}%`, limite],
    );
    return filas.map(aCliente);
  }

  async obtenerPorId(id: string): Promise<Cliente | null> {
    const filas = await consultar<FilaCliente>(
      this.sql,
      "obtener cliente",
      `select ${COLUMNAS_CLIENTE} from clientes where id = $1`,
      [id],
    );
    return filas[0] ? aCliente(filas[0]) : null;
  }
}

export class PostgresRecetaRepository implements RecetaRepository {
  constructor(private readonly sql: Sql) {}

  async listarPorCliente(clienteId: string): Promise<Receta[]> {
    const filas = await consultar<FilaReceta>(
      this.sql,
      "recetas del cliente",
      `select ${COLUMNAS_RECETA} from recetas where cliente_id = $1 order by created_at desc`,
      [clienteId],
    );
    return filas.map(aReceta);
  }

  async obtenerPorPedido(pedidoId: string): Promise<Receta | null> {
    const filas = await consultar<FilaReceta>(
      this.sql,
      "receta del pedido",
      `select ${COLUMNAS_RECETA} from recetas where pedido_id = $1 order by created_at desc limit 1`,
      [pedidoId],
    );
    return filas[0] ? aReceta(filas[0]) : null;
  }
}

export class PostgresNotificacionRepository implements NotificacionRepository {
  constructor(private readonly sql: Sql) {}

  async registrar(n: NuevaNotificacion, creadoPor: string): Promise<void> {
    await consultar(
      this.sql,
      "registrar notificacion",
      `insert into notificaciones (cliente_id, pedido_id, tipo, canal, mensaje, created_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [n.clienteId, n.pedidoId, n.tipo, n.canal, n.mensaje, creadoPor],
    );
  }

  async listarPorCliente(clienteId: string): Promise<Notificacion[]> {
    const filas = await consultar<FilaNotificacion>(
      this.sql,
      "notificaciones del cliente",
      `select ${COLUMNAS_NOTIFICACION} from notificaciones where cliente_id = $1 order by created_at desc limit 50`,
      [clienteId],
    );
    return filas.map(aNotificacion);
  }
}

export class PostgresRenovacionRepository implements RenovacionRepository {
  constructor(private readonly sql: Sql) {}

  async listarCandidatos({ desde, hasta }: VentanaRenovacion): Promise<CandidatoRenovacion[]> {
    const filas = await consultar<FilaCandidato>(
      this.sql,
      "candidatos renovacion",
      `select ${COLUMNAS_CANDIDATO} from v_candidatos_renovacion
       where ultima_entrega_fecha between $1::date and $2::date`,
      [desde, hasta],
    );
    return filas.map(aCandidato);
  }

  async obtenerCandidato(clienteId: string): Promise<CandidatoRenovacion | null> {
    const filas = await consultar<FilaCandidato>(
      this.sql,
      "candidato renovacion",
      `select ${COLUMNAS_CANDIDATO} from v_candidatos_renovacion where cliente_id = $1`,
      [clienteId],
    );
    return filas[0] ? aCandidato(filas[0]) : null;
  }
}

export class PostgresOrganizacionRepository implements OrganizacionRepository {
  constructor(private readonly sql: Sql) {}

  async obtenerActual(): Promise<Organizacion> {
    const filas = await consultar<FilaConfiguracion>(
      this.sql,
      "obtener configuracion",
      `select nombre, telefono_whatsapp, idioma_default::text as idioma_default,
              plantilla_listo_es, plantilla_listo_pt, plantilla_renovacion_es, plantilla_renovacion_pt
       from configuracion where id = 1`,
    );
    if (!filas[0]) throw new ErrorPersistencia("obtener configuracion", "tabla configuracion vacía");
    return aOrganizacion(filas[0]);
  }

  async actualizar(c: CambiosOrganizacion): Promise<void> {
    await consultar(
      this.sql,
      "actualizar configuracion",
      `update configuracion set nombre = $1, telefono_whatsapp = $2, idioma_default = $3,
         plantilla_listo_es = $4, plantilla_listo_pt = $5, plantilla_renovacion_es = $6, plantilla_renovacion_pt = $7
       where id = 1`,
      [
        c.nombre,
        c.telefonoWhatsapp,
        c.idiomaDefault,
        c.plantillas.listo.es,
        c.plantillas.listo.pt,
        c.plantillas.renovacion.es,
        c.plantillas.renovacion.pt,
      ],
    );
  }
}

export interface UsuarioConHash extends UsuarioActual {
  email: string;
  passwordHash: string;
}

/** Usado só pela infra de autenticação (login e sessão). */
export class PostgresUsuarioRepository {
  constructor(private readonly sql: Sql) {}

  async obtenerActivoPorId(id: string): Promise<UsuarioActual | null> {
    const filas = await consultar<{ id: string; nombre: string; rol: Rol }>(
      this.sql,
      "obtener usuario",
      `select id, nombre, rol::text as rol from usuarios where id = $1 and activo`,
      [id],
    );
    return filas[0] ?? null;
  }

  async obtenerActivoPorEmail(email: string): Promise<UsuarioConHash | null> {
    const filas = await consultar<{ id: string; nombre: string; rol: Rol; email: string; password_hash: string }>(
      this.sql,
      "obtener usuario por email",
      `select id, nombre, rol::text as rol, email, password_hash from usuarios where email = $1 and activo`,
      [email.trim().toLowerCase()],
    );
    const f = filas[0];
    return f ? { id: f.id, nombre: f.nombre, rol: f.rol, email: f.email, passwordHash: f.password_hash } : null;
  }
}
