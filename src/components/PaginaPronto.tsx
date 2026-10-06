import { Hammer, type LucideIcon } from "lucide-react";
import { EncabezadoPagina } from "@/components/gestion";
import type { Tono } from "@/components/visual";
import { t } from "@/i18n";

/** Módulo previsto no menu, ainda sem funcionalidade: diz o que vai ter, sem fingir que funciona. */
export function PaginaPronto({
  icono,
  tono,
  titulo,
  texto,
}: {
  icono: LucideIcon;
  tono: Tono;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina icono={icono} tono={tono} titulo={titulo} />
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Hammer className="size-7" />
        </span>
        <p className="font-semibold">{t.pronto.enConstruccion}</p>
        <p className="max-w-md text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}
