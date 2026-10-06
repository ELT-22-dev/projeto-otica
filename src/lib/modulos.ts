/**
 * Módulos visíveis no sistema. O piloto da Óticas Latina usa só o essencial:
 * registrar pedidos, avisar pelo WhatsApp quando estão prontos e lembrar da renovação.
 * Os demais continuam no código e voltam acrescentando o nome aqui.
 */
export const MODULOS = [
  "inicio",
  "clientes",
  "recetas",
  "ventas",
  "pedidos",
  "renovaciones",
  "inventario",
  "laboratorio",
  "finanzas",
  "whatsapp",
  "reportes",
  "asistente",
  "usuarios",
  "configuracion",
] as const;
export type Modulo = (typeof MODULOS)[number];

export const MODULOS_ACTIVOS: readonly Modulo[] = ["pedidos", "renovaciones", "configuracion"];

export function moduloActivo(m: Modulo): boolean {
  return MODULOS_ACTIVOS.includes(m);
}

/** Para onde o usuário vai depois do login. */
export const RUTA_INICIAL = moduloActivo("inicio") ? "/inicio" : "/pedidos";
