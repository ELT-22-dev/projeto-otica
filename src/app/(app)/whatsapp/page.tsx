import { BellRing, ChevronRight, MessageCircle, RefreshCcw, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina, ListaPedidosMini } from "@/components/gestion";
import { Avatar, TituloSeccion } from "@/components/visual";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearInstante } from "@/lib/format";

export const metadata: Metadata = { title: t.crm.titulo };

export default async function PaginaCrm() {
  const crm = await (await casosDeUso()).obtenerCrm();

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina
        icono={MessageCircle}
        tono="verde"
        titulo={t.crm.titulo}
        descripcion={t.crm.descripcion}
        extra={
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-green-700 ring-1 ring-green-200">
              <Send className="size-4" />
              {t.crm.avisosHoy(crm.avisosHoy)}
            </span>
            <Link
              href="/renovaciones"
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
            >
              <RefreshCcw className="size-4" />
              {t.crm.renovaciones(crm.renovacionesPendientes)}
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="flex flex-col gap-3">
          <TituloSeccion icono={BellRing} tono="esmeralda">
            {t.crm.sinAviso} ({crm.listosSinAviso.length})
          </TituloSeccion>
          <ListaPedidosMini pedidos={crm.listosSinAviso} hoy={crm.hoy} vacio={t.crm.todosAvisados} mostrar="listo" />
        </section>

        <section className="flex flex-col gap-3">
          <TituloSeccion icono={MessageCircle} tono="verde">
            {t.crm.historial}
          </TituloSeccion>
          {crm.avisos.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {t.crm.sinHistorial}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {crm.avisos.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <Avatar nombre={a.clienteNombre} className="size-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      <Link href={`/clientes/${a.clienteId}`} className="font-medium text-foreground hover:underline">
                        {a.clienteNombre}
                      </Link>{" "}
                      · {formatearInstante(a.createdAt)} · {t.ficha.tipoAviso[a.tipo]}
                      {a.pedidoNumero !== null && ` · ${formatearNumeroPedido(a.pedidoNumero)}`}
                    </p>
                    <p className="mt-1 rounded-2xl rounded-tl-sm bg-green-50 px-3 py-2 text-sm whitespace-pre-line ring-1 ring-green-100">
                      {a.mensaje}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
