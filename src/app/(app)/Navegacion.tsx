"use client";

import {
  BarChart3,
  ClipboardList,
  Eye,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  RefreshCcw,
  Settings,
  ShoppingCart,
  Sparkles,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, iniciales } from "@/components/visual";
import { t } from "@/i18n";
import { moduloActivo, type Modulo } from "@/lib/modulos";
import { cn } from "@/lib/utils";
import { cerrarSesionAccion } from "./acciones";

interface Props {
  esAdmin: boolean;
  optica: string;
  usuario: string;
  /** Clientes esperando aviso, por seção (ex.: "/pedidos": 2). */
  avisos?: Record<string, number>;
}

/** Sinal vermelho com quantos clientes esperam aviso. */
function Contador({ n, className }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      aria-label={t.porAvisar.resumen(n)}
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] leading-none font-bold text-white ring-2 ring-card",
        className,
      )}
    >
      {n}
    </span>
  );
}

interface Item {
  href: string;
  etiqueta: string;
  Icono: LucideIcon;
  /** Fundo + texto quando ativo, e cor do ícone. Classes literais para o Tailwind encontrar. */
  activo: string;
  icono: string;
  tile: string;
  soloAdmin?: boolean;
  pronto?: boolean;
}

/** Na ordem pedida pelo cliente. */
const ITEMS: Item[] = [
  {
    href: "/inicio",
    etiqueta: t.nav.inicio,
    Icono: LayoutDashboard,
    activo: "bg-violet-100 text-violet-700",
    icono: "text-violet-600",
    tile: "bg-violet-100 text-violet-700",
  },
  {
    href: "/clientes",
    etiqueta: t.nav.clientes,
    Icono: Users,
    activo: "bg-sky-100 text-sky-700",
    icono: "text-sky-600",
    tile: "bg-sky-100 text-sky-700",
  },
  {
    href: "/recetas",
    etiqueta: t.nav.recetas,
    Icono: Eye,
    activo: "bg-pink-100 text-pink-700",
    icono: "text-pink-600",
    tile: "bg-pink-100 text-pink-700",
  },
  {
    href: "/ventas",
    etiqueta: t.nav.ventas,
    Icono: ShoppingCart,
    activo: "bg-emerald-100 text-emerald-700",
    icono: "text-emerald-600",
    tile: "bg-emerald-100 text-emerald-700",
    pronto: true,
  },
  {
    href: "/pedidos",
    etiqueta: t.nav.pedidos,
    Icono: ClipboardList,
    activo: "bg-indigo-100 text-indigo-700",
    icono: "text-indigo-600",
    tile: "bg-indigo-100 text-indigo-700",
  },
  {
    href: "/renovaciones",
    etiqueta: t.nav.renovaciones,
    Icono: RefreshCcw,
    activo: "bg-rose-100 text-rose-700",
    icono: "text-rose-600",
    tile: "bg-rose-100 text-rose-700",
  },
  {
    href: "/inventario",
    etiqueta: t.nav.inventario,
    Icono: Package,
    activo: "bg-amber-100 text-amber-800",
    icono: "text-amber-600",
    tile: "bg-amber-100 text-amber-800",
    pronto: true,
  },
  {
    href: "/laboratorio",
    etiqueta: t.nav.laboratorio,
    Icono: FlaskConical,
    activo: "bg-orange-100 text-orange-700",
    icono: "text-orange-600",
    tile: "bg-orange-100 text-orange-700",
  },
  {
    href: "/finanzas",
    etiqueta: t.nav.finanzas,
    Icono: Wallet,
    activo: "bg-teal-100 text-teal-700",
    icono: "text-teal-600",
    tile: "bg-teal-100 text-teal-700",
    soloAdmin: true,
  },
  {
    href: "/whatsapp",
    etiqueta: t.nav.crm,
    Icono: MessageCircle,
    activo: "bg-green-100 text-green-700",
    icono: "text-green-600",
    tile: "bg-green-100 text-green-700",
  },
  {
    href: "/reportes",
    etiqueta: t.nav.reportes,
    Icono: BarChart3,
    activo: "bg-blue-100 text-blue-700",
    icono: "text-blue-600",
    tile: "bg-blue-100 text-blue-700",
    soloAdmin: true,
  },
  {
    href: "/asistente",
    etiqueta: t.nav.asistente,
    Icono: Sparkles,
    activo: "bg-fuchsia-100 text-fuchsia-700",
    icono: "text-fuchsia-600",
    tile: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    href: "/usuarios",
    etiqueta: t.nav.usuarios,
    Icono: UserCog,
    activo: "bg-slate-200 text-slate-800",
    icono: "text-slate-500",
    tile: "bg-slate-100 text-slate-700",
    soloAdmin: true,
  },
  {
    href: "/configuracion",
    etiqueta: t.nav.ajustes,
    Icono: Settings,
    activo: "bg-slate-200 text-slate-800",
    icono: "text-slate-500",
    tile: "bg-slate-100 text-slate-700",
    soloAdmin: true,
  },
];

