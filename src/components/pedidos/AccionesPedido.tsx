"use client";

import { CheckCheck, MessageCircle, PackageCheck } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cambiarStatusAccion, listoYAvisarAccion } from "@/app/(app)/acciones";
import { Button } from "@/components/ui/button";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useWhatsapp } from "./usarWhatsapp";

/** Ações principais de um pedido: um toque para cada passo do fluxo. */
export function AccionesPedido({
  pedidoId,
  status,
  className,
}: {
  pedidoId: string;
  status: StatusPedido;
  className?: string;
}) {
  const whatsapp = useWhatsapp();
  const [pendiente, iniciar] = useTransition();
  const ocupado = pendiente || whatsapp.pendiente;

  function entregar() {
    iniciar(async () => {
      const r = await cambiarStatusAccion(pedidoId, "entregado");
      if (r.ok) toast.success(t.acciones.hecho.entregado);
      else toast.error(r.error);
    });
  }

  if (status === "en_laboratorio") {
    return (
      <Button
        className={cn("h-11 w-full bg-emerald-600 text-base text-white hover:bg-emerald-700", className)}
        disabled={ocupado}
        onClick={() => whatsapp.ejecutar(() => listoYAvisarAccion(pedidoId))}
      >
        <CheckCheck data-icon="inline-start" />
        {t.acciones.listoYAvisar}
      </Button>
    );
  }

  if (status === "listo") {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <Button
          variant="outline"
          className="h-11 border-emerald-300 text-base text-emerald-800 hover:bg-emerald-50"
          disabled={ocupado}
          onClick={() => whatsapp.ejecutar(() => listoYAvisarAccion(pedidoId))}
        >
          <MessageCircle data-icon="inline-start" />
          {t.acciones.avisarCorto}
        </Button>
        <Button className="h-11 text-base" disabled={ocupado} onClick={entregar}>
          <PackageCheck data-icon="inline-start" />
          {t.acciones.entregado}
        </Button>
      </div>
    );
  }

  return null;
}
