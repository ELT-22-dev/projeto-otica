/** Temas de cor (ver globals.css). Escolha por pessoa/aparelho, guardada no cookie "tema". */
export const TEMAS = ["violeta", "oceano", "esmeralda", "coral", "sol", "grafito"] as const;
export type Tema = (typeof TEMAS)[number];
export const TEMA_POR_DEFECTO: Tema = "violeta";
export const COOKIE_TEMA = "tema";

export function esTema(valor: unknown): valor is Tema {
  return typeof valor === "string" && (TEMAS as readonly string[]).includes(valor);
}

/** Amostra de cada tema no seletor. Classes literais para o Tailwind encontrar. */
export const MUESTRA_TEMA: Record<Tema, string> = {
  violeta: "from-violet-500 to-fuchsia-500",
  oceano: "from-blue-600 to-cyan-400",
  esmeralda: "from-emerald-500 to-sky-500",
  coral: "from-orange-500 to-pink-500",
  sol: "from-amber-400 to-orange-500",
  grafito: "from-slate-600 to-slate-400",
};
