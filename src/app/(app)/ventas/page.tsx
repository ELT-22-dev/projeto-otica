import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import { PaginaPronto } from "@/components/PaginaPronto";
import { t } from "@/i18n";
import { exigirModulo } from "@/app/_lib/exigir-modulo";

export const metadata: Metadata = { title: t.pronto.ventas.titulo };

export default function PaginaVentas() {
  exigirModulo("ventas");
  return (
    <PaginaPronto icono={ShoppingCart} tono="esmeralda" titulo={t.pronto.ventas.titulo} texto={t.pronto.ventas.texto} />
  );
}
