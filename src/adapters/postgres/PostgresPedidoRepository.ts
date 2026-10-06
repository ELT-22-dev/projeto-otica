import type { CambioStatus, Pedido } from "@/domain/pedido/Pedido";
import { STATUS_PEDIDO, type StatusPedido } from "@/domain/pedido/status-pedido";
import { aReales } from "@/domain/shared/dinero";
import type { FiltroPedidos, PedidoConCliente, PedidoRepository, RegistroPedido } from "@/ports";
import {
  aPedido,
  aPedidoConCliente,
  COLUMNAS_PEDIDO,
  COLUMNAS_PEDIDO_LISTA,
  recetaAJson,
  type FilaPedido,
  type FilaPedidoLista,
} from "./mappers";
import { consultar, escaparLike, type Sql } from "./sql";

const ORDEN_POR_STATUS: Record<StatusPedido, string> = {
  en_laboratorio: "fecha_entrega_prevista asc, created_at desc",
  listo: "fecha_listo asc, created_at desc",
  entregado: "fecha_entregado desc",
  cancelado: "created_at desc",
};

export class PostgresPedidoRepository implements PedidoRepository {
  constructor(private readonly sql: Sql) {}

  async registrar({ cliente, pedido, receta, creadoPor }: RegistroPedido) {
    const [fila] = await consultar<{ r: { pedido_id: string; numero: number; cliente_id: string } }>(
      this.sql,
      "registrar pedido",
      `select registrar_pedido($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb) as r`,
      [
        creadoPor,
        cliente.tipo === "existente" ? cliente.id : null,
        cliente.tipo === "nuevo" ? cliente.nombre : null,
        cliente.tipo === "nuevo" ? cliente.whatsapp : null,
        cliente.tipo === "nuevo" ? cliente.idioma : null,
        pedido.descripcionArmazon,
        pedido.tipoLente,
        aReales(pedido.valorTotal),
        aReales(pedido.valorAdelanto),
        pedido.fechaPedido,
        pedido.fechaEntregaPrevista,
        receta ? recetaAJson(receta) : null,
      ],
    );
    const r = typeof fila!.r === "string" ? JSON.parse(fila!.r) : fila!.r;
    return { pedidoId: r.pedido_id, numero: Number(r.numero), clienteId: r.cliente_id };
  }

  async obtenerPorId(id: string): Promise<PedidoConCliente | null> {
    const filas = await consultar<FilaPedidoLista>(
      this.sql,
      "obtener pedido",
      `select ${COLUMNAS_PEDIDO_LISTA} from v_pedidos_lista where id = $1`,
      [id],
    );
    return filas[0] ? aPedidoConCliente(filas[0]) : null;
  }

  async listar(filtro: FiltroPedidos): Promise<PedidoConCliente[]> {
    const params: unknown[] = [];
    const p = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };

    const criterios: string[] = [];
    if (filtro.nombre) criterios.push(`cliente_nombre_busqueda like ${p(`%${escaparLike(filtro.nombre)}%`)}`);
    if (filtro.telefono) criterios.push(`cliente_whatsapp like ${p(`%${escaparLike(filtro.telefono)}%`)}`);
    if (filtro.numero) criterios.push(`numero = ${p(filtro.numero)}`);

    const where: string[] = [];
    if (criterios.length > 0) where.push(`(${criterios.join(" or ")})`);
    if (filtro.status) where.push(`status = ${p(filtro.status)}`);

    const orden = filtro.status ? ORDEN_POR_STATUS[filtro.status] : "created_at desc";
    const filas = await consultar<FilaPedidoLista>(
      this.sql,
      "listar pedidos",
      `select ${COLUMNAS_PEDIDO_LISTA} from v_pedidos_lista
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by ${orden} limit ${p(filtro.limite)}`,
      params,
    );
    return filas.map(aPedidoConCliente);
  }

  async listarPorCliente(clienteId: string): Promise<Pedido[]> {
    const filas = await consultar<FilaPedido>(
      this.sql,
      "pedidos del cliente",
      `select ${COLUMNAS_PEDIDO} from pedidos where cliente_id = $1 order by created_at desc`,
      [clienteId],
    );
    return filas.map(aPedido);
  }

  async contarPorStatus(): Promise<Record<StatusPedido, number>> {
    const filas = await consultar<{ status: StatusPedido; n: number | string }>(
      this.sql,
      "contar pedidos",
      `select status::text as status, count(*) as n from pedidos group by status`,
    );
    const conteos = Object.fromEntries(STATUS_PEDIDO.map((s) => [s, 0])) as Record<StatusPedido, number>;
    for (const f of filas) conteos[f.status] = Number(f.n);
    return conteos;
  }

  async actualizarStatus(id: string, statusEsperado: StatusPedido, cambio: CambioStatus): Promise<boolean> {
    const filas = await consultar<{ id: string }>(
      this.sql,
      "actualizar status",
      `update pedidos set status = $1, fecha_listo = $2, fecha_entregado = $3
       where id = $4 and status = $5 returning id`,
      [cambio.status, cambio.fechaListo, cambio.fechaEntregado, id, statusEsperado],
    );
    return filas.length === 1;
  }
}
