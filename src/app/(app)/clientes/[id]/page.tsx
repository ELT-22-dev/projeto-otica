import { ArrowLeft, ChevronRight, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/pedidos/StatusBadge";
import { TablaReceta } from "@/components/pedidos/TablaReceta";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearFecha, formatearInstante, formatearReales } from "@/lib/format";
import { oNotFound } from "../../../_lib/o-not-found";

export const metadata: Metadata = { title: t.detalle.cliente };

export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { cliente, pedidos, recetas, notificaciones } = await oNotFound((await casosDeUso()).obtenerFichaCliente(id));
  const numeroDe = new Map(pedidos.map((p) => [p.id, p.numero]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2">
        <Link href="/pedidos" className="-ml-2 rounded-full p-2" aria-label={t.app.volver}>
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{cliente.nombre}</h1>
          <a
            href={`https://wa.me/${cliente.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-emerald-700"
          >
            <MessageCircle className="size-4" />
            {formatearWhatsapp(cliente.whatsapp)}
          </a>
          <p className="text-xs text-muted-foreground">{t.nuevo.idiomas[cliente.idioma]}</p>
          {cliente.notas && <p className="mt-1 text-sm">{cliente.notas}</p>}
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.ficha.pedidos} ({pedidos.length})
        </h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link href={`/pedidos/${p.id}`} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{formatearNumeroPedido(p.numero)}</span>
                    <span className="text-xs text-muted-foreground">{formatearFecha(p.fechaPedido)}</span>
                  </div>
                  <p className="truncate text-sm font-medium">{p.descripcionArmazon}</p>
                  <p className="text-xs text-muted-foreground">{formatearReales(p.valorTotal)}</p>
                </div>
                <StatusBadge status={p.status} />
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t.ficha.recetas}</h2>
        {recetas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.receta.sinRecetas}</p>
        ) : (
          recetas.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {formatearInstante(r.createdAt)}
                {r.pedidoId && numeroDe.has(r.pedidoId) && ` · ${formatearNumeroPedido(numeroDe.get(r.pedidoId)!)}`}
              </p>
              <TablaReceta receta={r} />
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t.ficha.avisos}</h2>
        {notificaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.ficha.sinAvisos}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notificaciones.map((n) => (
              <li key={n.id} className="rounded-xl border bg-card p-3 text-sm">
                <p className="mb-1 text-xs text-muted-foreground">
                  {formatearInstante(n.createdAt)} · {t.ficha.tipoAviso[n.tipo]}
                </p>
                <p className="whitespace-pre-line">{n.mensaje}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
