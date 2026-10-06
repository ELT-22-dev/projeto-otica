import { CalendarClock, ChevronRight, Wallet } from "lucide-react";
import Link from "next/link";
import type { PedidoConCliente } from "@/application";
import { Avatar } from "@/components/visual";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { estaAtrasado, saldoPendiente } from "@/domain/pedido/Pedido";
import { t } from "@/i18n";
import { formatearFecha, formatearInstante, formatearReales } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AccionesPedido } from "./AccionesPedido";
import { StatusBadge } from "./StatusBadge";

/** Cartão de pedido para celular e tablet. */
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
  const abierto = pedido.status === "en_laboratorio" || pedido.status === "listo";

  const fecha =
    pedido.status === "listo" && pedido.fechaListo
      ? `${t.pedidos.listoDesde} ${formatearInstante(pedido.fechaListo)}`
      : pedido.status === "entregado" && pedido.fechaEntregado
        ? `${t.pedidos.entregadoEl} ${formatearInstante(pedido.fechaEntregado)}`
        : `${t.pedidos.entrega} ${formatearFecha(pedido.fechaEntregaPrevista)}`;

  return (
    <article className="flex flex-col rounded-2xl border bg-card shadow-xs transition hover:shadow-md">
      <Link href={`/pedidos/${pedido.id}`} className="flex items-start gap-3 p-4 pb-3">
        <Avatar nombre={pedido.cliente.nombre} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate font-semibold">{pedido.cliente.nombre}</h3>
            <span className="font-mono text-xs text-muted-foreground">{formatearNumeroPedido(pedido.numero)}</span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{pedido.descripcionArmazon}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {mostrarStatus && <StatusBadge status={pedido.status} />}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                atrasado ? "bg-red-50 font-medium text-red-700" : "bg-muted text-muted-foreground",
              )}
            >
              <CalendarClock className="size-3.5" />
              {fecha}
              {atrasado && ` · ${t.pedidos.atrasado}`}
            </span>
            {abierto && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                  saldo > 0 ? "bg-violet-50 font-medium text-violet-700" : "bg-emerald-50 text-emerald-700",
                )}
              >
                <Wallet className="size-3.5" />
                {saldo > 0 ? `${t.pedidos.saldo} ${formatearReales(saldo)}` : t.pedidos.pagado}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
      </Link>
      {abierto && (
        <div className="mt-auto px-4 pb-4">
          <AccionesPedido pedidoId={pedido.id} status={pedido.status} />
        </div>
      )}
    </article>
  );
}
