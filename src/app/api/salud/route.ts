/** Verificação de saúde da hospedagem (Railway): responde sem login e sem tocar no banco. */
export function GET() {
  return Response.json({ ok: true });
}
