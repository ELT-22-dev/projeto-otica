"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { t } from "@/i18n";
import { COOKIE_TEMA, esTema, MUESTRA_TEMA, TEMA_POR_DEFECTO, TEMAS, type Tema } from "@/lib/temas";
import { cn } from "@/lib/utils";

/** Troca as cores na hora e guarda a escolha neste aparelho por 1 ano. */
function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema;
  document.cookie = `${COOKIE_TEMA}=${tema}; path=/; max-age=31536000; samesite=lax`;
}

/** Bolinhas de cor; troca na hora e guarda a escolha neste aparelho por 1 ano. */
export function SelectorTema({
  inicial,
  className,
  claro = false,
}: {
  /** Tema lido do cookie no servidor. */
  inicial: string | undefined;
  className?: string;
  /** Sobre fundo escuro (barra lateral). */
  claro?: boolean;
}) {
  const [tema, setTema] = useState<Tema>(esTema(inicial) ? inicial : TEMA_POR_DEFECTO);

  function elegir(nuevo: Tema) {
    aplicarTema(nuevo);
    setTema(nuevo);
  }

  return (
    <div role="radiogroup" aria-label={t.temas.titulo} className={cn("flex flex-wrap gap-2", className)}>
      {TEMAS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={tema === id}
          title={t.temas.nombres[id]}
          aria-label={t.temas.nombres[id]}
          onClick={() => elegir(id)}
          className={cn(
            "flex size-7 items-center justify-center rounded-full bg-linear-to-br shadow-sm transition hover:scale-110",
            MUESTRA_TEMA[id],
            tema === id &&
              (claro
                ? "ring-2 ring-white ring-offset-2 ring-offset-transparent"
                : "ring-2 ring-foreground/70 ring-offset-2"),
          )}
        >
          {tema === id && <Check className="size-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
