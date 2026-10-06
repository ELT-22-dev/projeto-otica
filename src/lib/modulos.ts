/**
 * Módulos visíveis no sistema. O piloto da Óticas Latina usa só o essencial:
 * registrar pedidos, avisar pelo WhatsApp quando estão prontos, lembrar da renovação e a agenda.
 * Os demais continuam no código e voltam acrescentando o nome aqui.
 */
export const MODULOS = [
  "inicio",
  "clientes",
  "recetas",
  "ventas",
  "pedidos",
  "agenda",
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

export const MODULOS_ACTIVOS: readonly Modulo[] = [
  "pedidos",
  "clientes",
  "agenda",
  "renovaciones",
  "whatsapp",
  "configuracion",
];

export function moduloActivo(m: Modulo): boolean {
  return MODULOS_ACTIVOS.includes(m);
}

/** Para onde o usuário vai depois do login. */
export const RUTA_INICIAL = moduloActivo("inicio") ? "/inicio" : "/pedidos";
