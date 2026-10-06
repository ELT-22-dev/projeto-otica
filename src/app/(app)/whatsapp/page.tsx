import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirModulo } from "@/app/_lib/exigir-modulo";
import { PanelPorAvisar } from "@/components/avisos/PanelPorAvisar";
import { EncabezadoPagina } from "@/components/gestion";
import { Avatar, TituloSeccion } from "@/components/visual";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearInstante } from "@/lib/format";

export const metadata: Metadata = { title: t.crm.titulo };

export default async function PaginaAvisos() {
  exigirModulo("whatsapp");
  const casos = await casosDeUso();
  const [crm, porAvisar] = await Promise.all([casos.obtenerCrm(), casos.obtenerPorAvisar()]);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina
        icono={MessageCircle}
        tono="verde"
        titulo={t.crm.titulo}
        descripcion={t.crm.descripcion}
        extra={
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green-50 px-3 py-1.5 text-sm text-green-700 ring-1 ring-green-200">
            <Send className="size-4" />
            {t.crm.avisosHoy(crm.avisosHoy)}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        {porAvisar.total > 0 ? (
          <PanelPorAvisar datos={porAvisar} hoy={crm.hoy} />
        ) : (
          <div className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 className="size-6 shrink-0" />
            <p className="font-medium">{t.inicio.todoAlDia}</p>
          </div>
        )}

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
