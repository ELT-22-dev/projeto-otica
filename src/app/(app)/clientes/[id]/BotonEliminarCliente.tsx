"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { moduloActivo } from "@/lib/modulos";
import { eliminarClienteAccion } from "../../acciones";

export function BotonEliminarCliente({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm text-red-900/80">{t.ficha.eliminarAyuda}</p>
      <Button
        variant="outline"
        disabled={pendiente}
        className="shrink-0 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
        onClick={() => {
          if (!window.confirm(t.ficha.confirmarEliminar(nombre))) return;
          iniciar(async () => {
            const r = await eliminarClienteAccion(id);
            if (!r.ok) {
              toast.error(r.error);
              return;
            }
            toast.success(t.ficha.eliminado);
            router.replace(moduloActivo("clientes") ? "/clientes" : "/pedidos");
          });
        }}
      >
        <Trash2 data-icon="inline-start" />
        {t.ficha.eliminar}
      </Button>
    </section>
  );
}
