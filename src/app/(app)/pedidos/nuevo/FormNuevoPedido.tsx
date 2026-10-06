"use client";

import { Camera, ChevronDown, Eye, Glasses, Loader2, Sparkles, UserCheck, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconoTono, TituloSeccion } from "@/components/visual";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { sumarDias } from "@/domain/shared/fecha";
import type { Idioma } from "@/domain/shared/idioma";
import { t } from "@/i18n";
import { reducirImagen } from "@/lib/imagen";
import { cn } from "@/lib/utils";
import {
  buscarClientesAccion,
  crearPedidoAccion,
  leerRecetaAccion,
  type RecetaLeida,
  type SugerenciaCliente,
} from "../../acciones";

const CAMPOS_RECETA = ["Esfera", "Cilindro", "Eje"] as const;
const RECETA_VACIA = {
  odEsfera: "",
  odCilindro: "",
  odEje: "",
  oiEsfera: "",
  oiCilindro: "",
  oiEje: "",
  adicion: "",
  dnpOd: "",
  dnpOi: "",
  observaciones: "",
  fechaReceta: "",
};
type CampoReceta = keyof typeof RECETA_VACIA;

/** Valor lido pela IA no formato do campo: "-2,25", "+1,50", "180", "31,5". */
function aCampo(v: number | null, decimales: number, conSigno = false): string {
  if (v === null) return "";
  const texto = v.toFixed(decimales).replace(".", ",");
  return conSigno && v > 0 ? `+${texto}` : texto;
}

