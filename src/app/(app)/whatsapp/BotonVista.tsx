"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { marcarConversacionAtendidaAccion } from "../acciones";

/** A equipe já respondeu pelo celular: a conversa sai do sinal vermelho. */
export function BotonVista({ jid }: { jid: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pendiente}
      className="rounded-lg"
      onClick={() =>
        iniciar(async () => {
          const r = await marcarConversacionAtendidaAccion(jid);
          if (!r.ok) toast.error(r.error);
        })
      }
    >
      <Check data-icon="inline-start" />
      {t.whatsapp.marcarVista}
    </Button>
  );
}
