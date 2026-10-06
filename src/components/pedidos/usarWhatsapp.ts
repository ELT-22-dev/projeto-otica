"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ResultadoEnvio } from "@/application";
import { t } from "@/i18n";

type Resultado = { ok: true; data: ResultadoEnvio } | { ok: false; error: string };

/**
 * Navegadores bloqueiam window.open chamado depois de um await. Por isso a aba é aberta
 * no próprio toque e só recebe o endereço do wa.me quando a action responde.
 */
export function useWhatsapp() {
  const [pendiente, iniciar] = useTransition();

  function ejecutar(accion: () => Promise<Resultado>) {
    const ventana = window.open("", "_blank");
    if (ventana) {
      ventana.opener = null;
      ventana.document.title = "WhatsApp";
      ventana.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:32px;color:#555">Abriendo WhatsApp…</p>';
    }

    iniciar(async () => {
      let r: Resultado;
      try {
        r = await accion();
      } catch {
        r = { ok: false, error: t.app.sinConexion };
      }
      if (!r.ok) {
        ventana?.close();
        toast.error(r.error);
        return;
      }
      if (r.data.tipo === "requiere_accion") {
        const url = r.data.url;
        if (ventana) {
          ventana.location.href = url;
          toast.success(t.acciones.avisoAbierto);
        } else {
          toast(t.acciones.popupBloqueado, {
            duration: 15_000,
            action: { label: "WhatsApp", onClick: () => window.open(url, "_blank", "noopener") },
          });
        }
      } else {
        ventana?.close();
        toast.success(t.acciones.avisoAbierto);
      }
    });
  }

  return { ejecutar, pendiente };
}
