import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/** Âmbar = laboratório, verde = pronto, cinza = entregue. */
const ESTILO: Record<StatusPedido, { fondo: string; punto: string }> = {
  en_laboratorio: { fondo: "bg-amber-50 text-amber-800 ring-amber-200", punto: "bg-amber-500" },
  listo: { fondo: "bg-emerald-50 text-emerald-800 ring-emerald-200", punto: "bg-emerald-500" },
  entregado: { fondo: "bg-slate-100 text-slate-700 ring-slate-200", punto: "bg-slate-400" },
  cancelado: { fondo: "bg-red-50 text-red-700 ring-red-200", punto: "bg-red-500" },
};

export function StatusBadge({ status, className }: { status: StatusPedido; className?: string }) {
  const { fondo, punto } = ESTILO[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset",
        fondo,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", punto)} />
      {t.status[status]}
    </span>
  );
}
