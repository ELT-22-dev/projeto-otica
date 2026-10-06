import { CalendarDays, ClipboardList, Search, Users, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/gestion";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/visual";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearFecha } from "@/lib/format";
import { exigirModulo } from "@/app/_lib/exigir-modulo";

export const metadata: Metadata = { title: t.clientes.titulo };

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  exigirModulo("clientes");
  const q = String((await searchParams).q ?? "")
    .slice(0, 60)
    .trim();
  const clientes = await (await casosDeUso()).listarClientes(q);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina
        icono={Users}
        tono="cielo"
        titulo={t.clientes.titulo}
        descripcion={t.clientes.descripcion(clientes.length)}
        extra={
          <form action="/clientes" className="relative md:w-96">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t.clientes.buscar}
              autoComplete="off"
              enterKeyHint="search"
              className="h-12 rounded-2xl bg-card pl-11 text-base shadow-xs md:h-11 md:text-sm"
            />
            {q && (
              <Link
                href="/clientes"
                aria-label={t.app.cancelar}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-muted-foreground"
              >
                <X className="size-4" />
              </Link>
            )}
          </form>
        }
      />

      {clientes.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card/50 py-14 text-center text-sm text-muted-foreground">
          {t.clientes.vacio}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Avatar nombre={c.nombre} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nombre}</p>
                  <p className="text-sm text-muted-foreground">{formatearWhatsapp(c.whatsapp)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                      <ClipboardList className="size-3.5" />
                      {t.clientes.pedidos(c.pedidos)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {c.ultimoPedido ? formatearFecha(c.ultimoPedido) : t.clientes.sinPedidos}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
