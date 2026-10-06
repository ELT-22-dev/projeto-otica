"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Idioma } from "@/domain/shared/idioma";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { actualizarConfiguracionAccion } from "../acciones";

interface Valores {
  nombre: string;
  telefonoWhatsapp: string;
  idiomaDefault: Idioma;
  plantillaListoEs: string;
  plantillaListoPt: string;
  plantillaRenovacionEs: string;
  plantillaRenovacionPt: string;
}

const PLANTILLAS = ["plantillaListoEs", "plantillaListoPt", "plantillaRenovacionEs", "plantillaRenovacionPt"] as const;

export function FormAjustes({ inicial }: { inicial: Valores }) {
  const [valores, setValores] = useState(inicial);
  const [error, setError] = useState<{ mensaje: string; campo?: string } | null>(null);
  const [guardando, iniciar] = useTransition();

  const cambiar = <K extends keyof Valores>(campo: K, valor: Valores[K]) =>
    setValores((v) => ({ ...v, [campo]: valor }));

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await actualizarConfiguracionAccion(valores);
      if (r.ok) toast.success(t.ajustes.guardado);
      else {
        setError({ mensaje: r.error, campo: r.campo });
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase lg:col-span-3">
          {t.ajustes.optica}
        </h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">{t.ajustes.nombre}</Label>
          <Input
            id="nombre"
            value={valores.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefono">{t.ajustes.whatsapp}</Label>
          <Input
            id="telefono"
            type="tel"
            inputMode="tel"
            value={valores.telefonoWhatsapp}
            onChange={(e) => cambiar("telefonoWhatsapp", e.target.value)}
            className="h-12 text-base"
            aria-invalid={error?.campo === "whatsapp"}
          />
          {error?.campo === "whatsapp" && <p className="text-sm text-destructive">{error.mensaje}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t.ajustes.idiomaDefault}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["es", "pt"] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => cambiar("idiomaDefault", i)}
                aria-pressed={valores.idiomaDefault === i}
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium",
                  valores.idiomaDefault === i ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                )}
              >
                {t.nuevo.idiomas[i]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.ajustes.plantillas}
          </h2>
          <p className="text-xs text-muted-foreground">{t.ajustes.variables}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          {PLANTILLAS.map((campo) => (
            <div key={campo} className="flex flex-col gap-1.5">
              <Label htmlFor={campo}>{t.ajustes[campo]}</Label>
              <Textarea
                id={campo}
                value={valores[campo]}
                onChange={(e) => cambiar(campo, e.target.value)}
                rows={4}
                className="text-base"
              />
            </div>
          ))}
        </div>
      </section>

      {error && error.campo !== "whatsapp" && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.mensaje}
        </p>
      )}

      <Button type="submit" disabled={guardando} className="h-12 text-base lg:ml-auto lg:w-72">
        {t.app.guardar}
      </Button>
    </form>
  );
}
