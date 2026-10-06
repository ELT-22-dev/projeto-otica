import type { Metadata } from "next";
import { t } from "@/i18n";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: t.login.titulo };

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <svg viewBox="0 0 64 64" className="size-9" aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
              <circle cx="20" cy="36" r="9" />
              <circle cx="44" cy="36" r="9" />
              <path d="M29 35c2-2 4-2 6 0M11 34l-3-9M53 34l3-9" />
            </g>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.login.titulo}</h1>
          <p className="text-sm text-muted-foreground">{t.login.subtitulo}</p>
        </div>
      </div>
      <FormLogin />
    </main>
  );
}
