import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { PedidoConCliente } from "@/application";
import { Avatar } from "@/components/visual";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { estaAtrasado, saldoPendiente } from "@/domain/pedido/Pedido";
import { t } from "@/i18n";
import { formatearFecha, formatearInstante, formatearReales } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AccionesPedido } from "./AccionesPedido";
import { StatusBadge } from "./StatusBadge";

function FechaRelevante({ pedido, hoy }: { pedido: PedidoConCliente; hoy: string }) {
  if (pedido.status === "listo" && pedido.fechaListo) {
    return (
      <span>
        {t.pedidos.listoDesde} {formatearInstante(pedido.fechaListo)}
      </span>
    );
  }
  if (pedido.status === "entregado" && pedido.fechaEntregado) {
    return <span>{formatearInstante(pedido.fechaEntregado)}</span>;
  }
  const atrasado = estaAtrasado(pedido, hoy);
  return (
    <span className={cn(atrasado && "font-medium text-red-700")}>
      {formatearFecha(pedido.fechaEntregaPrevista)}
      {atrasado && (
        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          {t.pedidos.atrasado}
        </span>
      )}
    </span>
  );
}

/** Versão PC da lista: mais pedidos visíveis de uma vez, ações na própria linha. */
export function TablaPedidos({
  pedidos,
  hoy,
  mostrarStatus,
}: {
  pedidos: PedidoConCliente[];
  hoy: string;
  mostrarStatus?: boolean;
}) {
  const col = t.pedidos.columnas;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="w-20 px-4 py-2.5 font-medium">{col.numero}</th>
            <th className="px-4 py-2.5 font-medium">{col.cliente}</th>
            <th className="px-4 py-2.5 font-medium">{col.pedido}</th>
            <th className="px-4 py-2.5 font-medium">{col.fecha}</th>
            <th className="px-4 py-2.5 text-right font-medium">{col.saldo}</th>
            {mostrarStatus && <th className="px-4 py-2.5 font-medium">{col.estado}</th>}
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {pedidos.map((p) => {
            const saldo = saldoPendiente(p);
            return (
              <tr key={p.id} className="transition hover:bg-tema-50/40">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  <Link href={`/pedidos/${p.id}`} className="hover:underline">
                    {formatearNumeroPedido(p.numero)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar nombre={p.cliente.nombre} className="size-9 text-xs" />
                    <div className="min-w-0">
                      <Link href={`/pedidos/${p.id}`} className="font-medium hover:underline">
                        {p.cliente.nombre}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatearWhatsapp(p.cliente.whatsapp)}</p>
                    </div>
                  </div>
                </td>
                <td className="max-w-64 px-4 py-3">
                  <p className="truncate">{p.descripcionArmazon}</p>
                  {p.tipoLente && <p className="truncate text-xs text-muted-foreground">{p.tipoLente}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <FechaRelevante pedido={p} hoy={hoy} />
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right whitespace-nowrap tabular-nums",
                    saldo > 0 ? "font-medium" : "text-emerald-700",
                  )}
                >
                  {saldo > 0 ? formatearReales(saldo) : t.pedidos.pagado}
                </td>
                {mostrarStatus && (
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {(p.status === "en_laboratorio" || p.status === "listo") && (
                      <AccionesPedido pedidoId={p.id} status={p.status} compacto />
                    )}
                    <Link
                      href={`/pedidos/${p.id}`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                      aria-label={t.detalle.verPedido}
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
