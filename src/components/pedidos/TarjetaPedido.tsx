import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { PedidoConCliente } from "@/application";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { estaAtrasado, saldoPendiente } from "@/domain/pedido/Pedido";
import { t } from "@/i18n";
import { formatearFecha, formatearInstante, formatearReales } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AccionesPedido } from "./AccionesPedido";
import { BORDE_STATUS, StatusBadge } from "./StatusBadge";

export function TarjetaPedido({
  pedido,
  hoy,
  mostrarStatus,
}: {
  pedido: PedidoConCliente;
  hoy: string;
  mostrarStatus?: boolean;
}) {
  const saldo = saldoPendiente(pedido);
  const atrasado = estaAtrasado(pedido, hoy);

  return (
    <article className={cn("rounded-xl border border-l-4 bg-card shadow-xs", BORDE_STATUS[pedido.status])}>
      <Link href={`/pedidos/${pedido.id}`} className="flex items-start gap-3 p-3 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{formatearNumeroPedido(pedido.numero)}</span>
            {mostrarStatus && <StatusBadge status={pedido.status} />}
            {atrasado && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                {t.pedidos.atrasado}
              </span>
            )}
          </div>
          <h3 className="truncate text-base font-semibold">{pedido.cliente.nombre}</h3>
          <p className="truncate text-sm text-muted-foreground">{pedido.descripcionArmazon}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {pedido.status === "en_laboratorio" && (
              <span className={cn(atrasado && "font-medium text-red-700")}>
                {t.pedidos.entrega}: {formatearFecha(pedido.fechaEntregaPrevista)}
              </span>
            )}
            {pedido.status === "listo" && pedido.fechaListo && (
              <span>
                {t.pedidos.listoDesde}: {formatearInstante(pedido.fechaListo)}
              </span>
            )}
            {pedido.status === "entregado" && pedido.fechaEntregado && (
              <span>
                {t.pedidos.entregadoEl}: {formatearInstante(pedido.fechaEntregado)}
              </span>
            )}
            {pedido.status !== "entregado" && pedido.status !== "cancelado" && (
              <span className={cn(saldo > 0 ? "font-medium text-foreground" : "text-emerald-700")}>
                {saldo > 0 ? `${t.pedidos.saldo}: ${formatearReales(saldo)}` : t.pedidos.pagado}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="mt-5 size-5 shrink-0 text-muted-foreground" />
      </Link>
      {(pedido.status === "en_laboratorio" || pedido.status === "listo") && (
        <div className="px-3 pb-3">
          <AccionesPedido pedidoId={pedido.id} status={pedido.status} />
        </div>
      )}
    </article>
  );
}
