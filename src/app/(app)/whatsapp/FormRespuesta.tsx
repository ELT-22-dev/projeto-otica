"use client";

import { SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { responderConversacionAccion } from "../acciones";

/** Responder ao cliente pela tela; sai pelo WhatsApp da ótica. */
export function FormRespuesta({ jid }: { jid: string }) {
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    iniciar(async () => {
      const r = await responderConversacionAccion(jid, texto);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setTexto("");
      toast.success(t.whatsapp.enviada);
    });
  }

  return (
    <form onSubmit={enviar} className="flex items-end gap-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          // Enter envia; Shift+Enter quebra a linha (como no WhatsApp Web).
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={t.whatsapp.respuesta}
        rows={1}
        maxLength={4000}
        className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      />
      <Button
        type="submit"
        size="icon"
        disabled={pendiente || !texto.trim()}
        aria-label={t.whatsapp.enviar}
        className="size-10 shrink-0 rounded-full bg-green-600 text-white hover:bg-green-700"
      >
        <SendHorizontal />
      </Button>
    </form>
  );
}

/** Com o WhatsApp conectado, novas mensagens e respostas da IA aparecem sem recarregar a página. */
export function RefrescoConversaciones({ cadaMs = 10_000 }: { cadaMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      // Não atrapalha quem está digitando uma resposta.
      if (document.visibilityState === "visible" && document.activeElement?.tagName !== "TEXTAREA") router.refresh();
    }, cadaMs);
    return () => clearInterval(id);
  }, [cadaMs, router]);
  return null;
}
