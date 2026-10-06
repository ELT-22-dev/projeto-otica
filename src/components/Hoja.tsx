"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { t } from "@/i18n";

/** Painel que sobe de baixo no celular e aparece centralizado no PC. Fecha com Esc ou tocando fora. */
export function Hoja({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal
      aria-label={titulo}
    >
      <button
        type="button"
        aria-label={t.nav.cerrar}
        onClick={onCerrar}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t.nav.cerrar}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
