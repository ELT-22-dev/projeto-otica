"use client";

import { ClipboardList, LogOut, Plus, RefreshCcw, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo, iniciales } from "@/components/visual";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { cerrarSesionAccion } from "./acciones";

interface Props {
  esAdmin: boolean;
  optica: string;
  usuario: string;
}

/** Cada seção tem sua cor; o item ativo ganha o fundo suave dela. */
const ITEMS = [
  {
    href: "/pedidos",
    etiqueta: t.nav.pedidos,
    Icono: ClipboardList,
    activo: "bg-violet-100 text-violet-700",
    icono: "text-violet-600",
    soloAdmin: false,
  },
  {
    href: "/renovaciones",
    etiqueta: t.nav.renovaciones,
    Icono: RefreshCcw,
    activo: "bg-pink-100 text-pink-700",
    icono: "text-pink-600",
    soloAdmin: false,
  },
  {
    href: "/configuracion",
    etiqueta: t.nav.ajustes,
    Icono: Settings,
    activo: "bg-sky-100 text-sky-700",
    icono: "text-sky-600",
    soloAdmin: true,
  },
];

function useNavegacion(esAdmin: boolean) {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/pedidos" ? ruta.startsWith("/pedidos") && ruta !== "/pedidos/nuevo" : ruta.startsWith(href);
  return { ruta, activo, items: ITEMS.filter((i) => !i.soloAdmin || esAdmin) };
}

/** Com teclado (tablet ou PC): N abre um pedido novo, / vai para a busca. */
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

/**
 * Tablet (md): trilho estreito com ícones e rótulos curtos.
 * Desktop (lg): barra completa com nome da ótica e usuário.
 */
export function BarraLateral({ esAdmin, optica, usuario }: Props) {
  const { ruta, activo, items } = useNavegacion(esAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center border-r bg-card md:flex lg:w-64 lg:items-stretch">
      <AtajosTeclado />
      <div className="flex items-center gap-3 py-5 lg:px-5">
        <Logo />
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-semibold">{optica}</p>
          <p className="truncate text-xs text-muted-foreground">{t.app.nombre}</p>
        </div>
      </div>

      <div className="lg:px-4">
        <Link
          href="/pedidos/nuevo"
          title={t.nuevo.titulo}
          className={cn(
            "bg-marca flex size-12 items-center justify-center rounded-2xl font-medium text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-95",
            "lg:h-11 lg:w-full lg:justify-start lg:gap-2 lg:rounded-xl lg:px-4",
            ruta === "/pedidos/nuevo" && "ring-4 ring-violet-200",
          )}
        >
          <Plus className="size-5" />
          <span className="hidden lg:inline">{t.nuevo.titulo}</span>
          <kbd className="ml-auto hidden rounded-md bg-white/20 px-1.5 text-xs font-normal lg:inline">N</kbd>
        </Link>
      </div>

      <nav className="mt-6 flex w-full flex-col gap-1 px-2 lg:px-3">
        {items.map(({ href, etiqueta, Icono, activo: claseActiva, icono }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[11px] transition",
              "lg:h-10 lg:flex-row lg:gap-3 lg:px-3 lg:py-0 lg:text-sm",
              activo(href)
                ? cn(claseActiva, "font-medium")
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icono className={cn("size-5 lg:size-4", !activo(href) && icono)} />
            {etiqueta}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-2 border-t py-3 lg:flex-row lg:px-4">
        <span
          title={usuario}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
        >
          {iniciales(usuario)}
        </span>
        <p className="hidden min-w-0 flex-1 truncate text-sm lg:block">{usuario}</p>
        <form action={cerrarSesionAccion}>
          <button
            type="submit"
            title={t.nav.salir}
            className="flex items-center gap-1.5 rounded-lg p-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            <span className="hidden lg:inline">{t.nav.salir}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Celular (< md): barra inferior com o botão de novo pedido no centro. */
export function NavInferior({ esAdmin }: Pick<Props, "esAdmin">) {
  const { ruta, activo, items } = useNavegacion(esAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-around gap-2 px-2 py-2">
        <Link
          href="/pedidos/nuevo"
          className={cn(
            "bg-marca order-2 flex h-12 items-center gap-2 rounded-full px-5 font-medium text-white shadow-lg shadow-violet-500/30 transition active:scale-95",
            ruta === "/pedidos/nuevo" && "ring-4 ring-violet-200",
          )}
        >
          <Plus className="size-5" />
          {t.nav.nuevo}
        </Link>
        {items.map(({ href, etiqueta, Icono, icono }, i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs text-muted-foreground transition",
              i === 0 ? "order-1" : "order-3",
              activo(href) && "font-semibold text-foreground",
            )}
          >
            <Icono className={cn("size-5", activo(href) && icono)} />
            {etiqueta}
          </Link>
        ))}
      </div>
    </nav>
  );
}