function useNavegacion(esAdmin: boolean) {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/pedidos" ? ruta.startsWith("/pedidos") && ruta !== "/pedidos/nuevo" : ruta.startsWith(href);
  const items = ITEMS.filter((i) => moduloActivo(i.href.slice(1) as Modulo) && (!i.soloAdmin || esAdmin));
  return { ruta, activo, items };
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

function EtiquetaPronto({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground", className)}>
      {t.nav.pronto}
    </span>
  );
}

/**
 * Tablet (md): trilho estreito com ícones e rótulos curtos.
 * Desktop (lg): barra completa com nome da ótica e usuário.
 */
export function BarraLateral({ esAdmin, optica, usuario, avisos = {} }: Props) {
  const { ruta, activo, items } = useNavegacion(esAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center border-r bg-card md:flex lg:w-64 lg:items-stretch">
      <AtajosTeclado />
      <div className="flex items-center gap-3 py-4 lg:px-5">
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
            "bg-marca flex size-11 items-center justify-center rounded-2xl font-medium text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-95",
            "lg:h-10 lg:w-full lg:justify-start lg:gap-2 lg:rounded-xl lg:px-4",
            ruta === "/pedidos/nuevo" && "ring-4 ring-violet-200",
          )}
        >
          <Plus className="size-5" />
          <span className="hidden lg:inline">{t.nuevo.titulo}</span>
          <kbd className="ml-auto hidden rounded-md bg-white/20 px-1.5 text-xs font-normal lg:inline">N</kbd>
        </Link>
      </div>

      <nav className="mt-3 flex w-full flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2 lg:px-3">
        {items.map(({ href, etiqueta, Icono, activo: claseActiva, icono, pronto }) => (
          <Link
            key={href}
            href={href}
            title={etiqueta}
            className={cn(
              "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-center text-[10px] leading-tight transition",
              "lg:h-9 lg:flex-row lg:gap-3 lg:px-3 lg:py-0 lg:text-left lg:text-sm",
              activo(href)
                ? cn(claseActiva, "font-medium")
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="relative">
              <Icono className={cn("size-5 shrink-0 lg:size-4", !activo(href) && icono)} />
              <Contador n={avisos[href]} className="absolute -top-2 -right-3 lg:hidden" />
            </span>
            <span className="lg:flex-1 lg:truncate">{etiqueta}</span>
            <Contador n={avisos[href]} className="hidden lg:flex" />
            {pronto && <EtiquetaPronto className="hidden lg:inline" />}
          </Link>
        ))}
      </nav>

      <div className="flex w-full flex-col items-center gap-2 border-t py-3 lg:flex-row lg:px-4">
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

const EN_BARRA_CELULAR = ["/inicio", "/pedidos", "/clientes"];

/**
 * Celular (< md). Com até 4 módulos: todos na barra, com Nuevo no centro.
 * Com mais: 3 atalhos + Nuevo + "Más" com todos os módulos.
 */
export function NavInferior({ esAdmin, avisos = {} }: Pick<Props, "esAdmin" | "avisos">) {
  const { ruta, activo, items } = useNavegacion(esAdmin);
  const [abierto, setAbierto] = useState(false);
  const fijos = EN_BARRA_CELULAR.map((h) => items.find((i) => i.href === h)).filter((i): i is Item => Boolean(i));
  const enMas = !fijos.some((i) => activo(i.href)) && ruta !== "/pedidos/nuevo";

  const nuevo = (
    <Link
      href="/pedidos/nuevo"
      aria-label={t.nuevo.titulo}
      className={cn(
        "bg-marca flex size-12 items-center justify-center rounded-full text-white shadow-lg shadow-violet-500/30 transition active:scale-95",
        ruta === "/pedidos/nuevo" && "ring-4 ring-violet-200",
      )}
    >
      <Plus className="size-6" />
    </Link>
  );

  const boton = (item: Item) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[11px] text-muted-foreground transition",
        activo(item.href) && "font-semibold text-foreground",
      )}
    >
      <span className="relative">
        <item.Icono className={cn("size-5", activo(item.href) && item.icono)} />
        <Contador n={avisos[item.href]} className="absolute -top-2 -right-3" />
      </span>
      {item.etiqueta}
    </Link>
  );

  if (items.length <= 4) {
    const mitad = Math.ceil(items.length / 2);
    return (
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around gap-1 px-1 py-2">
          {items.slice(0, mitad).map(boton)}
          {nuevo}
          {items.slice(mitad).map(boton)}
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around gap-1 px-1 py-2">
          {fijos.slice(0, 2).map(boton)}
          {nuevo}
          {fijos.slice(2).map(boton)}
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className={cn(
              "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[11px] text-muted-foreground",
              enMas && "font-semibold text-foreground",
            )}
          >
            <LayoutGrid className={cn("size-5", enMas && "text-violet-600")} />
            {t.nav.mas}
          </button>
        </div>
      </nav>

      {abierto && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal aria-label={t.nav.menu}>
          <button
            type="button"
            aria-label={t.nav.cerrar}
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">{t.nav.menu}</p>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label={t.nav.cerrar}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items.map(({ href, etiqueta, Icono, tile, pronto }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setAbierto(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-medium transition active:scale-95",
                    activo(href) && "border-violet-300 bg-violet-50",
                  )}
                >
                  <span className={cn("flex size-11 items-center justify-center rounded-xl", tile)}>
                    <Icono className="size-5" />
                  </span>
                  <span className="leading-tight">{etiqueta}</span>
                  {pronto && <EtiquetaPronto />}
                </Link>
              ))}
            </div>
            <form action={cerrarSesionAccion} className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm text-muted-foreground"
              >
                <LogOut className="size-4" />
                {t.nav.salir}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
