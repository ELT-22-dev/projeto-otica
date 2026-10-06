"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ResultadoEnvio } from "@/application";
import { t } from "@/i18n";
import { useEnvioAutomatico } from "./ModoWhatsapp";

type Resultado = { ok: true; data: ResultadoEnvio | null } | { ok: false; error: string };

function abrirConToque(url: string) {
  toast(t.acciones.popupBloqueado, {
    duration: 15_000,
    action: { label: "WhatsApp", onClick: () => window.open(url, "_blank", "noopener") },
  });
}

/**
 * Com o WhatsApp conectado por QR, a mensagem sai sozinha: só mostra a confirmação.
 * Sem conexão (wa.me): navegadores bloqueiam window.open chamado depois de um await, por isso
 * a aba é aberta no próprio toque e só recebe o endereço quando a action responde.
 */
export function useWhatsapp() {
  const automatico = useEnvioAutomatico();
  const [pendiente, iniciar] = useTransition();

  /** `puedeEnviar = false` quando já se sabe que nada vai para o WhatsApp (evita abrir uma aba à toa). */
  function ejecutar(accion: () => Promise<Resultado>, alTerminar?: () => void, puedeEnviar = true) {
    let ventana: Window | null = null;
    if (!automatico && puedeEnviar) {
      ventana = window.open("", "_blank");
      if (ventana) {
        ventana.opener = null;
        ventana.document.title = "WhatsApp";
        ventana.document.body.innerHTML =
          '<p style="font-family:system-ui,sans-serif;padding:32px;color:#555">Abriendo WhatsApp…</p>';
      }
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
      alTerminar?.();
      if (r.data === null) {
        ventana?.close();
        return;
      }
      if (r.data.tipo === "enviado") {
        ventana?.close();
        toast.success(t.acciones.avisoEnviado);
        return;
      }
      // Conexão caiu entre a tela carregar e o toque: volta para o wa.me.
      const url = r.data.url;
      if (ventana) {
        ventana.location.href = url;
        toast.success(t.acciones.avisoAbierto);
      } else {
        abrirConToque(url);
      }
    });
  }

  return { ejecutar, pendiente, automatico };
}
