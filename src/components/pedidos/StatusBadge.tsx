import type { StatusPedido } from "@/domain/pedido/status-pedido";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export const COLOR_STATUS: Record<StatusPedido, string> = {
  en_laboratorio: "bg-amber-100 text-amber-900 ring-amber-300",
  listo: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  entregado: "bg-zinc-100 text-zinc-700 ring-zinc-300",
  cancelado: "bg-red-50 text-red-700 ring-red-200",
};

export const BORDE_STATUS: Record<StatusPedido, string> = {
  en_laboratorio: "border-l-amber-400",
  listo: "border-l-emerald-500",
  entregado: "border-l-zinc-300",
  cancelado: "border-l-red-300",
};

export function StatusBadge({ status, className }: { status: StatusPedido; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset",
        COLOR_STATUS[status],
        className,
      )}
    >
      {t.status[status]}
    </span>
  );
}
