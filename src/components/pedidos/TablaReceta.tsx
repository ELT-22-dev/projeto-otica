import type { DatosReceta } from "@/domain/receta/Receta";
import { t } from "@/i18n";
import { formatearFecha } from "@/lib/format";

function grado(v: number | null): string {
  if (v === null) return "—";
  const s = v.toFixed(2).replace(".", ",");
  return v > 0 ? `+${s}` : s;
}

function simple(v: number | null, sufijo = ""): string {
  return v === null ? "—" : `${String(v).replace(".", ",")}${sufijo}`;
}

export function TablaReceta({ receta }: { receta: DatosReceta }) {
  return (
    <div className="flex max-w-lg flex-col gap-2 text-sm">
      <table className="w-full table-fixed text-center">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="w-12" />
            <th className="font-normal">{t.receta.esfera}</th>
            <th className="font-normal">{t.receta.cilindro}</th>
            <th className="font-normal">{t.receta.eje}</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          <tr>
            <th className="text-left font-sans text-xs">OD</th>
            <td>{grado(receta.odEsfera)}</td>
            <td>{grado(receta.odCilindro)}</td>
            <td>{simple(receta.odEje, "°")}</td>
          </tr>
          <tr>
            <th className="text-left font-sans text-xs">OI</th>
            <td>{grado(receta.oiEsfera)}</td>
            <td>{grado(receta.oiCilindro)}</td>
            <td>{simple(receta.oiEje, "°")}</td>
          </tr>
        </tbody>
      </table>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t.receta.adicion}</dt>
          <dd className="font-mono text-sm">{grado(receta.adicion)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t.receta.dnpOd}</dt>
          <dd className="font-mono text-sm">{simple(receta.dnpOd)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t.receta.dnpOi}</dt>
          <dd className="font-mono text-sm">{simple(receta.dnpOi)}</dd>
        </div>
      </dl>
      {(receta.observaciones || receta.fechaReceta) && (
        <p className="text-xs text-muted-foreground">
          {receta.fechaReceta && `${formatearFecha(receta.fechaReceta)} · `}
          {receta.observaciones}
        </p>
      )}
    </div>
  );
}
