import { CalendarDays, MessageCircle, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirModulo } from "@/app/_lib/exigir-modulo";
import { EncabezadoPagina } from "@/components/gestion";
import { Avatar, TituloSeccion } from "@/components/visual";
import type { Cita } from "@/domain/cita/Cita";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { sumarDias } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearInstante } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BotonEstadoCita, BotonHorario, BotonNuevaCita, type CitaVista } from "./AgendaCliente";

export const metadata: Metadata = { title: t.agenda.titulo };

const vista = (c: Cita): CitaVista => ({
  id: c.id,
  nombre: c.nombre,
  whatsapp: c.whatsapp,
  fecha: c.fecha,
  hora: c.hora,
  preferencia: c.preferencia,
});

function tituloDia(fecha: string, hoy: string): string {
  const dia = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));
  if (fecha === hoy) return `${t.agenda.hoy} · ${dia}`;
  if (fecha === sumarDias(hoy, 1)) return `${t.agenda.manana} · ${dia}`;
  return dia;
}

function Nombre({ cita }: { cita: Cita }) {
  return cita.clienteId ? (
    <Link href={`/clientes/${cita.clienteId}`} className="truncate font-medium hover:underline">
      {cita.nombre}
    </Link>
  ) : (
    <span className="truncate font-medium">{cita.nombre}</span>
  );
}

function BotonEscribir({ whatsapp }: { whatsapp: string | null }) {
  if (!whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      title={formatearWhatsapp(whatsapp)}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-green-700 hover:bg-green-50"
    >
      <MessageCircle className="size-4" />
      {t.agenda.escribir}
    </a>
  );
}

export default async function PaginaAgenda() {
  exigirModulo("agenda");
  const agenda = await (await casosDeUso()).obtenerAgenda();
  const { hoy } = agenda;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina
        icono={CalendarDays}
        tono="cielo"
        titulo={t.agenda.titulo}
        descripcion={t.agenda.descripcion}
        extra={<BotonNuevaCita hoy={hoy} />}
      />

      {agenda.solicitudes.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3">
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <MessageSquareText className="size-5" />
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold ring-2 ring-white">
                {agenda.solicitudes.length}
              </span>
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t.agenda.solicitudes}</h2>
              <p className="text-sm text-amber-900/70">{t.agenda.solicitudesAyuda}</p>
            </div>
          </div>
          <ul className="grid gap-2 lg:grid-cols-2">
            {agenda.solicitudes.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-xs sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar nombre={c.nombre} className="size-10" />
                  <div className="flex min-w-0 flex-col">
                    <Nombre cita={c} />
                    <p className="text-xs text-muted-foreground">
                      {t.agenda.porWhatsapp} · {formatearInstante(c.createdAt)}
                      {c.whatsapp && ` · ${formatearWhatsapp(c.whatsapp)}`}
                    </p>
                    {c.preferencia && (
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">{t.agenda.prefiere}:</span> {c.preferencia}
                      </p>
                    )}
                    {c.motivo && <p className="text-sm text-muted-foreground">{c.motivo}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                  <BotonEstadoCita id={c.id} estado="cancelada" etiqueta={t.agenda.descartar} />
                  <BotonHorario cita={vista(c)} hoy={hoy} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <TituloSeccion
          icono={CalendarDays}
          tono="cielo"
          extra={
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 ring-1 ring-cyan-100">
              {t.agenda.citasHoy(agenda.citasHoy)}
            </span>
          }
        >
          {t.agenda.titulo}
        </TituloSeccion>

        {agenda.dias.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            {t.agenda.vacio}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {agenda.dias.map(({ fecha, citas }) => (
              <div key={fecha} className="flex flex-col gap-2">
                <h3
                  className={cn(
                    "text-sm font-semibold first-letter:uppercase",
                    fecha === hoy ? "text-cyan-700" : "text-muted-foreground",
                  )}
                >
                  {tituloDia(fecha, hoy)}
                </h3>
                <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
                  {citas.map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        "flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4",
                        c.estado === "atendida" && "opacity-60",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="w-14 shrink-0 rounded-lg bg-cyan-50 py-1.5 text-center text-sm font-semibold text-cyan-800 tabular-nums">
                          {c.hora}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <Nombre cita={c} />
                          <p className="truncate text-xs text-muted-foreground">
                            {[c.motivo, c.origen === "whatsapp" ? t.agenda.porWhatsapp : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        {c.estado === "atendida" && (
                          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            {t.agenda.estados.atendida}
                          </span>
                        )}
                      </div>
                      {c.estado === "confirmada" && (
                        <div className="flex flex-wrap items-center gap-1 self-end sm:self-center">
                          <BotonEscribir whatsapp={c.whatsapp} />
                          <BotonEstadoCita id={c.id} estado="cancelada" />
                          <BotonHorario cita={vista(c)} hoy={hoy} reprogramar />
                          <BotonEstadoCita id={c.id} estado="atendida" />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
