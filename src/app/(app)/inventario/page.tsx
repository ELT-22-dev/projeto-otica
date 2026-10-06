import { Package } from "lucide-react";
import type { Metadata } from "next";
import { PaginaPronto } from "@/components/PaginaPronto";
import { t } from "@/i18n";
import { exigirModulo } from "@/app/_lib/exigir-modulo";

export const metadata: Metadata = { title: t.pronto.inventario.titulo };

export default function PaginaInventario() {
  exigirModulo("inventario");
  return (
    <PaginaPronto icono={Package} tono="ambar" titulo={t.pronto.inventario.titulo} texto={t.pronto.inventario.texto} />
  );
}
