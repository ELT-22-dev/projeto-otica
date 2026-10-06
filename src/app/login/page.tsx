import { BellRing, ClipboardCheck, RefreshCcw } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/visual";
import { t } from "@/i18n";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: t.login.titulo };

const PUNTOS = [
  { Icono: ClipboardCheck, texto: t.login.puntos.pedidos },
  { Icono: BellRing, texto: t.login.puntos.avisos },
  { Icono: RefreshCcw, texto: t.login.puntos.renovaciones },
];

export default function PaginaLogin() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel da marca: só no desktop */}
      <section className="bg-marca relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-tema-300/25 blur-3xl" aria-hidden />
        <Logo claro className="relative" />
        <div className="relative flex flex-col gap-8">
          <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight">{t.login.lema}</h2>
          <ul className="flex flex-col gap-4">
            {PUNTOS.map(({ Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-white/90">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
                  <Icono className="size-5" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">{t.app.nombre}</p>
      </section>

      <section className="relative flex flex-col justify-center overflow-hidden px-6 py-12">
        {/* Celular/tablet: toque de cor no topo */}
        <div
          className="bg-marca absolute -top-40 left-1/2 size-96 -translate-x-1/2 rounded-full opacity-20 blur-3xl lg:hidden"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <Logo className="size-14 rounded-2xl lg:hidden" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{t.login.titulo}</h1>
              <p className="mt-1 text-muted-foreground">{t.login.subtitulo}</p>
            </div>
          </div>
          <FormLogin />
        </div>
      </section>
    </main>
  );
}
