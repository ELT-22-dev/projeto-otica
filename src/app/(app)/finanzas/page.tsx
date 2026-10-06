import { CircleDollarSign, HandCoins, Receipt, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina, ListaPedidosMini, TarjetaKpi } from "@/components/gestion";
import { TituloSeccion } from "@/components/visual";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearReales } from "@/lib/format";
import { soloAdmin } from "../../_lib/solo-admin";

export const metadata: Metadata = { title: t.finanzas.titulo };

export default async function PaginaFinanzas() {
  const f = await soloAdmin((await casosDeUso()).obtenerFinanzas());
  if (!f) return <p className="py-12 text-center text-sm text-muted-foreground">{t.ajustes.soloAdmin}</p>;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina icono={Wallet} tono="teal" titulo={t.finanzas.titulo} descripcion={t.finanzas.descripcion} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaKpi
          icono={CircleDollarSign}
          tono="violeta"
          titulo={t.finanzas.porCobrar}
          valor={formatearReales(f.porCobrar)}
          detalle={t.inicio.porCobrarDetalle}
        />
        <TarjetaKpi
          icono={HandCoins}
          tono="esmeralda"
          titulo={t.finanzas.ingresosMes}
          valor={formatearReales(f.ingresosMes)}
          detalle={t.finanzas.ingresosDetalle}
        />
        <TarjetaKpi
          icono={TrendingUp}
          tono="azul"
          titulo={t.finanzas.ventasMes}
          valor={formatearReales(f.ventasMes.total)}
          detalle={t.inicio.ventasMesDetalle(f.ventasMes.pedidos)}
        />
        <TarjetaKpi
          icono={Receipt}
          tono="ambar"
          titulo={t.finanzas.ticketMedio}
          valor={formatearReales(f.ticketMedioMes)}
        />
      </div>

      <section className="flex flex-col gap-3">
        <TituloSeccion icono={CircleDollarSign} tono="violeta">
          {t.finanzas.pendientes} ({f.pendientes.length})
        </TituloSeccion>
        <ListaPedidosMini pedidos={f.pendientes} hoy={f.hoy} vacio={t.finanzas.vacio} mostrar="saldo" />
      </section>
    </div>
  );
}
