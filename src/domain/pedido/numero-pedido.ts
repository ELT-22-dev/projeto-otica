/** "0001": usado dentro das mensagens, onde o template já traz o "#". */
export function numeroPedidoSinPrefijo(numero: number): string {
  return String(numero).padStart(4, "0");
}

export function formatearNumeroPedido(numero: number): string {
  return `#${numeroPedidoSinPrefijo(numero)}`;
}

/** Reconhece "#12", "0012" ou "12" digitados na busca. */
export function parsearNumeroPedido(texto: string): number | null {
  const m = /^#?\s*(\d{1,9})$/.exec(texto.trim());
  if (!m) return null;
  const numero = Number(m[1]);
  return numero > 0 ? numero : null;
}
