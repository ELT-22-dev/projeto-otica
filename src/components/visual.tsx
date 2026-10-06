import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORES_AVATAR = [
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-fuchsia-100 text-fuchsia-700",
];

function hash(texto: string): number {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

/** Cada cliente sempre com a mesma cor, para reconhecer de relance. */
export function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        COLORES_AVATAR[hash(nombre) % COLORES_AVATAR.length],
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}

export const TONOS = {
  violeta: "bg-violet-100 text-violet-700",
  rosa: "bg-pink-100 text-pink-700",
  cielo: "bg-sky-100 text-sky-700",
  ambar: "bg-amber-100 text-amber-700",
  esmeralda: "bg-emerald-100 text-emerald-700",
  pizarra: "bg-slate-100 text-slate-600",
  naranja: "bg-orange-100 text-orange-700",
  verde: "bg-green-100 text-green-700",
  azul: "bg-blue-100 text-blue-700",
  indigo: "bg-indigo-100 text-indigo-700",
  teal: "bg-teal-100 text-teal-700",
  fucsia: "bg-fuchsia-100 text-fuchsia-700",
  rojo: "bg-red-100 text-red-700",
} as const;
export type Tono = keyof typeof TONOS;

export function IconoTono({ icono: Icono, tono, className }: { icono: LucideIcon; tono: Tono; className?: string }) {
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONOS[tono], className)}>
      <Icono className="size-4" />
    </span>
  );
}

/** Cabeçalho de bloco: ícone colorido + título discreto. */
export function TituloSeccion({
  icono,
  tono,
  children,
  extra,
}: {
  icono: LucideIcon;
  tono: Tono;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <IconoTono icono={icono} tono={tono} />
      <h2 className="flex-1 text-sm font-semibold">{children}</h2>
      {extra}
    </div>
  );
}

/** "claro": para usar sobre o fundo colorido da marca. */
export function Logo({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl text-white",
        claro ? "bg-white/15 backdrop-blur" : "bg-marca shadow-md shadow-violet-500/25",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="size-6" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
          <circle cx="20" cy="36" r="9" />
          <circle cx="44" cy="36" r="9" />
          <path d="M29 35c2-2 4-2 6 0M11 34l-3-9M53 34l3-9" />
        </g>
      </svg>
    </div>
  );
}
