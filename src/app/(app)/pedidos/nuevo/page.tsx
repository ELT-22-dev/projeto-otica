import type { Metadata } from "next";
import { fechaLocal } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { FormNuevoPedido } from "./FormNuevoPedido";

export const metadata: Metadata = { title: t.nuevo.titulo };

export default async function PaginaNuevoPedido() {
  const contexto = await (await casosDeUso()).obtenerContexto();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">{t.nuevo.titulo}</h1>
      <FormNuevoPedido hoy={fechaLocal(new Date())} idiomaDefault={contexto?.organizacion.idiomaDefault ?? "es"} />
    </div>
  );
}
