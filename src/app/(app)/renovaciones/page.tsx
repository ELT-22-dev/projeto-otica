import { CalendarHeart, RefreshCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, IconoTono } from "@/components/visual";
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
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex items-start gap-3">
        <IconoTono icono={RefreshCcw} tono="rosa" className="size-11 rounded-xl" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{t.renovaciones.titulo}</h1>
          <p className="text-sm text-muted-foreground">{t.renovaciones.descripcion}</p>
        </div>
      </div>

      {clientes.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card/50 py-14 text-center text-sm text-muted-foreground">
          {t.renovaciones.vacio}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c) => (
            <li
              key={c.clienteId}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs transition hover:shadow-md"
            >
              <Link href={`/clientes/${c.clienteId}`} className="flex min-w-0 items-center gap-3">
                <Avatar nombre={c.nombre} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.nombre}</p>
                  <p className="text-sm text-muted-foreground">{formatearWhatsapp(c.whatsapp)}</p>
                </div>
              </Link>
              <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-pink-50 px-2.5 py-1 text-xs text-pink-700">
                <CalendarHeart className="size-3.5" />
                {t.renovaciones.ultimaEntrega}: {formatearInstante(c.ultimaEntrega)} ·{" "}
                {t.renovaciones.hace(mesesCompletosEntre(fechaLocal(c.ultimaEntrega), hoy))}
              </p>
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
