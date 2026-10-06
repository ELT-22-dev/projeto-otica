import { Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/gestion";
import { TablaReceta } from "@/components/pedidos/TablaReceta";
import { Avatar } from "@/components/visual";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearInstante } from "@/lib/format";

export const metadata: Metadata = { title: t.recetas.titulo };

export default async function PaginaRecetas() {
  const recetas = await (await casosDeUso()).listarRecetas();

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina icono={Eye} tono="rosa" titulo={t.recetas.titulo} descripcion={t.recetas.descripcion} />
      {recetas.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card/50 py-14 text-center text-sm text-muted-foreground">
          {t.recetas.vacio}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {recetas.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
              <Link href={`/clientes/${r.clienteId}`} className="flex items-center gap-3">
                <Avatar nombre={r.clienteNombre} className="size-9 text-xs" />
                <div className="min-w-0">
                  <p className="truncate font-semibold hover:underline">{r.clienteNombre}</p>
                  <p className="text-xs text-muted-foreground">{formatearInstante(r.createdAt)}</p>
                </div>
              </Link>
              <TablaReceta receta={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
