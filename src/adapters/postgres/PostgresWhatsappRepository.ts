import type { MensajeWhatsapp, NuevoMensajeWhatsapp, WhatsappRepository } from "@/ports";
import { iso } from "./mappers";
import { consultar, type Sql } from "./sql";

interface FilaMensaje {
  id: string;
  direccion: MensajeWhatsapp["direccion"];
  origen: MensajeWhatsapp["origen"];
  estado: MensajeWhatsapp["estado"];
  jid: string | null;
  whatsapp: string | null;
  cliente_id: string | null;
  cliente_nombre: string | null;
  nombre: string | null;
  texto: string;
  id_externo: string | null;
  error: string | null;
  requiere_atencion: boolean;
  created_at: Date | string;
}

const COLUMNAS_MENSAJE = `m.id, m.direccion::text as direccion, m.origen::text as origen, m.estado::text as estado,
  m.jid, m.whatsapp, m.cliente_id, c.nombre as cliente_nombre, m.nombre, m.texto, m.id_externo, m.error,
  m.requiere_atencion, m.created_at`;

function aMensaje(f: FilaMensaje): MensajeWhatsapp {
  return {
    id: f.id,
    direccion: f.direccion,
    origen: f.origen,
    estado: f.estado,
    jid: f.jid,
    whatsapp: f.whatsapp,
    clienteId: f.cliente_id,
    clienteNombre: f.cliente_nombre,
    nombre: f.nombre,
    texto: f.texto,
    idExterno: f.id_externo,
    error: f.error,
    requiereAtencion: f.requiere_atencion,
    createdAt: iso(f.created_at),
  };
}

/** Histórico das conversas e fila de envio do serviço do WhatsApp. */
export class PostgresWhatsappRepository implements WhatsappRepository {
  constructor(private readonly sql: Sql) {}

  async registrarMensaje(m: NuevoMensajeWhatsapp): Promise<string> {
    const [f] = await consultar<{ id: string }>(
      this.sql,
      "registrar mensaje whatsapp",
      `insert into mensajes_whatsapp (direccion, origen, estado, jid, whatsapp, cliente_id, nombre, texto, id_externo, enviado_en)
       values ($1, $2, $3::estado_mensaje, $4, $5, $6, $7, $8, $9, case when $3::estado_mensaje = 'enviado' then now() end)
       on conflict (id_externo) where id_externo is not null do nothing
       returning id`,
      [m.direccion, m.origen, m.estado, m.jid, m.whatsapp, m.clienteId, m.nombre, m.texto, m.idExterno ?? null],
    );
    return f?.id ?? "";
  }

  async existeIdExterno(idExterno: string): Promise<boolean> {
    const filas = await consultar(this.sql, "existe mensaje", "select 1 from mensajes_whatsapp where id_externo = $1", [
      idExterno,
    ]);
    return filas.length > 0;
  }

  async historial(jid: string, limite: number): Promise<MensajeWhatsapp[]> {
    const filas = await consultar<FilaMensaje>(
      this.sql,
      "historial whatsapp",
      `select * from (
         select ${COLUMNAS_MENSAJE} from mensajes_whatsapp m left join clientes c on c.id = m.cliente_id
          where m.jid = $1 order by m.created_at desc limit $2
       ) h order by created_at`,
      [jid, limite],
    );
    return filas.map(aMensaje);
  }

  async recientes(limite: number): Promise<MensajeWhatsapp[]> {
    const filas = await consultar<FilaMensaje>(
      this.sql,
      "mensajes recientes",
      `select ${COLUMNAS_MENSAJE} from mensajes_whatsapp m left join clientes c on c.id = m.cliente_id
        order by m.created_at desc limit $1`,
      [limite],
    );
    return filas.map(aMensaje);
  }

  async marcarAtencion(jid: string, requiere: boolean): Promise<void> {
    await consultar(
      this.sql,
      "atencion whatsapp",
      requiere
        ? `update mensajes_whatsapp set requiere_atencion = true
            where id = (select id from mensajes_whatsapp where jid = $1 and direccion = 'entrante'
                         order by created_at desc limit 1)`
        : "update mensajes_whatsapp set requiere_atencion = false where jid = $1 and requiere_atencion",
      [jid],
    );
  }

  async eliminarConversacion(jid: string): Promise<number> {
    // Avisos ainda sem endereço do WhatsApp aparecem na tela agrupados pelo número.
    const filas = await consultar(
      this.sql,
      "eliminar conversacion",
      "delete from mensajes_whatsapp where jid = $1 or (jid is null and whatsapp = $1) returning id",
      [jid],
    );
    return filas.length;
  }

  async contarChatsConAtencion(): Promise<number> {
    const [f] = await consultar<{ n: number | string }>(
      this.sql,
      "chats con atencion",
      "select count(distinct jid) as n from mensajes_whatsapp where requiere_atencion",
    );
    return Number(f?.n ?? 0);
  }
}
