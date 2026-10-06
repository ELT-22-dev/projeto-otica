import { BarChart3, ClipboardList, Glasses, Receipt, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina, TarjetaKpi } from "@/components/gestion";
import { TituloSeccion } from "@/components/visual";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearReales } from "@/lib/format";
import { soloAdmin } from "../../_lib/solo-admin";
import { exigirModulo } from "@/app/_lib/exigir-modulo";

export const metadata: Metadata = { title: t.reportes.titulo };

const nombreMes = new Intl.DateTimeFormat("es", { month: "short", timeZone: "UTC" });

function etiquetaMes(mes: string): string {
  return nombreMes.format(new Date(`${mes}-15T12:00:00Z`)).replace(".", "");
}

export default async function PaginaReportes() {
  exigirModulo("reportes");
  const r = await soloAdmin((await casosDeUso()).obtenerReportes());
  if (!r) return <p className="py-12 text-center text-sm text-muted-foreground">{t.ajustes.soloAdmin}</p>;

  const maxMes = Math.max(1, ...r.meses.map((m) => m.total));
  const maxTipo = Math.max(1, ...r.porTipo.map((x) => x.pedidos));

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina icono={BarChart3} tono="azul" titulo={t.reportes.titulo} descripcion={t.reportes.descripcion} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TarjetaKpi icono={TrendingUp} tono="esmeralda" titulo={t.reportes.total} valor={formatearReales(r.total)} />
        <TarjetaKpi icono={ClipboardList} tono="indigo" titulo={t.reportes.pedidos} valor={String(r.pedidos)} />
        <TarjetaKpi
          icono={Receipt}
          tono="ambar"
          titulo={t.reportes.ticketMedio}
          valor={formatearReales(r.ticketMedio)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Uma série (magnitude no tempo): um único tom, sem legenda; valor no hover e na tabela. */}
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs md:p-5">
          <TituloSeccion icono={TrendingUp} tono="violeta">
            {t.reportes.porMes}
          </TituloSeccion>
          <div
            className="flex h-56 items-end gap-2 border-b border-border pt-6"
            role="img"
            aria-label={t.reportes.porMes}
          >
            {r.meses.map((m) => (
              <div key={m.mes} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-md transition group-hover:opacity-100">
                  {formatearReales(m.total)} · {m.pedidos} {t.reportes.pedidos.toLowerCase()}
                </span>
                <div
                  className="w-full rounded-t-[4px] bg-violet-500 transition group-hover:bg-violet-600"
                  style={{ height: `${Math.max(m.total > 0 ? 2 : 0, (m.total / maxMes) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {r.meses.map((m) => (
              <span key={m.mes} className="flex-1 text-center text-xs text-muted-foreground capitalize">
                {etiquetaMes(m.mes)}
              </span>
            ))}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">{t.reportes.verTabla}</summary>
            <table className="mt-2 w-full text-left text-xs">
              <tbody className="divide-y">
                {r.meses.map((m) => (
                  <tr key={m.mes}>
                    <td className="py-1 capitalize">{etiquetaMes(m.mes)}</td>
                    <td className="py-1 text-right tabular-nums">{m.pedidos}</td>
                    <td className="py-1 text-right tabular-nums">{formatearReales(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        {/* Ranking: barras horizontais de um tom, rótulo e valor em texto neutro. */}
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs md:p-5">
          <TituloSeccion icono={Glasses} tono="cielo">
            {t.reportes.porTipo}
          </TituloSeccion>
          <ul className="flex flex-col gap-3">
            {r.porTipo.map((x) => (
              <li
                key={x.tipo ?? "-"}
                title={`${x.pedidos} · ${formatearReales(x.total)}`}
                className="flex flex-col gap-1"
              >
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{x.tipo ?? t.reportes.sinTipo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {x.pedidos} · {formatearReales(x.total)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-sky-500" style={{ width: `${(x.pedidos / maxTipo) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
