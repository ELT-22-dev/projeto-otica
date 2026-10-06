import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina, ListaPedidosMini } from "@/components/gestion";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: t.laboratorio.titulo };

const COLUMNAS = [
  { clave: "atrasados", titulo: t.laboratorio.atrasados, punto: "bg-red-500", fondo: "bg-red-50/60" },
  { clave: "hoy", titulo: t.laboratorio.hoy, punto: "bg-orange-500", fondo: "bg-orange-50/60" },
  { clave: "semana", titulo: t.laboratorio.semana, punto: "bg-amber-400", fondo: "bg-amber-50/50" },
  { clave: "despues", titulo: t.laboratorio.despues, punto: "bg-slate-400", fondo: "bg-slate-50" },
] as const;

export default async function PaginaLaboratorio() {
  const { hoy, grupos } = await (await casosDeUso()).obtenerLaboratorio();

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina
        icono={FlaskConical}
        tono="naranja"
        titulo={t.laboratorio.titulo}
        descripcion={t.laboratorio.descripcion}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {COLUMNAS.map(({ clave, titulo, punto, fondo }) => (
          <section key={clave} className={cn("flex flex-col gap-3 rounded-2xl p-3", fondo)}>
            <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
              <span className={cn("size-2.5 rounded-full", punto)} />
              {titulo}
              <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs tabular-nums shadow-xs">
                {grupos[clave].length}
              </span>
            </h2>
            <ListaPedidosMini pedidos={grupos[clave]} hoy={hoy} vacio={t.laboratorio.vacio} />
          </section>
        ))}
      </div>
    </div>
  );
}
