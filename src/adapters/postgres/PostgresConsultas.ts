import { aCentavos } from "@/domain/shared/dinero";
import type { FechaISO } from "@/domain/shared/fecha";
import type { Idioma } from "@/domain/shared/idioma";
import type {
  AvisoConCliente,
  ClienteResumen,
  ConsultasRepository,
  PedidoConCliente,
  RecetaConCliente,
  VentasMes,
  VentasPorTipoLente,
} from "@/ports";
import {
  aNotificacion,
  aPedidoConCliente,
  aReceta,
  COLUMNAS_NOTIFICACION,
  COLUMNAS_PEDIDO_LISTA,
  COLUMNAS_RECETA,
  type FilaNotificacion,
  type FilaPedidoLista,
  type FilaReceta,
} from "./mappers";
import { consultar, escaparLike, type Sql } from "./sql";

/** "id, fecha::text as fecha" → "r.id, r.fecha::text as fecha", para usar em joins. */
function prefijar(columnas: string, alias: string): string {
  return columnas
    .split(",")
    .map((c) => `${alias}.${c.trim()}`)
    .join(", ");
}

const reales = (v: number | string | null) => aCentavos(Number(v ?? 0));

export class PostgresConsultas implements ConsultasRepository {
  constructor(private readonly sql: Sql) {}

  async listarClientes(filtro: { nombre?: string; telefono?: string; limite: number }): Promise<ClienteResumen[]> {
    const filas = await consultar<{
      id: string;
      nombre: string;
      whatsapp: string;
      idioma: Idioma;
      pedidos: number | string;
      ultimo_pedido: string | null;
    }>(
      this.sql,
      "listar clientes",
      `select c.id, c.nombre, c.whatsapp, c.idioma::text as idioma,
              count(p.id) filter (where p.status <> 'cancelado') as pedidos,
              max(p.fecha_pedido)::text as ultimo_pedido
         from clientes c
         left join pedidos p on p.cliente_id = c.id
        where ($1::text is null or c.nombre_busqueda like $1)
          and ($2::text is null or c.whatsapp like $2)
        group by c.id
        order by max(p.created_at) desc nulls last, c.nombre
        limit $3`,
      [
        filtro.nombre ? `%${escaparLike(filtro.nombre)}%` : null,
        filtro.telefono ? `%${escaparLike(filtro.telefono.replace(/\D/g, ""))}%` : null,
        filtro.limite,
      ],
    );
    return filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      whatsapp: f.whatsapp,
      idioma: f.idioma,
      pedidos: Number(f.pedidos),
      ultimoPedido: f.ultimo_pedido,
    }));
  }

  async contarClientes(): Promise<number> {
    const [f] = await consultar<{ n: number | string }>(
      this.sql,
      "contar clientes",
      "select count(*) as n from clientes",
    );
    return Number(f?.n ?? 0);
  }

  async recetasRecientes(limite: number): Promise<RecetaConCliente[]> {
    const filas = await consultar<FilaReceta & { cliente_nombre: string }>(
      this.sql,
      "recetas recientes",
      `select ${prefijar(COLUMNAS_RECETA, "r")}, c.nombre as cliente_nombre
         from recetas r join clientes c on c.id = r.cliente_id
        order by r.created_at desc limit $1`,
      [limite],
    );
    return filas.map((f) => ({ ...aReceta(f), clienteNombre: f.cliente_nombre }));
  }

  async avisosRecientes(limite: number): Promise<AvisoConCliente[]> {
    const filas = await consultar<FilaNotificacion & { cliente_nombre: string; pedido_numero: number | null }>(
      this.sql,
      "avisos recientes",
      `select ${prefijar(COLUMNAS_NOTIFICACION, "n")}, c.nombre as cliente_nombre, p.numero as pedido_numero
         from notificaciones n
         join clientes c on c.id = n.cliente_id
         left join pedidos p on p.id = n.pedido_id
        order by n.created_at desc limit $1`,
      [limite],
    );
    return filas.map((f) => ({
      ...aNotificacion(f),
      clienteNombre: f.cliente_nombre,
      pedidoNumero: f.pedido_numero === null ? null : Number(f.pedido_numero),
    }));
  }

  async listosSinAviso(): Promise<PedidoConCliente[]> {
    const filas = await consultar<FilaPedidoLista>(
      this.sql,
      "listos sin aviso",
      `select ${COLUMNAS_PEDIDO_LISTA} from v_pedidos_lista v
        where v.status = 'listo'
          and not exists (
            select 1 from notificaciones n
             where n.pedido_id = v.id and n.tipo = 'listo' and n.created_at >= v.fecha_listo
          )
        order by v.fecha_listo asc`,
    );
    return filas.map(aPedidoConCliente);
  }

  async ventasPorMes(desde: FechaISO): Promise<VentasMes[]> {
    const filas = await consultar<{ mes: string; pedidos: number | string; total: string; adelantos: string }>(
      this.sql,
      "ventas por mes",
      `select to_char(fecha_pedido, 'YYYY-MM') as mes, count(*) as pedidos,
              sum(valor_total) as total, sum(valor_adelanto) as adelantos
         from pedidos
        where status <> 'cancelado' and fecha_pedido >= $1::date
        group by 1 order by 1`,
      [desde],
    );
    return filas.map((f) => ({
      mes: f.mes,
      pedidos: Number(f.pedidos),
      total: reales(f.total),
      adelantos: reales(f.adelantos),
    }));
  }

  async ventasPorTipoLente(desde: FechaISO): Promise<VentasPorTipoLente[]> {
    const filas = await consultar<{ tipo: string | null; pedidos: number | string; total: string }>(
      this.sql,
      "ventas por tipo de lente",
      `select nullif(trim(tipo_lente), '') as tipo, count(*) as pedidos, sum(valor_total) as total
         from pedidos
        where status <> 'cancelado' and fecha_pedido >= $1::date
        group by 1 order by 2 desc, 3 desc limit 8`,
      [desde],
    );
    return filas.map((f) => ({ tipo: f.tipo, pedidos: Number(f.pedidos), total: reales(f.total) }));
  }

  async saldoCobradoAlEntregar(desde: FechaISO, hasta: FechaISO): Promise<number> {
    const [f] = await consultar<{ total: string | null }>(
      this.sql,
      "saldo cobrado al entregar",
      `select sum(valor_total - valor_adelanto) as total from pedidos
        where status = 'entregado'
          and (fecha_entregado at time zone 'America/Sao_Paulo')::date between $1::date and $2::date`,
      [desde, hasta],
    );
    return reales(f?.total ?? 0);
  }

  async avisosEnviadosDesde(desde: FechaISO): Promise<number> {
    const [f] = await consultar<{ n: number | string }>(
      this.sql,
      "avisos enviados",
      `select count(*) as n from notificaciones
        where (created_at at time zone 'America/Sao_Paulo')::date >= $1::date`,
      [desde],
    );
    return Number(f?.n ?? 0);
  }
}
