"use client";

import { CalendarCheck, CalendarClock, Check, MessageCircle, Plus, UserCheck, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Hoja } from "@/components/Hoja";
import { useWhatsapp } from "@/components/pedidos/usarWhatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { sumarDias } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  buscarClientesAccion,
  cambiarEstadoCitaAccion,
  confirmarCitaAccion,
  crearCitaAccion,
  type SugerenciaCliente,
} from "../acciones";

/** Atalhos de dia: hoje, amanhã e os próximos. */
function DiasRapidos({ hoy, valor, onCambiar }: { hoy: string; valor: string; onCambiar: (f: string) => void }) {
  const dias = [0, 1, 2, 3, 4, 5, 6].map((n) => sumarDias(hoy, n));
  const etiqueta = (fecha: string, n: number) =>
    n === 0
      ? t.agenda.hoy
      : n === 1
        ? t.agenda.manana
        : new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
            new Date(`${fecha}T12:00:00Z`),
          );
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {dias.map((f, n) => (
        <button
          key={f}
          type="button"
          onClick={() => onCambiar(f)}
          aria-pressed={valor === f}
          className={cn(
            "h-9 shrink-0 rounded-full border px-3 text-sm capitalize transition",
            valor === f ? "border-cyan-600 bg-cyan-600 text-white" : "bg-background hover:bg-muted",
          )}
        >
          {etiqueta(f, n)}
        </button>
      ))}
    </div>
  );
}

function CamposHorario({
  hoy,
  fecha,
  hora,
  avisar,
  conWhatsapp,
  onFecha,
  onHora,
  onAvisar,
}: {
  hoy: string;
  fecha: string;
  hora: string;
  avisar: boolean;
  conWhatsapp: boolean;
  onFecha: (v: string) => void;
  onHora: (v: string) => void;
  onAvisar: (v: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>{t.agenda.fecha}</Label>
        <DiasRapidos hoy={hoy} valor={fecha} onCambiar={onFecha} />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            min={hoy}
            value={fecha}
            onChange={(e) => onFecha(e.target.value)}
            className="h-12 text-base"
            aria-label={t.agenda.fecha}
          />
          <Input
            type="time"
            step={900}
            value={hora}
            onChange={(e) => onHora(e.target.value)}
            className="h-12 text-base"
            aria-label={t.agenda.hora}
            required
          />
        </div>
      </div>
      {conWhatsapp && (
        <label className="flex items-center gap-2.5 rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-900 ring-1 ring-green-100">
          <input
            type="checkbox"
            checked={avisar}
            onChange={(e) => onAvisar(e.target.checked)}
            className="size-4 accent-green-600"
          />
          <MessageCircle className="size-4 text-green-600" />
          {t.agenda.avisar}
        </label>
      )}
    </>
  );
}

function MensajeError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  );
}

const BOTON_PRINCIPAL = "h-12 w-full rounded-xl bg-cyan-600 text-base text-white hover:bg-cyan-700";

export function BotonNuevaCita({ hoy }: { hoy: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <Button
        onClick={() => setAbierta(true)}
        className="h-11 self-start rounded-xl bg-cyan-600 px-5 text-white hover:bg-cyan-700"
      >
        <Plus data-icon="inline-start" />
        {t.agenda.nueva}
      </Button>
      {abierta && (
        <Hoja titulo={t.agenda.nueva} onCerrar={() => setAbierta(false)}>
          <FormNuevaCita hoy={hoy} alTerminar={() => setAbierta(false)} />
        </Hoja>
      )}
    </>
  );
}

