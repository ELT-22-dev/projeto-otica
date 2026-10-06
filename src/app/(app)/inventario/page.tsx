import { Package } from "lucide-react";
import type { Metadata } from "next";
import { PaginaPronto } from "@/components/PaginaPronto";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.pronto.inventario.titulo };

export default function PaginaInventario() {
  return (
    <PaginaPronto icono={Package} tono="ambar" titulo={t.pronto.inventario.titulo} texto={t.pronto.inventario.texto} />
  );
}