export function FormNuevoPedido({
  hoy,
  idiomaDefault,
  iaDisponible,
}: {
  hoy: string;
  idiomaDefault: Idioma;
  iaDisponible: boolean;
}) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();

  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [idioma, setIdioma] = useState<Idioma>(idiomaDefault);
  const [elegido, setElegido] = useState<SugerenciaCliente | null>(null);
  const [sugerencias, setSugerencias] = useState<SugerenciaCliente[]>([]);

  const [descripcion, setDescripcion] = useState("");
  const [tipoLente, setTipoLente] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorAdelanto, setValorAdelanto] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(sumarDias(hoy, 7));
  const [receta, setReceta] = useState(RECETA_VACIA);
  const [recetaAbierta, setRecetaAbierta] = useState(false);
  const [leyendo, iniciarLectura] = useTransition();
  const [advertenciaReceta, setAdvertenciaReceta] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<{ mensaje: string; campo?: string } | null>(null);
  const ultimaBusqueda = useRef(0);

  // Sugere clientes existentes enquanto digita nome ou WhatsApp.
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

  function usarCliente(c: SugerenciaCliente) {
    setElegido(c);
    setSugerencias([]);
    setError(null);
  }

  function cambiarCliente() {
    setElegido(null);
    setNombre("");
    setWhatsapp("");
  }

  function leerFoto(archivo: File) {
    iniciarLectura(async () => {
      let r;
      try {
        r = await leerRecetaAccion(await reducirImagen(archivo));
      } catch {
        toast.error(t.errores.imagen_invalida);
        return;
      }
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const l: RecetaLeida = r.data;
      setReceta({
        odEsfera: aCampo(l.odEsfera, 2, true),
        odCilindro: aCampo(l.odCilindro, 2, true),
        odEje: aCampo(l.odEje, 0),
        oiEsfera: aCampo(l.oiEsfera, 2, true),
        oiCilindro: aCampo(l.oiCilindro, 2, true),
        oiEje: aCampo(l.oiEje, 0),
        adicion: aCampo(l.adicion, 2, true),
        dnpOd: aCampo(l.dnpOd, 1),
        dnpOi: aCampo(l.dnpOi, 1),
        fechaReceta: l.fechaReceta && l.fechaReceta <= hoy ? l.fechaReceta : "",
        observaciones: l.observaciones ?? "",
      });
      setAdvertenciaReceta(l.advertencias);
      setRecetaAbierta(true);
      toast.success(t.nuevo.leida);
    });
  }

  function campoReceta(campo: CampoReceta, valor: string) {
    setReceta((r) => ({ ...r, [campo]: valor }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const entrada = {
      cliente: elegido ? { tipo: "existente", id: elegido.id } : { tipo: "nuevo", nombre, whatsapp, idioma },
      descripcionArmazon: descripcion,
      tipoLente,
      valorTotal,
      valorAdelanto,
      fechaEntregaPrevista: fechaEntrega,
      receta,
    };
    iniciar(async () => {
      const r = await crearPedidoAccion(entrada);
      if (!r.ok) {
        setError({ mensaje: r.error, campo: r.campo });
        toast.error(r.error);
        if (r.campo === "receta" || (r.campo && r.campo in RECETA_VACIA)) setRecetaAbierta(true);
        return;
      }
      toast.success(t.nuevo.creado(formatearNumeroPedido(r.data.numero)));
      router.push(`/pedidos/${r.data.pedidoId}`);
    });
  }

  const errorEn = (...campos: string[]) =>
    error?.campo && campos.includes(error.campo) ? <p className="text-sm text-destructive">{error.mensaje}</p> : null;

  return (
    <form onSubmit={enviar} className="grid gap-4 md:grid-cols-2 md:items-start lg:gap-5" noValidate>
      {/* Cliente */}
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs md:p-5">
        <TituloSeccion icono={UserRound} tono="violeta">
          {t.nuevo.cliente}
        </TituloSeccion>

        {elegido ? (
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
            <UserCheck className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{elegido.nombre}</p>
              <p className="text-sm text-muted-foreground">{formatearWhatsapp(elegido.whatsapp)}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={cambiarCliente}>
              <X data-icon="inline-start" />
              {t.nuevo.cambiarCliente}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">{t.nuevo.nombre} *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
                autoCapitalize="words"
                className="h-12 text-base"
                aria-invalid={error?.campo === "nombre"}
              />
              {errorEn("nombre")}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whatsapp">{t.nuevo.whatsapp} *</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="11 98765-4321"
                className="h-12 text-base"
                aria-invalid={error?.campo === "whatsapp"}
              />
              <p className="text-xs text-muted-foreground">{t.nuevo.whatsappAyuda}</p>
              {errorEn("whatsapp")}
            </div>

            {sugerenciasVisibles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t.nuevo.coincidencias}</p>
                <ul className="flex flex-col divide-y rounded-lg border">
                  {sugerenciasVisibles.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => usarCliente(c)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.nombre}</p>
                          <p className="text-xs text-muted-foreground">{formatearWhatsapp(c.whatsapp)}</p>
                        </div>
                        <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                          {t.nuevo.usarCliente}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>{t.nuevo.idioma}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["es", "pt"] as const).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdioma(i)}
                    aria-pressed={idioma === i}
                    className={cn(
                      "h-10 rounded-lg border text-sm font-medium transition",
                      idioma === i ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                    )}
                  >
                    {t.nuevo.idiomas[i]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Pedido */}
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs md:p-5">
        <TituloSeccion icono={Glasses} tono="cielo">
          {t.nuevo.pedido}
        </TituloSeccion>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descripcion">{t.nuevo.descripcion} *</Label>
          <Input
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={t.nuevo.descripcionPlaceholder}
            className="h-12 text-base"
            aria-invalid={error?.campo === "descripcionArmazon"}
          />
          {errorEn("descripcionArmazon")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tipoLente">{t.nuevo.tipoLente}</Label>
          <Input
            id="tipoLente"
            value={tipoLente}
            onChange={(e) => setTipoLente(e.target.value)}
            placeholder={t.nuevo.tipoLentePlaceholder}
            className="h-12 text-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="valorTotal">{t.nuevo.valorTotal} *</Label>
            <Input
              id="valorTotal"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="h-12 text-base"
              aria-invalid={error?.campo === "valorTotal"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="valorAdelanto">{t.nuevo.valorAdelanto}</Label>
            <Input
              id="valorAdelanto"
              value={valorAdelanto}
              onChange={(e) => setValorAdelanto(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="h-12 text-base"
              aria-invalid={error?.campo === "valorAdelanto"}
            />
          </div>
        </div>
        {errorEn("valorTotal", "valorAdelanto")}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fechaEntrega">{t.nuevo.fechaEntrega} *</Label>
          <Input
            id="fechaEntrega"
            type="date"
            value={fechaEntrega}
            min={hoy}
            onChange={(e) => setFechaEntrega(e.target.value)}
            className="h-12 text-base"
            aria-invalid={error?.campo === "fechaEntregaPrevista"}
          />
          <div className="flex gap-2">
            {[3, 7, 10, 15].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setFechaEntrega(sumarDias(hoy, d))}
                className={cn(
                  "h-9 flex-1 rounded-lg border text-sm transition",
                  fechaEntrega === sumarDias(hoy, d) && "border-primary bg-primary/10 font-medium text-primary",
                )}
              >
                {t.nuevo.dias(d)}
              </button>
            ))}
          </div>
          {errorEn("fechaEntregaPrevista")}
        </div>
      </section>

      {/* Receta (opcional, recolhida) */}
      <Collapsible
        open={recetaAbierta}
        onOpenChange={setRecetaAbierta}
        className="rounded-2xl border bg-card shadow-xs md:col-span-2"
      >
        <div className="flex flex-wrap items-center gap-2 p-4 md:p-5">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <IconoTono icono={Eye} tono="rosa" />
            <span className="flex-1 text-sm font-semibold">{t.nuevo.receta}</span>
            <ChevronDown className={cn("size-5 text-muted-foreground transition", recetaAbierta && "rotate-180")} />
          </CollapsibleTrigger>
          {iaDisponible && (
            <>
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = "";
                  if (archivo) leerFoto(archivo);
                }}
              />
              <Button
                type="button"
                disabled={leyendo}
                onClick={() => inputFoto.current?.click()}
                className="h-10 w-full rounded-xl border-0 bg-linear-to-r from-pink-500 to-fuchsia-500 text-white shadow-md shadow-pink-500/20 hover:brightness-110 sm:w-auto"
              >
                {leyendo ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Camera data-icon="inline-start" />
                )}
                {leyendo ? t.nuevo.leyendo : t.nuevo.leerFoto}
                <Sparkles className="size-3.5 opacity-80" />
              </Button>
            </>
          )}
        </div>
        <CollapsibleContent className="grid gap-4 px-4 pb-4 md:px-5 md:pb-5 lg:grid-cols-2 lg:gap-x-8">
          {iaDisponible && <p className="text-xs text-muted-foreground lg:col-span-2">{t.nuevo.avisoFoto}</p>}
          {advertenciaReceta && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 lg:col-span-2">{advertenciaReceta}</p>
          )}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-2 text-sm">
            <span />
            <span className="text-center text-xs text-muted-foreground">{t.receta.esfera}</span>
            <span className="text-center text-xs text-muted-foreground">{t.receta.cilindro}</span>
            <span className="text-center text-xs text-muted-foreground">{t.receta.eje}</span>
            {(["od", "oi"] as const).map((ojo) => (
              <FilaOjo key={ojo} ojo={ojo} receta={receta} onCambio={campoReceta} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <CampoNumero
              etiqueta={t.receta.adicion}
              valor={receta.adicion}
              onCambio={(v) => campoReceta("adicion", v)}
            />
            <CampoNumero etiqueta={t.receta.dnpOd} valor={receta.dnpOd} onCambio={(v) => campoReceta("dnpOd", v)} />
            <CampoNumero etiqueta={t.receta.dnpOi} valor={receta.dnpOi} onCambio={(v) => campoReceta("dnpOi", v)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fechaReceta">{t.receta.fecha}</Label>
            <Input
              id="fechaReceta"
              type="date"
              value={receta.fechaReceta}
              max={hoy}
              onChange={(e) => campoReceta("fechaReceta", e.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observaciones">{t.receta.observaciones}</Label>
            <Textarea
              id="observaciones"
              value={receta.observaciones}
              onChange={(e) => campoReceta("observaciones", e.target.value)}
              rows={2}
            />
          </div>
          {errorEn("receta", ...Object.keys(RECETA_VACIA))}
        </CollapsibleContent>
      </Collapsible>

      {error && !error.campo && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
          {error.mensaje}
        </p>
      )}

      <Button
        type="submit"
        disabled={guardando}
        className="h-14 text-base font-semibold bg-marca border-0 shadow-lg shadow-tema-500/25 hover:brightness-110 md:col-span-2 md:ml-auto md:h-12 md:w-72"
      >
        {guardando ? t.nuevo.guardando : t.nuevo.guardar}
      </Button>
    </form>
  );
}

function FilaOjo({
  ojo,
  receta,
  onCambio,
}: {
  ojo: "od" | "oi";
  receta: typeof RECETA_VACIA;
  onCambio: (campo: CampoReceta, valor: string) => void;
}) {
  return (
    <>
      <span className="pr-1 text-xs font-semibold">{ojo === "od" ? "OD" : "OI"}</span>
      {CAMPOS_RECETA.map((c) => {
        const campo = `${ojo}${c}` as CampoReceta;
        return (
          <Input
            key={campo}
            aria-label={`${ojo.toUpperCase()} ${c}`}
            value={receta[campo]}
            onChange={(e) => onCambio(campo, e.target.value)}
            inputMode={c === "Eje" ? "numeric" : "text"}
            placeholder={c === "Eje" ? "0–180" : "0,00"}
            className="h-11 text-center text-base"
          />
        );
      })}
    </>
  );
}

function CampoNumero({
  etiqueta,
  valor,
  onCambio,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{etiqueta}</Label>
      <Input
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        inputMode="decimal"
        className="h-11 text-center text-base"
      />
    </div>
  );
}
