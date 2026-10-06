import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { PedidoConCliente } from "@/application";
import { AccionesPedido } from "@/components/pedidos/AccionesPedido";
import { Avatar, TONOS, type Tono } from "@/components/visual";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { estaAtrasado, saldoPendiente } from "@/domain/pedido/Pedido";
import { t } from "@/i18n";
import { formatearFecha, formatearInstante, formatearReales } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Título de página com ícone colorido da seção. */
export function EncabezadoPagina({
  icono: Icono,
  tono,
  titulo,
  descripcion,
  extra,
}: {
  icono: LucideIcon;
  tono: Tono;
  titulo: string;
  descripcion?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONOS[tono])}>
          <Icono className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{titulo}</h1>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
      </div>
      {extra}
    </div>
  );
}

/** Indicador grande e colorido; vira link quando há para onde ir. */
export function TarjetaKpi({
  icono: Icono,
  tono,
  titulo,
  valor,
  detalle,
  href,
}: {
  icono: LucideIcon;
  tono: Tono;
  titulo: string;
  valor: string;
  detalle?: string;
  href?: string;
}) {
  const contenido = (
    <>
      <span className={cn("flex size-10 items-center justify-center rounded-xl", TONOS[tono])}>
        <Icono className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground md:text-sm">{titulo}</p>
        <p className="truncate text-xl font-semibold tabular-nums md:text-2xl">{valor}</p>
        {detalle && <p className="truncate text-xs text-muted-foreground">{detalle}</p>}
      </div>
    </>
  );
  const clase = "flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs";
  return href ? (
    <Link href={href} className={cn(clase, "transition hover:-translate-y-0.5 hover:shadow-md")}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

/** Lista curta de pedidos com a ação do momento (Listo y avisar / Avisar / Entregado). */
export function ListaPedidosMini({
  pedidos,
  hoy,
  vacio,
  mostrar = "entrega",
}: {
  pedidos: PedidoConCliente[];
  hoy: string;
  vacio: string;
  mostrar?: "entrega" | "listo" | "saldo";
}) {
  if (pedidos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{vacio}</p>
    );
  }
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
      {pedidos.map((p) => {
        const atrasado = estaAtrasado(p, hoy);
        const dato =
          mostrar === "saldo"
            ? formatearReales(saldoPendiente(p))
            : mostrar === "listo" && p.fechaListo
              ? `${t.pedidos.listoDesde} ${formatearInstante(p.fechaListo)}`
              : formatearFecha(p.fechaEntregaPrevista);
        return (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
            <Link href={`/pedidos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar nombre={p.cliente.nombre} className="size-9 text-xs" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {p.cliente.nombre}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {formatearNumeroPedido(p.numero)}
                  </span>
                </p>
                <p className={cn("truncate text-xs text-muted-foreground", atrasado && "font-medium text-red-700")}>
                  {p.descripcionArmazon} · {dato}
                </p>
              </div>
            </Link>
            {(p.status === "en_laboratorio" || p.status === "listo") && mostrar !== "saldo" ? (
              <AccionesPedido pedidoId={p.id} status={p.status} compacto />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
