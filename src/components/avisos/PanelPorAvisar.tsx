import { BellRing, Glasses, RefreshCcw } from "lucide-react";
import Link from "next/link";
import type { PorAvisar } from "@/application";
import { Avatar } from "@/components/visual";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { fechaLocal, mesesCompletosEntre } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { formatearInstante } from "@/lib/format";
import { AyudaAviso, BotonAvisar } from "./BotonAvisar";

/** O "sinal": quem está esperando aviso agora, com o botão de um toque em cada linha. */
export function PanelPorAvisar({ datos, hoy }: { datos: PorAvisar; hoy: string }) {
  if (datos.total === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
          <BellRing className="size-5" />
          <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold ring-2 ring-white">
            {datos.total}
          </span>
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t.porAvisar.resumen(datos.total)}</h2>
          <p className="text-sm text-emerald-900/70">
            <AyudaAviso />
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {datos.listos.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-xs">
            <Link href={`/pedidos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar nombre={p.cliente.nombre} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-medium">{p.cliente.nombre}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                    <Glasses className="size-3.5" />
                    {t.porAvisar.listo}
                  </span>
                  <span className="truncate">
                    {formatearNumeroPedido(p.numero)}
                    {p.fechaListo && ` · ${formatearInstante(p.fechaListo)}`}
                  </span>
                </p>
              </div>
            </Link>
            <BotonAvisar tipo="listo" id={p.id} />
          </li>
        ))}
        {datos.renovaciones.map((r) => (
          <li key={r.clienteId} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-xs">
            <Link href={`/clientes/${r.clienteId}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar nombre={r.nombre} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-medium">{r.nombre}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 font-medium text-pink-800">
                    <RefreshCcw className="size-3.5" />
                    {t.porAvisar.renovacion}
                  </span>
                  <span className="truncate">
                    {t.porAvisar.hace(mesesCompletosEntre(fechaLocal(r.ultimaEntrega), hoy))}
                  </span>
                </p>
              </div>
            </Link>
            <BotonAvisar tipo="renovacion" id={r.clienteId} />
          </li>
        ))}
      </ul>
    </section>
  );
}
