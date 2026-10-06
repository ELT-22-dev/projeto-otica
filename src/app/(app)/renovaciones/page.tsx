import type { Metadata } from "next";
import Link from "next/link";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { fechaLocal, mesesCompletosEntre } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearInstante } from "@/lib/format";
import { BotonAvisarRenovacion } from "./BotonAvisarRenovacion";

export const metadata: Metadata = { title: t.renovaciones.titulo };

export default async function PaginaRenovaciones() {
  const clientes = await (await casosDeUso()).listarRenovaciones();
  const hoy = fechaLocal(new Date());

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">{t.renovaciones.titulo}</h1>
        <p className="text-sm text-muted-foreground">{t.renovaciones.descripcion}</p>
      </div>

      {clientes.length === 0 ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          {t.renovaciones.vacio}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c) => (
            <li key={c.clienteId} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <Link href={`/clientes/${c.clienteId}`} className="min-w-0">
                <p className="truncate text-base font-semibold">{c.nombre}</p>
                <p className="text-sm text-muted-foreground">{formatearWhatsapp(c.whatsapp)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.renovaciones.ultimaEntrega}: {formatearInstante(c.ultimaEntrega)} (
                  {t.renovaciones.hace(mesesCompletosEntre(fechaLocal(c.ultimaEntrega), hoy))})
                </p>
              </Link>
              <BotonAvisarRenovacion
                clienteId={c.clienteId}
                avisadoEl={c.yaAvisado && c.ultimoAvisoRenovacion ? formatearInstante(c.ultimoAvisoRenovacion) : null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
