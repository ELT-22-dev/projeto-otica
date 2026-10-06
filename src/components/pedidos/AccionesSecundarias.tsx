"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cambiarStatusAccion } from "@/app/(app)/acciones";
import { Button } from "@/components/ui/button";
import { transicionesPosibles, type StatusPedido } from "@/domain/pedido/status-pedido";
import { t } from "@/i18n";

/** Correções (voltar um passo) e cancelamento, fora do fluxo principal. */
export function AccionesSecundarias({ pedidoId, status }: { pedidoId: string; status: StatusPedido }) {
  const [pendiente, iniciar] = useTransition();
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const posibles = transicionesPosibles(status);

  function cambiar(hacia: StatusPedido) {
    iniciar(async () => {
      const r = await cambiarStatusAccion(pedidoId, hacia);
      if (r.ok) toast.success(t.acciones.hecho[hacia]);
      else toast.error(r.error);
      setConfirmandoCancelar(false);
    });
  }

  const correccion =
    status === "listo" && posibles.includes("en_laboratorio")
      ? { hacia: "en_laboratorio" as const, etiqueta: t.acciones.volverALaboratorio }
      : status === "entregado" && posibles.includes("listo")
        ? { hacia: "listo" as const, etiqueta: t.acciones.deshacerEntrega }
        : null;

  if (!correccion && !posibles.includes("cancelado")) return null;

  return (
    <div className="flex flex-col gap-2">
      {correccion && (
        <Button variant="outline" className="h-11" disabled={pendiente} onClick={() => cambiar(correccion.hacia)}>
          {correccion.etiqueta}
        </Button>
      )}
      {posibles.includes("cancelado") &&
        (confirmandoCancelar ? (
          <div className="flex flex-col gap-2 rounded-lg bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{t.acciones.confirmarCancelar}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={pendiente} onClick={() => setConfirmandoCancelar(false)}>
                {t.app.volver}
              </Button>
              <Button variant="destructive" disabled={pendiente} onClick={() => cambiar("cancelado")}>
                {t.acciones.cancelarPedido}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="h-11 text-destructive" onClick={() => setConfirmandoCancelar(true)}>
            {t.acciones.cancelarPedido}
          </Button>
        ))}
    </div>
  );
}
