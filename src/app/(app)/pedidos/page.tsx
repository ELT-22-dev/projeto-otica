import { Search, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TablaPedidos } from "@/components/pedidos/TablaPedidos";
import { TarjetaPedido } from "@/components/pedidos/TarjetaPedido";
import { Input } from "@/components/ui/input";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { fechaLocal } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: t.pedidos.titulo };

const PESTANAS = ["en_laboratorio", "listo", "entregado"] as const satisfies readonly StatusPedido[];
type Pestana = (typeof PESTANAS)[number];

const COLOR_PESTANA: Record<Pestana, string> = {
  en_laboratorio: "data-[activa=true]:bg-amber-100 data-[activa=true]:text-amber-900",
  listo: "data-[activa=true]:bg-emerald-100 data-[activa=true]:text-emerald-900",
  entregado: "data-[activa=true]:bg-zinc-200 data-[activa=true]:text-zinc-800",
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
  const [pedidos, conteos] = await Promise.all([
    casos.listarPedidos({ status: estado, busqueda: busqueda || undefined }),
    casos.contarPedidosPorStatus(),
  ]);
  const hoy = fechaLocal(new Date());

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="hidden text-2xl font-semibold tracking-tight lg:block">{t.pedidos.titulo}</h1>
        <form action="/pedidos" className="relative lg:w-96" title={t.pedidos.atajoBusqueda}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <input type="hidden" name="estado" value={estado} />
          <Input
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder={t.pedidos.buscar}
            className="h-12 rounded-xl bg-card pl-10 text-base lg:h-10 lg:text-sm"
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
        <nav className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 lg:max-w-xl" aria-label={t.pedidos.titulo}>
          {PESTANAS.map((p) => (
            <Link
              key={p}
              href={`/pedidos?estado=${p}`}
              data-activa={p === estado}
              className={cn(
                "flex flex-col items-center rounded-lg px-1 py-2 text-xs font-medium text-muted-foreground transition sm:text-sm",
                COLOR_PESTANA[p],
              )}
            >
              <span className="text-lg leading-none font-semibold">{conteos[p]}</span>
              {t.pestanas[p]}
            </Link>
          ))}
        </nav>
      )}

      {pedidos.length === 0 ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          {busqueda ? t.pedidos.vacio.busqueda : t.pedidos.vacio[estado]}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:hidden">
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