function FormNuevaCita({ hoy, alTerminar }: { hoy: string; alTerminar: () => void }) {
  const { ejecutar, pendiente } = useWhatsapp();
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [elegido, setElegido] = useState<SugerenciaCliente | null>(null);
  const [sugerencias, setSugerencias] = useState<SugerenciaCliente[]>([]);
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ultimaBusqueda = useRef(0);

  const digitos = whatsapp.replace(/\D/g, "");
  const consulta = elegido ? "" : digitos.length >= 4 ? digitos : nombre.trim().length >= 2 ? nombre : "";
  const sugerenciasVisibles = consulta ? sugerencias : [];

  useEffect(() => {
    if (!consulta) return;
    const id = ++ultimaBusqueda.current;
    const temporizador = setTimeout(async () => {
      const r = await buscarClientesAccion(consulta);
      if (id === ultimaBusqueda.current && r.ok) setSugerencias(r.data);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [consulta]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const entrada = {
      cliente: elegido ? { tipo: "existente", id: elegido.id } : { tipo: "nuevo", nombre, whatsapp },
      fecha,
      hora,
      motivo,
      avisar,
    };
    // Erro aparece no formulário; o hook mostra o aviso enviado.
    ejecutar(
      async () => {
        const r = await crearCitaAccion(entrada);
        if (!r.ok) setError(r.error);
        else toast.success(t.agenda.creada);
        return r;
      },
      alTerminar,
      avisar,
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      {elegido ? (
        <div className="flex items-center gap-3 rounded-xl bg-cyan-50 p-3 ring-1 ring-cyan-200">
          <UserCheck className="size-5 shrink-0 text-cyan-700" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{elegido.nombre}</p>
            <p className="text-sm text-muted-foreground">{formatearWhatsapp(elegido.whatsapp)}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setElegido(null)}>
            <X data-icon="inline-start" />
            {t.nuevo.cambiarCliente}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cita-nombre">{t.nuevo.nombre}</Label>
            <Input
              id="cita-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="off"
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cita-whatsapp">{t.nuevo.whatsapp}</Label>
            <Input
              id="cita-whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          {sugerenciasVisibles.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-xl border p-1.5 sm:col-span-2">
              <li className="px-2 py-1 text-xs text-muted-foreground">{t.nuevo.coincidencias}</li>
              {sugerenciasVisibles.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setElegido(c);
                      setSugerencias([]);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="truncate font-medium">{c.nombre}</span>
                    <span className="shrink-0 text-muted-foreground">{formatearWhatsapp(c.whatsapp)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <CamposHorario
        hoy={hoy}
        fecha={fecha}
        hora={hora}
        avisar={avisar}
        conWhatsapp
        onFecha={setFecha}
        onHora={setHora}
        onAvisar={setAvisar}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cita-motivo">{t.agenda.motivo}</Label>
        <Input
          id="cita-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={t.agenda.motivoPlaceholder}
          className="h-12 text-base"
        />
      </div>

      <MensajeError error={error} />
      <Button type="submit" disabled={pendiente} className={BOTON_PRINCIPAL}>
        <CalendarCheck data-icon="inline-start" />
        {t.agenda.guardar}
      </Button>
    </form>
  );
}

export interface CitaVista {
  id: string;
  nombre: string;
  whatsapp: string | null;
  fecha: string | null;
  hora: string | null;
  preferencia: string | null;
}

/** Confirmar uma solicitação do WhatsApp, ou trocar o horário de uma cita. */
export function BotonHorario({
  cita,
  hoy,
  reprogramar = false,
}: {
  cita: CitaVista;
  hoy: string;
  reprogramar?: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const titulo = reprogramar ? t.agenda.reprogramar : t.agenda.confirmar;
  return (
    <>
      {reprogramar ? (
        <Button variant="outline" size="sm" onClick={() => setAbierta(true)} className="rounded-lg">
          <CalendarClock data-icon="inline-start" />
          {titulo}
        </Button>
      ) : (
        <Button
          onClick={() => setAbierta(true)}
          className="h-10 rounded-xl bg-cyan-600 px-4 text-white hover:bg-cyan-700"
        >
          <CalendarCheck data-icon="inline-start" />
          {titulo}
        </Button>
      )}
      {abierta && (
        <Hoja titulo={`${titulo} · ${cita.nombre}`} onCerrar={() => setAbierta(false)}>
          <FormHorario cita={cita} hoy={hoy} alTerminar={() => setAbierta(false)} />
        </Hoja>
      )}
    </>
  );
}

function FormHorario({ cita, hoy, alTerminar }: { cita: CitaVista; hoy: string; alTerminar: () => void }) {
  const { ejecutar, pendiente } = useWhatsapp();
  const [fecha, setFecha] = useState(cita.fecha && cita.fecha >= hoy ? cita.fecha : hoy);
  const [hora, setHora] = useState(cita.hora ?? "");
  const [avisar, setAvisar] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const conAviso = avisar && Boolean(cita.whatsapp);
    ejecutar(
      async () => {
        const r = await confirmarCitaAccion({ id: cita.id, fecha, hora, avisar: conAviso });
        if (!r.ok) setError(r.error);
        else toast.success(t.agenda.confirmada);
        return r;
      },
      alTerminar,
      conAviso,
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      {cita.preferencia && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
          <span className="font-medium">{t.agenda.prefiere}:</span> {cita.preferencia}
        </p>
      )}
      <CamposHorario
        hoy={hoy}
        fecha={fecha}
        hora={hora}
        avisar={avisar}
        conWhatsapp={Boolean(cita.whatsapp)}
        onFecha={setFecha}
        onHora={setHora}
        onAvisar={setAvisar}
      />
      <MensajeError error={error} />
      <Button type="submit" disabled={pendiente} className={BOTON_PRINCIPAL}>
        <Check data-icon="inline-start" />
        {t.agenda.confirmar}
      </Button>
    </form>
  );
}

export function BotonEstadoCita({
  id,
  estado,
  etiqueta,
}: {
  id: string;
  estado: "atendida" | "cancelada";
  etiqueta?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const cancelar = estado === "cancelada";
  return (
    <Button
      variant={cancelar ? "ghost" : "outline"}
      size="sm"
      disabled={pendiente}
      className={cn("rounded-lg", cancelar && "text-muted-foreground hover:text-destructive")}
      onClick={() => {
        if (cancelar && !window.confirm(t.agenda.confirmarCancelar)) return;
        iniciar(async () => {
          const r = await cambiarEstadoCitaAccion(id, estado);
          if (r.ok) toast.success(t.agenda.cambiada);
          else toast.error(r.error);
        });
      }}
    >
      {cancelar ? <X data-icon="inline-start" /> : <Check data-icon="inline-start" />}
      {etiqueta ?? (cancelar ? t.agenda.cancelar : t.agenda.atendida)}
    </Button>
  );
}
