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
  compacto = false,
}: {
  pedidoId: string;
  status: StatusPedido;
  className?: string;
  /** Botões menores, lado a lado: para a tabela no PC. */
  compacto?: boolean;
}) {
  const alto = compacto ? "h-8 px-3 text-sm" : "h-11 text-base";
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
        className={cn(alto, "bg-emerald-600 text-white hover:bg-emerald-700", !compacto && "w-full", className)}
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
      <div className={cn(compacto ? "flex gap-2" : "grid grid-cols-2 gap-2", className)}>
        <Button
          variant="outline"
          className={cn(alto, "border-emerald-300 text-emerald-800 hover:bg-emerald-50")}
          disabled={ocupado}
          onClick={() => whatsapp.ejecutar(() => listoYAvisarAccion(pedidoId))}
        >
          <MessageCircle data-icon="inline-start" />
          {t.acciones.avisarCorto}
        </Button>
        <Button className={alto} disabled={ocupado} onClick={entregar}>
          <PackageCheck data-icon="inline-start" />
          {t.acciones.entregado}
        </Button>
      </div>
    );
  }

  return null;
}
