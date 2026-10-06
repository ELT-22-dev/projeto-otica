import {
  AlarmClock,
  BellRing,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  RefreshCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListaPedidosMini, TarjetaKpi } from "@/components/gestion";
import { TituloSeccion } from "@/components/visual";
import { primerNombre } from "@/domain/cliente/Cliente";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearFechaLarga, formatearReales } from "@/lib/format";

export const metadata: Metadata = { title: t.nav.inicio };

export default async function PaginaInicio() {
  const casos = await casosDeUso();
  const [panel, contexto] = await Promise.all([casos.obtenerPanel(), casos.obtenerContexto()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{formatearFechaLarga(new Date())}</p>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            {t.pedidos.saludo(primerNombre(contexto?.usuario.nombre ?? ""))}
          </h1>
        </div>
        {casos.iaDisponible && (
          <Link
            href="/asistente"
            className="inline-flex items-center gap-2 self-start rounded-full bg-fuchsia-50 px-4 py-2 text-sm font-medium text-fuchsia-700 ring-1 ring-fuchsia-200 transition hover:bg-fuchsia-100 md:self-auto"
          >
            <Sparkles className="size-4" />
            {t.inicio.preguntarIA}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaKpi
          icono={CircleDollarSign}
          tono="violeta"
          titulo={t.inicio.porCobrar}
          valor={formatearReales(panel.porCobrar)}
          detalle={t.inicio.porCobrarDetalle}
          href={contexto?.usuario.rol === "admin" ? "/finanzas" : undefined}
        />
        <TarjetaKpi
          icono={TrendingUp}
          tono="esmeralda"
          titulo={t.inicio.ventasMes}
          valor={formatearReales(panel.ventasMes.total)}
          detalle={t.inicio.ventasMesDetalle(panel.ventasMes.pedidos)}
          href={contexto?.usuario.rol === "admin" ? "/reportes" : undefined}
        />
        <TarjetaKpi
          icono={BellRing}
          tono="cielo"
          titulo={t.inicio.sinAvisar}
          valor={String(panel.listosSinAviso.length)}
          detalle={t.inicio.sinAvisarDetalle}
          href="/whatsapp"
        />
        <TarjetaKpi
          icono={RefreshCcw}
          tono="rosa"
          titulo={t.inicio.renovaciones}
          valor={String(panel.renovacionesPendientes)}
          detalle={t.inicio.renovacionesDetalle}
          href="/renovaciones"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <TituloSeccion icono={AlarmClock} tono="rojo" extra={<VerTodos href="/laboratorio" />}>
            {t.inicio.atrasados} ({panel.atrasados.length})
          </TituloSeccion>
          <ListaPedidosMini pedidos={panel.atrasados} hoy={panel.hoy} vacio={t.inicio.todoAlDia} />
        </section>

        <section className="flex flex-col gap-3">
          <TituloSeccion icono={BellRing} tono="esmeralda" extra={<VerTodos href="/whatsapp" />}>
            {t.inicio.listosSinAviso} ({panel.listosSinAviso.length})
          </TituloSeccion>
          <ListaPedidosMini pedidos={panel.listosSinAviso} hoy={panel.hoy} vacio={t.inicio.todoAlDia} mostrar="listo" />
        </section>

        <section className="flex flex-col gap-3 lg:col-span-2">
          <TituloSeccion icono={CalendarCheck} tono="naranja" extra={<VerTodos href="/laboratorio" />}>
            {t.inicio.entregasHoy} ({panel.entregasHoy.length})
          </TituloSeccion>
          <ListaPedidosMini pedidos={panel.entregasHoy} hoy={panel.hoy} vacio={t.inicio.todoAlDia} />
        </section>
      </div>
    </div>
  );
}

function VerTodos({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center text-xs font-medium text-violet-700 hover:underline">
      {t.inicio.verTodos}
      <ChevronRight className="size-3.5" />
    </Link>
  );
}
