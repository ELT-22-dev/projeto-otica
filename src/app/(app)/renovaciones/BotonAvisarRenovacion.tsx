"use client";

import { CheckCircle2, MessageCircle } from "lucide-react";
import { useWhatsapp } from "@/components/pedidos/usarWhatsapp";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { avisarRenovacionAccion } from "../acciones";

export function BotonAvisarRenovacion({ clienteId, avisadoEl }: { clienteId: string; avisadoEl: string | null }) {
  const { ejecutar, pendiente } = useWhatsapp();

  return (
    <div className="flex items-center gap-3">
      {avisadoEl && (
        <span className="inline-flex flex-1 items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          {t.renovaciones.avisado(avisadoEl)}
        </span>
      )}
      <Button
        variant={avisadoEl ? "outline" : "default"}
        className={
          avisadoEl
            ? "h-11 rounded-xl"
            : "h-11 flex-1 rounded-xl bg-emerald-600 text-base text-white hover:bg-emerald-700"
        }
        disabled={pendiente}
        onClick={() => ejecutar(() => avisarRenovacionAccion(clienteId))}
      >
        <MessageCircle data-icon="inline-start" />
        {avisadoEl ? t.renovaciones.avisarDeNuevo : t.renovaciones.avisar}
      </Button>
    </div>
  );
}
