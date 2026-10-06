"use client";

import { ArrowUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import type { MensajeAsistente } from "@/application";
import { iniciales } from "@/components/visual";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { preguntarAsistenteAccion } from "../acciones";

/** O servidor aceita até 12 mensagens de histórico. */
const MAX_HISTORIAL = 12;

/** Formatação mínima pedida ao modelo: linhas "- " viram lista e **x** vira negrito. */
function TextoFormateado({ texto }: { texto: string }) {
  const negritas = (linea: string) =>
    linea.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
      parte.startsWith("**") && parte.endsWith("**") ? (
        <strong key={i} className="font-semibold">
          {parte.slice(2, -2)}
        </strong>
      ) : (
        <Fragment key={i}>{parte}</Fragment>
      ),
    );

  const bloques: React.ReactNode[] = [];
  let lista: string[] = [];
  const cerrarLista = () => {
    if (lista.length) {
      bloques.push(
        <ul key={bloques.length} className="my-1 flex list-disc flex-col gap-1 pl-5">
          {lista.map((item, i) => (
            <li key={i}>{negritas(item)}</li>
          ))}
        </ul>,
      );
      lista = [];
    }
  };
  for (const linea of texto.split("\n")) {
    const item = /^\s*[-•*]\s+(.*)$/.exec(linea);
    if (item) {
      lista.push(item[1]!);
      continue;
    }
    cerrarLista();
    if (linea.trim()) bloques.push(<p key={bloques.length}>{negritas(linea)}</p>);
  }
  cerrarLista();
  return <div className="flex flex-col gap-2">{bloques}</div>;
}

export function ChatAsistente({ nombreUsuario }: { nombreUsuario: string }) {
  const [mensajes, setMensajes] = useState<MensajeAsistente[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pensando, iniciar] = useTransition();
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, pensando]);

  function preguntar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || pensando) return;
    const historial = mensajes.slice(-MAX_HISTORIAL);
    setMensajes((m) => [...m, { rol: "usuario", texto: limpia }]);
    setTexto("");
    setError(null);
    iniciar(async () => {
      let r;
      try {
        r = await preguntarAsistenteAccion({ pregunta: limpia, historial });
      } catch {
        r = { ok: false as const, error: t.app.sinConexion };
      }
      if (r.ok) setMensajes((m) => [...m, { rol: "asistente", texto: r.data }]);
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {mensajes.length === 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {t.asistente.sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => preguntar(s)}
              className="rounded-2xl border bg-card p-4 text-left text-sm shadow-xs transition hover:border-violet-300 hover:bg-violet-50/50"
            >
              <Sparkles className="mb-2 size-4 text-fuchsia-500" />
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {mensajes.map((m, i) =>
            m.rol === "usuario" ? (
              <div key={i} className="flex items-end justify-end gap-2">
                <p className="bg-marca max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white shadow-sm">
                  {m.texto}
                </p>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {iniciales(nombreUsuario)}
                </span>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600">
                  <Sparkles className="size-4" />
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md border bg-card px-4 py-3 text-sm shadow-xs">
                  <TextoFormateado texto={m.texto} />
                </div>
              </div>
            ),
          )}
          {pensando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600">
                <Loader2 className="size-4 animate-spin" />
              </span>
              {t.asistente.pensando}
            </div>
          )}
          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div ref={fin} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          preguntar(texto);
        }}
        className="sticky bottom-24 z-10 flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-lg shadow-violet-500/5 md:bottom-6"
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              preguntar(texto);
            }
          }}
          placeholder={t.asistente.placeholder}
          rows={1}
          maxLength={500}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
        {mensajes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMensajes([]);
              setError(null);
            }}
            title={t.asistente.nueva}
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={pensando || !texto.trim()}
          title={t.asistente.enviar}
          className={cn(
            "bg-marca flex size-10 items-center justify-center rounded-xl text-white transition disabled:opacity-40",
          )}
        >
          <ArrowUp className="size-5" />
        </button>
      </form>
      <p className="-mt-2 text-center text-xs text-muted-foreground">{t.asistente.aviso}</p>
    </div>
  );
}
