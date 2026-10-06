"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Eye,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Palette,
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
import { SelectorTema } from "@/components/SelectorTema";
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
  /** Números do dia para o quadro "Hoy" da barra lateral (desktop). */
  resumen?: { porAvisar: number; enLaboratorio: number; listos: number; citas: number };
  /** Tema de cor atual (cookie), para o seletor. */
  tema?: string;
}

function CuadroHoy({ resumen }: { resumen: NonNullable<Props["resumen"]> }) {
  const filas = [
    { etiqueta: t.hoy.paraAvisar, valor: resumen.porAvisar, href: "/pedidos", punto: "bg-red-400" },
    {
      etiqueta: t.hoy.enLaboratorio,
      valor: resumen.enLaboratorio,
      href: "/pedidos?estado=en_laboratorio",
      punto: "bg-amber-300",
    },
    { etiqueta: t.hoy.listos, valor: resumen.listos, href: "/pedidos?estado=listo", punto: "bg-emerald-400" },
    ...(moduloActivo("agenda")
      ? [{ etiqueta: t.hoy.citas, valor: resumen.citas, href: "/agenda", punto: "bg-cyan-300" }]
      : []),
  ];
  return (
    <div className="mx-3 mb-3 hidden rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur lg:block">
      <p className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-white/70 uppercase">{t.hoy.titulo}</p>
      <ul className="flex flex-col">
        {filas.map((f) => (
          <li key={f.etiqueta}>
            <Link
              href={f.href}
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-white/85 hover:bg-white/10"
            >
              <span className={cn("size-2 rounded-full", f.punto)} />
              <span className="flex-1">{f.etiqueta}</span>
              <span className="font-semibold text-white tabular-nums">{f.valor}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sinal vermelho com quantos clientes esperam aviso. */
function Contador({ n, className }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      aria-label={t.porAvisar.resumen(n)}
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] leading-none font-bold text-white shadow-sm ring-2 ring-white/80",
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
    href: "/agenda",
    etiqueta: t.nav.agenda,
    Icono: CalendarDays,
    activo: "bg-cyan-100 text-cyan-700",
    icono: "text-cyan-600",
    tile: "bg-cyan-100 text-cyan-700",
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

/** O fluxo do dia vem primeiro: pedidos, agenda, renovações e avisos; o resto segue a ordem do menu completo. */
const PRIMEIROS = ["/inicio", "/pedidos", "/agenda", "/renovaciones", "/whatsapp"];
const prioridad = (href: string) => {
  const i = PRIMEIROS.indexOf(href);
  return i >= 0 ? i - PRIMEIROS.length : ITEMS.findIndex((x) => x.href === href);
};

function useNavegacion(esAdmin: boolean) {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/pedidos" ? ruta.startsWith("/pedidos") && ruta !== "/pedidos/nuevo" : ruta.startsWith(href);
  const items = ITEMS.filter((i) => moduloActivo(i.href.slice(1) as Modulo) && (!i.soloAdmin || esAdmin)).sort(
    (a, b) => prioridad(a.href) - prioridad(b.href),
  );
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

/** Escolha de cor no trilho estreito (tablet): abre ao lado. */
function BotonTema({ tema }: { tema?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title={t.temas.titulo}
        aria-label={t.temas.titulo}
        aria-expanded={abierto}
        className="flex size-9 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
      >
        <Palette className="size-4" />
      </button>
      {abierto && (
        <div className="absolute bottom-0 left-12 z-40 w-44 rounded-2xl bg-card p-3 text-foreground shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t.temas.titulo}</p>
          <SelectorTema inicial={tema} />
        </div>
      )}
    </div>
  );
}

/**
 * Painel flutuante no degradê do tema.
 * Tablet (md): trilho estreito com ícones e rótulos curtos. Desktop (lg): barra completa.
 */
export function BarraLateral({ esAdmin, optica, usuario, avisos = {}, resumen, tema }: Props) {
  const { ruta, activo, items } = useNavegacion(esAdmin);

  return (
    <aside className="bg-painel fixed inset-y-3 left-3 z-30 hidden w-20 flex-col items-center rounded-3xl text-white shadow-lg md:flex lg:w-64 lg:items-stretch">
      <AtajosTeclado />
      <div className="flex items-center gap-3 py-5 lg:px-5">
        <Logo claro />
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-semibold">{optica}</p>
          <p className="truncate text-xs text-white/60">{t.app.nombre}</p>
        </div>
      </div>

      <div className="lg:px-4">
        <Link
          href="/pedidos/nuevo"
          title={t.nuevo.titulo}
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl bg-white font-semibold text-tema-700 shadow-lg shadow-black/20 transition hover:bg-tema-50 active:scale-95",
            "lg:h-11 lg:w-full lg:justify-start lg:gap-2 lg:rounded-xl lg:px-4",
            ruta === "/pedidos/nuevo" && "ring-4 ring-white/30",
          )}
        >
          <Plus className="size-5" />
          <span className="hidden lg:inline">{t.nuevo.titulo}</span>
          <kbd className="ml-auto hidden rounded-md bg-tema-100 px-1.5 text-xs font-normal text-tema-700 lg:inline">
            N
          </kbd>
        </Link>
      </div>

      <nav className="mt-4 flex w-full flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2 lg:px-3">
        {items.map(({ href, etiqueta, Icono, pronto }) => (
          <Link
            key={href}
            href={href}
            title={etiqueta}
            className={cn(
              "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-center text-[10px] leading-tight transition",
              "lg:h-10 lg:flex-row lg:gap-3 lg:px-3 lg:py-0 lg:text-left lg:text-sm",
              activo(href)
                ? "bg-white font-semibold text-tema-800 shadow-md shadow-black/15"
                : "text-white/75 hover:bg-white/10 hover:text-white",
            )}
          >
            <span className="relative">
              <Icono className={cn("size-5 shrink-0 lg:size-4", activo(href) && "text-tema-600")} />
              <Contador n={avisos[href]} className="absolute -top-2 -right-3 lg:hidden" />
            </span>
            <span className="lg:flex-1 lg:truncate">{etiqueta}</span>
            <Contador n={avisos[href]} className="hidden lg:flex" />
            {pronto && <EtiquetaPronto className="hidden lg:inline" />}
          </Link>
        ))}
      </nav>

      {resumen && <CuadroHoy resumen={resumen} />}

      <div className="hidden px-4 pb-2 lg:block">
        <p className="mb-2 text-xs font-medium text-white/60">{t.temas.titulo}</p>
        <SelectorTema inicial={tema} claro />
      </div>

      <div className="flex w-full flex-col items-center gap-2 border-t border-white/10 py-3 lg:flex-row lg:px-4">
        <BotonTema tema={tema} />
        <span
          title={usuario}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white"
        >
          {iniciales(usuario)}
        </span>
        <p className="hidden min-w-0 flex-1 truncate text-sm lg:block">{usuario}</p>
        <form action={cerrarSesionAccion}>
          <button
            type="submit"
            title={t.nav.salir}
            className="flex items-center gap-1.5 rounded-lg p-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            <span className="hidden lg:inline">{t.nav.salir}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

const EN_BARRA_CELULAR = ["/pedidos", "/agenda", "/whatsapp"];

/**
 * Celular (< md). Com até 4 módulos: todos na barra, com Nuevo no centro.
 * Com mais: 3 atalhos + Nuevo + "Más" com todos os módulos.
 */
export function NavInferior({ esAdmin, avisos = {}, tema }: Pick<Props, "esAdmin" | "avisos" | "tema">) {
  const { ruta, activo, items } = useNavegacion(esAdmin);
  const [abierto, setAbierto] = useState(false);
  const fijos = EN_BARRA_CELULAR.map((h) => items.find((i) => i.href === h)).filter((i): i is Item => Boolean(i));
  const enMas = !fijos.some((i) => activo(i.href)) && ruta !== "/pedidos/nuevo";
  // Quem espera ação nas seções que ficaram dentro do "Más".
  const avisosEnMas = items.filter((i) => !fijos.includes(i)).reduce((total, i) => total + (avisos[i.href] ?? 0), 0);

  const nuevo = (
    <Link
      href="/pedidos/nuevo"
      aria-label={t.nuevo.titulo}
      className={cn(
        "bg-marca -mt-6 flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-background transition active:scale-95",
        ruta === "/pedidos/nuevo" && "ring-tema-200",
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
        activo(item.href) && "font-semibold text-tema-700",
      )}
    >
      <span className="relative">
        <item.Icono className={cn("size-5", activo(item.href) && "text-tema-600")} />
        <Contador n={avisos[item.href]} className="absolute -top-2 -right-3" />
      </span>
      {item.etiqueta}
    </Link>
  );

  if (items.length <= 4) {
    const mitad = Math.ceil(items.length / 2);
    return (
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 rounded-3xl bg-card/90 shadow-lg backdrop-blur-xl md:hidden">
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
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 rounded-3xl bg-card/90 shadow-lg backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around gap-1 px-1 py-2">
          {fijos.slice(0, 2).map(boton)}
          {nuevo}
          {fijos.slice(2).map(boton)}
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className={cn(
              "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[11px] text-muted-foreground",
              enMas && "font-semibold text-tema-700",
            )}
          >
            <span className="relative">
              <LayoutGrid className={cn("size-5", enMas && "text-tema-600")} />
              <Contador n={avisosEnMas} className="absolute -top-2 -right-3" />
            </span>
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
                    "flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center text-xs font-medium shadow-xs transition active:scale-95",
                    activo(href) && "border-tema-300 bg-tema-50",
                  )}
                >
                  <span className={cn("relative flex size-11 items-center justify-center rounded-xl", tile)}>
                    <Icono className="size-5" />
                    <Contador n={avisos[href]} className="absolute -top-1.5 -right-1.5" />
                  </span>
                  <span className="leading-tight">{etiqueta}</span>
                  {pronto && <EtiquetaPronto />}
                </Link>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-muted/60 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t.temas.titulo}</p>
              <SelectorTema inicial={tema} />
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
