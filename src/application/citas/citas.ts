import { agruparPorDia, ordenarCitas, validarCambioCita, validarHorario, type Cita } from "@/domain/cita/Cita";
import { normalizarNombre } from "@/domain/cliente/Cliente";
import { normalizarWhatsapp } from "@/domain/cliente/telefono";
import { fechaParaMensaje, renderizarPlantilla } from "@/domain/notificacion/plantilla";
import { plantillaPara } from "@/domain/organizacion/Organizacion";
import { ErrorDominio } from "@/domain/shared/errores";
import { fechaLocal, sumarDias } from "@/domain/shared/fecha";
import type { Idioma } from "@/domain/shared/idioma";
import type { ResultadoEnvio } from "@/ports";
import { canalDe } from "../avisos/avisos";
import { requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaConfirmarCita, esquemaCrearCita, esquemaEstadoCita } from "../esquemas";

type DepsCitas = Pick<
  Dependencias,
  "citas" | "clientes" | "organizacion" | "notificador" | "notificaciones" | "sesion" | "reloj"
>;

/** Quantos dias para frente a agenda mostra. */
export const DIAS_AGENDA = 14;

/** Mensagem "tu cita quedó para…" no idioma do cliente. Sem número, não há para onde mandar. */
async function enviarConfirmacion(deps: DepsCitas, cita: Cita, usuarioId: string): Promise<ResultadoEnvio | null> {
  if (!cita.whatsapp || !cita.fecha || !cita.hora) return null;
  const org = await deps.organizacion.obtenerActual();
  const cliente = cita.clienteId ? await deps.clientes.obtenerPorId(cita.clienteId) : null;
  const idioma: Idioma = cliente?.idioma ?? org.idiomaDefault;

  const texto = renderizarPlantilla(plantillaPara(org, "cita", idioma), {
    nombreCliente: cita.nombre,
    optica: org.nombre,
    fecha: fechaParaMensaje(cita.fecha, idioma),
    hora: cita.hora,
  });
  const resultado = await deps.notificador.enviar({
    telefono: cita.whatsapp,
    texto,
    clienteId: cita.clienteId,
    jid: cita.jid,
  });
  if (cita.clienteId) {
    await deps.notificaciones.registrar(
      { clienteId: cita.clienteId, pedidoId: null, tipo: "cita", canal: canalDe(resultado), mensaje: texto },
      usuarioId,
    );
  }
  return resultado;
}

export interface ResultadoCita {
  id: string;
  envio: ResultadoEnvio | null;
}

export function crearCita(deps: DepsCitas) {
  return async (entrada: unknown): Promise<ResultadoCita> => {
    const usuario = await requerirUsuario(deps.sesion);
    const d = esquemaCrearCita.parse(entrada);
    const { fecha, hora } = validarHorario(d.fecha, d.hora, fechaLocal(deps.reloj.ahora()));

    let persona: Pick<Cita, "clienteId" | "nombre" | "whatsapp">;
    if (d.cliente.tipo === "existente") {
      const c = await deps.clientes.obtenerPorId(d.cliente.id);
      if (!c) throw new ErrorDominio("no_encontrado", "cliente");
      persona = { clienteId: c.id, nombre: c.nombre, whatsapp: c.whatsapp };
    } else {
      persona = {
        clienteId: null,
        nombre: normalizarNombre(d.cliente.nombre),
        whatsapp: normalizarWhatsapp(d.cliente.whatsapp),
      };
    }

    const nueva = {
      ...persona,
      jid: null,
      fecha,
      hora,
      motivo: d.motivo,
      preferencia: null,
      notas: d.notas,
      estado: "confirmada" as const,
      origen: "sistema" as const,
    };
    const id = await deps.citas.crear(nueva, usuario.id);
    const envio = d.avisar
      ? await enviarConfirmacion(deps, { ...nueva, id, createdAt: deps.reloj.ahora().toISOString() }, usuario.id)
      : null;
    return { id, envio };
  };
}

/** Marca dia e hora de uma solicitação do WhatsApp, ou remarca uma cita confirmada. */
export function confirmarCita(deps: DepsCitas) {
  return async (entrada: unknown): Promise<ResultadoCita> => {
    const usuario = await requerirUsuario(deps.sesion);
    const d = esquemaConfirmarCita.parse(entrada);
    const cita = await deps.citas.obtenerPorId(d.id);
    if (!cita) throw new ErrorDominio("no_encontrado", "cita");
    validarCambioCita(cita.estado, "confirmada");
    const { fecha, hora } = validarHorario(d.fecha, d.hora, fechaLocal(deps.reloj.ahora()));

    const ok = await deps.citas.actualizar(cita.id, cita.estado, { estado: "confirmada", fecha, hora });
    if (!ok) throw new ErrorDominio("conflicto");
    const envio = d.avisar
      ? await enviarConfirmacion(deps, { ...cita, estado: "confirmada", fecha, hora }, usuario.id)
      : null;
    return { id: cita.id, envio };
  };
}

export function cambiarEstadoCita(deps: Pick<Dependencias, "citas" | "sesion">) {
  return async (entrada: unknown): Promise<void> => {
    await requerirUsuario(deps.sesion);
    const d = esquemaEstadoCita.parse(entrada);
    const cita = await deps.citas.obtenerPorId(d.id);
    if (!cita) throw new ErrorDominio("no_encontrado", "cita");
    validarCambioCita(cita.estado, d.estado);
    const ok = await deps.citas.actualizar(cita.id, cita.estado, { estado: d.estado });
    if (!ok) throw new ErrorDominio("conflicto");
  };
}

export function obtenerAgenda(deps: Pick<Dependencias, "citas" | "sesion" | "reloj">) {
  return async () => {
    await requerirUsuario(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const [solicitudes, proximas] = await Promise.all([
      deps.citas.listarSolicitadas(),
      deps.citas.listarEntre(hoy, sumarDias(hoy, DIAS_AGENDA - 1)),
    ]);
    const activas = proximas.filter((c) => c.estado !== "cancelada");
    return {
      hoy,
      solicitudes: ordenarCitas(solicitudes),
      dias: agruparPorDia(activas),
      citasHoy: activas.filter((c) => c.fecha === hoy && c.estado === "confirmada").length,
    };
  };
}

/** Para o menu: solicitações esperando dia e hora, e citas confirmadas para hoje. */
export function resumenAgenda(deps: Pick<Dependencias, "citas" | "reloj">) {
  return async () => {
    const hoy = fechaLocal(deps.reloj.ahora());
    const [solicitudes, deHoy] = await Promise.all([deps.citas.listarSolicitadas(), deps.citas.listarEntre(hoy, hoy)]);
    return { solicitudes: solicitudes.length, hoy: deHoy.filter((c) => c.estado === "confirmada").length };
  };
}
