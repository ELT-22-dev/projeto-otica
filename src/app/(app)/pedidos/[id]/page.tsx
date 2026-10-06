import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccionesPedido } from "@/components/pedidos/AccionesPedido";
import { AccionesSecundarias } from "@/components/pedidos/AccionesSecundarias";
import { StatusBadge } from "@/components/pedidos/StatusBadge";
import { TablaReceta } from "@/components/pedidos/TablaReceta";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { estaAtrasado, saldoPendiente } from "@/domain/pedido/Pedido";
import { fechaLocal } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearFecha, formatearInstante, formatearReales } from "@/lib/format";
import { cn } from "@/lib/utils";
import { oNotFound } from "../../../_lib/o-not-found";

export const metadata: Metadata = { title: t.pedidos.titulo };

export default async function PaginaPedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pedido, receta } = await oNotFound((await casosDeUso()).obtenerPedido(id));
  const hoy = fechaLocal(new Date());
  const atrasado = estaAtrasado(pedido, hoy);
  const saldo = saldoPendiente(pedido);

  return (
    <div className="flex flex-col gap-4 lg:max-w-5xl lg:gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/pedidos?estado=${pedido.status === "cancelado" ? "en_laboratorio" : pedido.status}`}
          className="-ml-2 rounded-full p-2"
          aria-label={t.app.volver}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-xl font-semibold tracking-tight lg:text-2xl">
          {t.detalle.titulo(formatearNumeroPedido(pedido.numero))}
        </h1>
        <StatusBadge status={pedido.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <section className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t.detalle.cliente}</p>
              <p className="truncate text-lg font-semibold">{pedido.cliente.nombre}</p>
              <a
                href={`https://wa.me/${pedido.cliente.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-emerald-700"
              >
                <MessageCircle className="size-4" />
                {formatearWhatsapp(pedido.cliente.whatsapp)}
              </a>
            </div>
            <Link
              href={`/clientes/${pedido.cliente.id}`}
              className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium"
            >
              {t.detalle.verFicha}
            </Link>
          </section>

          <AccionesPedido pedidoId={pedido.id} status={pedido.status} className="lg:hidden" />

          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div>
              <p className="text-base font-medium">{pedido.descripcionArmazon}</p>
              {pedido.tipoLente && <p className="text-sm text-muted-foreground">{pedido.tipoLente}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Dato etiqueta={t.detalle.fechaPedido} valor={formatearFecha(pedido.fechaPedido)} />
              <Dato
                etiqueta={t.pedidos.entrega}
                valor={formatearFecha(pedido.fechaEntregaPrevista)}
                className={cn(atrasado && "text-red-700")}
                extra={atrasado ? t.pedidos.atrasado : undefined}
              />
              {pedido.fechaListo && (
                <Dato etiqueta={t.pedidos.listoDesde} valor={formatearInstante(pedido.fechaListo)} />
              )}
              {pedido.fechaEntregado && (
                <Dato etiqueta={t.pedidos.entregadoEl} valor={formatearInstante(pedido.fechaEntregado)} />
              )}
              <Dato etiqueta={t.detalle.total} valor={formatearReales(pedido.valorTotal)} />
              <Dato etiqueta={t.detalle.adelanto} valor={formatearReales(pedido.valorAdelanto)} />
              <Dato
                etiqueta={t.pedidos.saldo}
                valor={saldo > 0 ? formatearReales(saldo) : t.pedidos.pagado}
                className={cn("text-base font-semibold", saldo === 0 && "text-emerald-700")}
              />
            </dl>
          </section>

          {receta && (
            <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t.receta.titulo}</h2>
              <TablaReceta receta={receta} />
            </section>
          )}

          <section className="flex flex-col gap-2 pt-2 lg:hidden">
            <AccionesSecundarias pedidoId={pedido.id} status={pedido.status} />
          </section>
        </div>

        {/* PC: ações numa coluna fixa à direita */}
        <aside className="hidden lg:sticky lg:top-8 lg:flex lg:flex-col lg:gap-3 lg:rounded-xl lg:border lg:bg-card lg:p-4">
          <AccionesPedido pedidoId={pedido.id} status={pedido.status} />
          <AccionesSecundarias pedidoId={pedido.id} status={pedido.status} />
        </aside>
      </div>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  className,
  extra,
}: {
  etiqueta: string;
  valor: string;
  className?: string;
  extra?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className={className}>
        {valor}
        {extra && (
          <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">{extra}</span>
        )}
      </dd>
    </div>
  );
}
