import type { Metadata } from "next";
import { fechaLocal } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { FormNuevoPedido } from "./FormNuevoPedido";

export const metadata: Metadata = { title: t.nuevo.titulo };

// Leitura da receita por IA pode levar alguns segundos.
export const maxDuration = 60;

export default async function PaginaNuevoPedido() {
  const casos = await casosDeUso();
  const contexto = await casos.obtenerContexto();
  return (
    <div className="flex flex-col gap-4 lg:max-w-5xl lg:gap-6">
      <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">{t.nuevo.titulo}</h1>
      <FormNuevoPedido
        hoy={fechaLocal(new Date())}
        idiomaDefault={contexto?.organizacion.idiomaDefault ?? "es"}
        iaDisponible={casos.lecturaRecetaDisponible}
      />
    </div>
  );
}
