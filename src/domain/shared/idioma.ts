export const IDIOMAS = ["es", "pt"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === "string" && (IDIOMAS as readonly string[]).includes(valor);
}
