"use client";

import { MessageCircle } from "lucide-react";
import { avisarRenovacionAccion, listoYAvisarAccion } from "@/app/(app)/acciones";
import { useWhatsapp } from "@/components/pedidos/usarWhatsapp";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

/** Um toque: abre o WhatsApp com a mensagem certa e registra o aviso. */
export function BotonAvisar({ tipo, id }: { tipo: "listo" | "renovacion"; id: string }) {
  const { ejecutar, pendiente } = useWhatsapp();
  return (
    <Button
      disabled={pendiente}
      onClick={() => ejecutar(() => (tipo === "listo" ? listoYAvisarAccion(id) : avisarRenovacionAccion(id)))}
      className="h-10 shrink-0 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-700"
    >
      <MessageCircle data-icon="inline-start" />
      {t.porAvisar.avisar}
    </Button>
  );
}
