"use client";

import { Loader2, PhoneCall, PowerOff, QrCode, Smartphone, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  conectarWhatsappAccion,
  desconectarWhatsappAccion,
  estadoWhatsappAccion,
  type EstadoWhatsappVista,
} from "../acciones";

/** Enquanto espera o QR ou uma mudança, consulta a cada 3 s; parado, a cada 20 s. */
function intervalo(e: EstadoWhatsappVista, solicitud: Solicitud): number {
  return e.estado === "esperando_qr" || solicitud !== null ? 3_000 : 20_000;
}

type Solicitud = "conectar" | "desconectar" | null;

export function ConexionWhatsapp({ inicial, esAdmin }: { inicial: EstadoWhatsappVista; esAdmin: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState(inicial);
  /** Pedido feito por esta tela, até o serviço mostrar o resultado. */
  const [solicitud, setSolicitud] = useState<Solicitud>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    let activo = true;
    const id = setTimeout(
      async () => {
        const r = await estadoWhatsappAccion().catch(() => null);
        if (!activo || !r?.ok) return;
        // Conectou ou caiu: atualiza o resto da tela (botões de aviso mudam de modo).
        if (r.data.estado !== estado.estado) router.refresh();
        setEstado(r.data);
        if (
          (solicitud === "conectar" && r.data.estado !== "desconectado") ||
          (solicitud === "desconectar" && r.data.estado === "desconectado")
        ) {
          setSolicitud(null);
        }
      },
      intervalo(estado, solicitud),
    );
    return () => {
      activo = false;
      clearTimeout(id);
    };
  }, [estado, solicitud, router]);

  function pedir(
    accion: () => Promise<{ ok: true } | { ok: false; error: string }>,
    nueva: "conectar" | "desconectar",
  ) {
    iniciar(async () => {
      const r = await accion();
      if (!r.ok) toast.error(r.error);
      else setSolicitud(nueva);
    });
  }

  const conectado = estado.estado === "conectado";
  const tono = !estado.servicioEnLinea
    ? "border-slate-200 bg-slate-50"
    : conectado
      ? "border-green-200 bg-linear-to-br from-green-50 to-emerald-50"
      : "border-emerald-200 bg-card";

  return (
    <section className={cn("flex flex-col gap-4 rounded-3xl border p-4 shadow-sm md:p-5", tono)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md",
            conectado ? "bg-green-500 shadow-green-500/30" : "bg-slate-400 shadow-slate-400/30",
          )}
        >
          {estado.servicioEnLinea ? <Smartphone className="size-5" /> : <WifiOff className="size-5" />}
          {conectado && (
            <span className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-green-400 ring-2 ring-white" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{t.whatsapp.conexion}</h2>
          <p className={cn("text-sm", conectado ? "font-medium text-green-700" : "text-muted-foreground")}>
            {!estado.servicioEnLinea
              ? t.whatsapp.servicioApagado
              : conectado
                ? t.whatsapp.conectadoComo(estado.numero ?? "")
                : t.whatsapp.desconectado}
          </p>
        </div>
        {conectado && esAdmin && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pendiente || solicitud === "desconectar"}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (window.confirm(t.whatsapp.confirmarDesconectar)) pedir(desconectarWhatsappAccion, "desconectar");
            }}
          >
            {solicitud === "desconectar" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <PowerOff data-icon="inline-start" />
            )}
            {solicitud === "desconectar" ? t.whatsapp.desconectando : t.whatsapp.desconectar}
          </Button>
        )}
      </div>

      {!estado.servicioEnLinea && <p className="text-sm text-muted-foreground">{t.whatsapp.servicioApagadoAyuda}</p>}

      {estado.servicioEnLinea && conectado && <p className="text-sm text-green-900/80">{t.whatsapp.automatico}</p>}

      {estado.servicioEnLinea && !conectado && (
        <>
          <p className="text-sm text-muted-foreground">{t.whatsapp.manual}</p>
          {estado.estado === "esperando_qr" && estado.qrSvg ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-emerald-100 md:flex-row md:items-start">
              <div
                className="size-56 shrink-0 [&>svg]:size-full"
                aria-label={t.whatsapp.esperandoQr}
                role="img"
                // SVG gerado no servidor pela biblioteca qrcode a partir do código do WhatsApp.
                dangerouslySetInnerHTML={{ __html: estado.qrSvg }}
              />
              <div className="flex flex-col gap-2">
                <p className="font-medium">{t.whatsapp.esperandoQr}</p>
                <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted-foreground">
                  {t.whatsapp.pasos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              </div>
            </div>
          ) : esAdmin ? (
            <Button
              disabled={pendiente || solicitud === "conectar"}
              onClick={() => pedir(conectarWhatsappAccion, "conectar")}
              className="h-12 self-start rounded-xl bg-green-600 px-5 text-base text-white hover:bg-green-700"
            >
              {solicitud === "conectar" || estado.estado === "esperando_qr" ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <QrCode data-icon="inline-start" />
              )}
              {solicitud === "conectar" || estado.estado === "esperando_qr"
                ? t.whatsapp.generandoQr
                : t.whatsapp.conectar}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t.whatsapp.soloAdmin}</p>
          )}
        </>
      )}

      {estado.servicioEnLinea && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <PhoneCall className="mt-0.5 size-3.5 shrink-0" />
          {t.whatsapp.llamadas}
        </p>
      )}
    </section>
  );
}
