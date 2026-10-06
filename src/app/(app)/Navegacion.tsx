"use client";

import { ClipboardList, LogOut, Plus, RefreshCcw, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { cerrarSesionAccion } from "./acciones";

interface Props {
  esAdmin: boolean;
  optica: string;
  usuario: string;
}

function useItemsNavegacion(esAdmin: boolean) {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/pedidos" ? ruta.startsWith("/pedidos") && ruta !== "/pedidos/nuevo" : ruta.startsWith(href);
  const items = [
    { href: "/pedidos", etiqueta: t.nav.pedidos, Icono: ClipboardList },
    { href: "/renovaciones", etiqueta: t.nav.renovaciones, Icono: RefreshCcw },
    ...(esAdmin ? [{ href: "/configuracion", etiqueta: t.nav.ajustes, Icono: Settings }] : []),
  ];
  return { ruta, activo, items };
}

/** No PC: N abre um pedido novo, / vai para a busca. Ignorado enquanto se digita num campo. */
function AtajosTeclado() {
  const router = useRouter();
  useEffect(() => {
    function alPresionar(e: KeyboardEvent) {
      const destino = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || destino.isContentEditable) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(destino.tagName)) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/pedidos/nuevo");
      } else if (e.key === "/") {
        const busqueda = document.querySelector<HTMLInputElement>('input[name="q"]');
        if (busqueda) {
          e.preventDefault();
          busqueda.focus();
        }
      }
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [router]);
  return null;
}

function Logo() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
      <svg viewBox="0 0 64 64" className="size-6" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          <circle cx="20" cy="36" r="9" />
          <circle cx="44" cy="36" r="9" />
          <path d="M29 35c2-2 4-2 6 0M11 34l-3-9M53 34l3-9" />
        </g>
      </svg>
    </div>
  );
}

/** Barra lateral fixa, só em telas grandes (lg+). */
export function BarraLateral({ esAdmin, optica, usuario }: Props) {
  const { ruta, activo, items } = useItemsNavegacion(esAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
      <AtajosTeclado />
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{optica}</p>
          <p className="truncate text-xs text-muted-foreground">{t.app.nombre}</p>
        </div>
      </div>

      <div className="px-4">
        <Link
          href="/pedidos/nuevo"
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90",
            ruta === "/pedidos/nuevo" && "ring-4 ring-primary/25",
          )}
        >
          <Plus className="size-5" />
          {t.nuevo.titulo}
          <kbd className="ml-auto rounded border border-primary-foreground/30 px-1.5 text-xs font-normal opacity-80">
            N
          </kbd>
        </Link>
      </div>

      <nav className="mt-4 flex flex-col gap-1 px-3">
        {items.map(({ href, etiqueta, Icono }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
              activo(href) && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
            )}
          >
            <Icono className="size-4" />
            {etiqueta}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2 border-t px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm">{usuario}</p>
        <form action={cerrarSesionAccion}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            {t.nav.salir}
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Barra inferior, só no celular/tablet (< lg). */
export function NavInferior({ esAdmin }: Pick<Props, "esAdmin">) {
  const { ruta, activo, items } = useItemsNavegacion(esAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-around gap-2 px-2 py-2">
        <Link
          href="/pedidos/nuevo"
          className={cn(
            "order-2 flex h-12 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-md transition active:scale-95",
            ruta === "/pedidos/nuevo" && "ring-4 ring-primary/25",
          )}
        >
          <Plus className="size-5" />
          {t.nav.nuevo}
        </Link>
        {items.map(({ href, etiqueta, Icono }, i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-w-16 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition",
              i === 0 ? "order-1" : "order-3",
              activo(href) && "font-medium text-primary",
            )}
          >
            <Icono className="size-5" />
            {etiqueta}
          </Link>
        ))}
      </div>
    </nav>
  );
}
