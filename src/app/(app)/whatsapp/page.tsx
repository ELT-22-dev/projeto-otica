import { CheckCircle2, MessageCircle, MessagesSquare, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirModulo } from "@/app/_lib/exigir-modulo";
import type { Conversacion } from "@/application";
import { PanelPorAvisar } from "@/components/avisos/PanelPorAvisar";
import { EncabezadoPagina } from "@/components/gestion";
import { Avatar, TituloSeccion } from "@/components/visual";
import { formatearWhatsapp } from "@/domain/cliente/telefono";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { ZONA_HORARIA } from "@/domain/shared/fecha";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { formatearInstante } from "@/lib/format";
import { qrSvg } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { BotonVista } from "./BotonVista";
import { ConexionWhatsapp } from "./ConexionWhatsapp";

export const metadata: Metadata = { title: t.crm.titulo };

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: ZONA_HORARIA, hour: "2-digit", minute: "2-digit" });

function TarjetaConversacion({ c }: { c: Conversacion }) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-xs",
        c.requiereAtencion && "border-red-200 ring-2 ring-red-100",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar nombre={c.nombre} className="size-9 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {c.clienteId ? (
              <Link href={`/clientes/${c.clienteId}`} className="hover:underline">
                {c.nombre}
              </Link>
            ) : (
              c.nombre
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {c.whatsapp ? `${formatearWhatsapp(c.whatsapp)} · ` : ""}
            {formatearInstante(c.ultimo)}
          </p>
        </div>
        {c.requiereAtencion && (
          <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            {t.whatsapp.requiereAtencion}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {c.mensajes.map((m) => {
          const delCliente = m.direccion === "entrante";
          const estado = t.whatsapp.estadoMensaje[m.estado];
          return (
            <li key={m.id} className={cn("flex flex-col", delCliente ? "items-start" : "items-end")}>
              <p
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm whitespace-pre-line",
                  delCliente ? "rounded-tl-sm bg-muted" : "rounded-tr-sm bg-green-100 text-green-950",
                  m.estado === "error" && "bg-red-50 text-red-900 ring-1 ring-red-200",
                )}
              >
                {m.texto}
              </p>
              <span className="px-1 text-[10px] text-muted-foreground">
                {!delCliente && `${t.whatsapp.origen[m.origen]} · `}
                {hora.format(new Date(m.createdAt))}
                {estado && ` · ${estado}`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap justify-end gap-1.5">
        {c.whatsapp && (
          <a
            href={`https://wa.me/${c.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-green-700 hover:bg-green-50"
          >
            <MessageCircle className="size-4" />
            {t.whatsapp.responderEnCelular}
          </a>
        )}
        {c.requiereAtencion && <BotonVista jid={c.jid} />}
      </div>
    </li>
  );
}

export default async function PaginaAvisos() {
  exigirModulo("whatsapp");
  const casos = await casosDeUso();
  const [crm, porAvisar, whatsapp, conversaciones, contexto] = await Promise.all([
    casos.obtenerCrm(),
    casos.obtenerPorAvisar(),
    casos.obtenerWhatsapp(),
    casos.listarConversaciones(),
    casos.obtenerContexto(),
  ]);

  const estadoInicial = {
    estado: whatsapp.estado,
    qrSvg: whatsapp.qr ? await qrSvg(whatsapp.qr) : null,
    numero: whatsapp.numero ? formatearWhatsapp(whatsapp.numero) : null,
    servicioEnLinea: whatsapp.servicioEnLinea,
  };

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <EncabezadoPagina
        icono={MessageCircle}
        tono="verde"
        titulo={t.crm.titulo}
        descripcion={t.crm.descripcion}
        extra={
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green-50 px-3 py-1.5 text-sm text-green-700 ring-1 ring-green-200">
            <Send className="size-4" />
            {t.crm.avisosHoy(crm.avisosHoy)}
          </span>
        }
      />

      <ConexionWhatsapp inicial={estadoInicial} esAdmin={contexto?.usuario.rol === "admin"} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          {porAvisar.total > 0 ? (
            <PanelPorAvisar datos={porAvisar} hoy={crm.hoy} />
          ) : (
            <div className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <CheckCircle2 className="size-6 shrink-0" />
              <p className="font-medium">{t.inicio.todoAlDia}</p>
            </div>
          )}

          {(conversaciones.length > 0 || whatsapp.estado === "conectado") && (
            <section className="flex flex-col gap-3">
              <TituloSeccion icono={MessagesSquare} tono="esmeralda">
                {t.whatsapp.conversaciones}
              </TituloSeccion>
              {conversaciones.length === 0 ? (
                <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  {t.whatsapp.sinConversaciones}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {conversaciones.map((c) => (
                    <TarjetaConversacion key={c.jid} c={c} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <section className="flex flex-col gap-3">
          <TituloSeccion icono={MessageCircle} tono="verde">
            {t.crm.historial}
          </TituloSeccion>
          {crm.avisos.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {t.crm.sinHistorial}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {crm.avisos.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <Avatar nombre={a.clienteNombre} className="size-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      <Link href={`/clientes/${a.clienteId}`} className="font-medium text-foreground hover:underline">
                        {a.clienteNombre}
                      </Link>{" "}
                      · {formatearInstante(a.createdAt)} · {t.ficha.tipoAviso[a.tipo]}
                      {a.pedidoNumero !== null && ` · ${formatearNumeroPedido(a.pedidoNumero)}`}
                    </p>
                    <p className="mt-1 rounded-2xl rounded-tl-sm bg-green-50 px-3 py-2 text-sm whitespace-pre-line ring-1 ring-green-100">
                      {a.mensaje}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
