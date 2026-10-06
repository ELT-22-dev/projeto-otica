import { ArrowLeft, ChevronRight, ClipboardList, Eye, Languages, MessageCircle, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/pedidos/StatusBadge";
import { TablaReceta } from "@/components/pedidos/TablaReceta";
import { Avatar, TituloSeccion } from "@/components/visual";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearFecha, formatearInstante, formatearReales } from "@/lib/format";
import { oNotFound } from "../../../_lib/o-not-found";

export const metadata: Metadata = { title: t.detalle.cliente };

const VACIO = "rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground";

export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { cliente, pedidos, recetas, notificaciones } = await oNotFound((await casosDeUso()).obtenerFichaCliente(id));
  const numeroDe = new Map(pedidos.map((p) => [p.id, p.numero]));

  return (
    <div className="flex flex-col gap-5 lg:max-w-6xl lg:gap-6">
      <div className="flex items-center gap-2">
        <Link href="/pedidos" className="-ml-2 rounded-full p-2 hover:bg-muted" aria-label={t.app.volver}>
          <ArrowLeft className="size-5" />
        </Link>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:flex-row sm:items-center">
        <Avatar nombre={cliente.nombre} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{cliente.nombre}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <a
              href={`https://wa.me/${cliente.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100"
            >
              <MessageCircle className="size-4" />
              {formatearWhatsapp(cliente.whatsapp)}
            </a>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              <Languages className="size-4" />
              {t.nuevo.idiomas[cliente.idioma]}
            </span>
          </div>
          {cliente.notas && <p className="mt-2 text-sm text-muted-foreground">{cliente.notas}</p>}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 md:items-start lg:gap-6">
        <section className="flex flex-col gap-3">
          <TituloSeccion icono={ClipboardList} tono="violeta">
            {t.ficha.pedidos} ({pedidos.length})
          </TituloSeccion>
          <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
            {pedidos.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pedidos/${p.id}`}
                  className="flex items-center gap-3 p-4 transition hover:bg-violet-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{formatearNumeroPedido(p.numero)}</span>
                      <span>{formatearFecha(p.fechaPedido)}</span>
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

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <TituloSeccion icono={Eye} tono="rosa">
              {t.ficha.recetas}
            </TituloSeccion>
            {recetas.length === 0 ? (
              <p className={VACIO}>{t.receta.sinRecetas}</p>
            ) : (
              recetas.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-xs">
                  <p className="text-xs text-muted-foreground">
                    {formatearInstante(r.createdAt)}
                    {r.pedidoId && numeroDe.has(r.pedidoId) && ` · ${formatearNumeroPedido(numeroDe.get(r.pedidoId)!)}`}
                  </p>
                  <TablaReceta receta={r} />
                </div>
              ))
            )}
          </section>

          <section className="flex flex-col gap-3">
            <TituloSeccion icono={Send} tono="esmeralda">
              {t.ficha.avisos}
            </TituloSeccion>
            {notificaciones.length === 0 ? (
              <p className={VACIO}>{t.ficha.sinAvisos}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notificaciones.map((n) => (
                  <li key={n.id} className="rounded-2xl rounded-tl-sm border bg-emerald-50/40 p-3 text-sm">
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
      </div>
    </div>
  );
}
