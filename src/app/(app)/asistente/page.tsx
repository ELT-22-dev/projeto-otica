import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { ChatAsistente } from "./ChatAsistente";

export const metadata: Metadata = { title: t.asistente.titulo };

// Uma pergunta pode envolver algumas consultas ao banco antes da resposta.
export const maxDuration = 120;

export default async function PaginaAsistente() {
  const casos = await casosDeUso();
  const contexto = await casos.obtenerContexto();

  return (
    <div className="flex flex-col gap-5 lg:max-w-3xl">
      <div className="flex items-start gap-3">
        <span className="bg-marca flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-violet-500/25">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{t.asistente.titulo}</h1>
          <p className="text-sm text-muted-foreground">{t.asistente.descripcion}</p>
        </div>
      </div>
      {casos.iaDisponible ? (
        <ChatAsistente nombreUsuario={contexto?.usuario.nombre ?? ""} />
      ) : (
        <p className="rounded-2xl border border-dashed bg-card/50 py-14 text-center text-sm text-muted-foreground">
          {t.errores.ia_no_disponible}
        </p>
      )}
    </div>
  );
}
