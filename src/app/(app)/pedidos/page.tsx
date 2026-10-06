import { CheckCircle2, FlaskConical, PackageCheck, Search, X, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TablaPedidos } from "@/components/pedidos/TablaPedidos";
import { TarjetaPedido } from "@/components/pedidos/TarjetaPedido";
import { Input } from "@/components/ui/input";
import { primerNombre } from "@/domain/cliente/Cliente";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { fechaLocal } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearFechaLarga } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: t.pedidos.titulo };

const PESTANAS = ["en_laboratorio", "listo", "entregado"] as const satisfies readonly StatusPedido[];
type Pestana = (typeof PESTANAS)[number];

/** Cartões de status: âmbar (laboratório), verde (pronto), cinza (entregue). */
const ESTILO_PESTANA: Record<Pestana, { Icono: LucideIcon; activa: string; icono: string }> = {
  en_laboratorio: {
    Icono: FlaskConical,
    activa: "border-amber-300 bg-amber-50 ring-4 ring-amber-100",
    icono: "bg-amber-100 text-amber-700",
  },
  listo: {
    Icono: PackageCheck,
    activa: "border-emerald-300 bg-emerald-50 ring-4 ring-emerald-100",
    icono: "bg-emerald-100 text-emerald-700",
  },
  entregado: {
    Icono: CheckCircle2,
    activa: "border-slate-300 bg-slate-50 ring-4 ring-slate-100",
    icono: "bg-slate-100 text-slate-600",
  },
};

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function PaginaPedidos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const estadoParam = texto(params.estado);
  const estado: Pestana = (PESTANAS as readonly string[]).includes(estadoParam)
    ? (estadoParam as Pestana)
    : "en_laboratorio";
  const busqueda = texto(params.q).slice(0, 60);

  const casos = await casosDeUso();
  const [pedidos, conteos, contexto] = await Promise.all([
    casos.listarPedidos({ status: estado, busqueda: busqueda || undefined }),
    casos.contarPedidosPorStatus(),
    casos.obtenerContexto(),
  ]);
  const ahora = new Date();
  const hoy = fechaLocal(ahora);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{formatearFechaLarga(ahora)}</p>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            {t.pedidos.saludo(primerNombre(contexto?.usuario.nombre ?? ""))}
          </h1>
        </div>
        <form action="/pedidos" className="relative md:w-96" title={t.pedidos.atajoBusqueda}>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <input type="hidden" name="estado" value={estado} />
          <Input
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder={t.pedidos.buscar}
            className="h-12 rounded-2xl bg-card pl-11 text-base shadow-xs md:h-11 md:text-sm"
            enterKeyHint="search"
            autoComplete="off"
          />
          {busqueda && (
            <Link
              href={`/pedidos?estado=${estado}`}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-muted-foreground"
              aria-label={t.app.cancelar}
            >
              <X className="size-4" />
            </Link>
          )}
        </form>
      </div>

      {busqueda ? (
        <p className="text-sm text-muted-foreground">{t.pedidos.resultados(pedidos.length)}</p>
      ) : (
        <nav className="grid grid-cols-3 gap-2 md:gap-3 lg:max-w-3xl" aria-label={t.pedidos.titulo}>
          {PESTANAS.map((p) => {
            const { Icono, activa, icono } = ESTILO_PESTANA[p];
            const esActiva = p === estado;
            return (
              <Link
                key={p}
                href={`/pedidos?estado=${p}`}
                aria-current={esActiva ? "page" : undefined}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border bg-card p-3 transition md:flex-row md:items-center md:gap-3 md:p-4",
                  esActiva ? activa : "hover:border-foreground/15 hover:shadow-sm",
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl md:size-11", icono)}>
                  <Icono className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-2xl leading-none font-semibold tabular-nums">{conteos[p]}</span>
                  <span className="mt-1 text-xs text-muted-foreground md:text-sm">{t.pestanas[p]}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {pedidos.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card/50 py-14 text-center text-sm text-muted-foreground">
          {busqueda ? t.pedidos.vacio.busqueda : t.pedidos.vacio[estado]}
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:hidden">
            {pedidos.map((p) => (
              <TarjetaPedido key={p.id} pedido={p} hoy={hoy} mostrarStatus={Boolean(busqueda)} />
            ))}
          </div>
          <div className="hidden lg:block">
            <TablaPedidos pedidos={pedidos} hoy={hoy} mostrarStatus={Boolean(busqueda)} />
          </div>
        </>
      )}
    </div>
  );
}
