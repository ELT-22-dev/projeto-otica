"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { eliminarConversacionAccion } from "../acciones";

/** Apaga a conversa só do sistema; no celular da ótica ela continua. */
export function BotonEliminarChat({ jid, nombre }: { jid: string; nombre: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pendiente}
      className="rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-700"
      onClick={() => {
        if (!window.confirm(t.whatsapp.confirmarEliminarChat(nombre))) return;
        iniciar(async () => {
          const r = await eliminarConversacionAccion(jid);
          if (r.ok) toast.success(t.whatsapp.chatEliminado);
          else toast.error(r.error);
        });
      }}
    >
      <Trash2 data-icon="inline-start" />
      {t.whatsapp.eliminarChat}
    </Button>
  );
}
