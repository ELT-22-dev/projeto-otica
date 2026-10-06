import { renderizarPlantilla } from "@/domain/notificacion/plantilla";
import { plantillaPara } from "@/domain/organizacion/Organizacion";
import { numeroPedidoSinPrefijo } from "@/domain/pedido/numero-pedido";
import { esElegibleRenovacion } from "@/domain/renovacion/regla-renovacion";
import { ErrorDominio } from "@/domain/shared/errores";
import { fechaLocal } from "@/domain/shared/fecha";
import type { ResultadoEnvio } from "@/ports";
import { requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaId } from "../esquemas";
import { marcarComoListo } from "../pedidos/cambiarStatus";

type DepsAviso = Pick<Dependencias, "pedidos" | "organizacion" | "notificador" | "notificaciones" | "sesion" | "reloj">;

/** Gera a mensagem de "pronto" no idioma do cliente, envia pelo notificador e registra no log. */
export function generarAvisoCliente(deps: DepsAviso) {
  return async (entrada: unknown): Promise<ResultadoEnvio> => {
    const usuario = await requerirUsuario(deps.sesion);
    const pedidoId = esquemaId.parse(entrada);

    const pedido = await deps.pedidos.obtenerPorId(pedidoId);
    if (!pedido) throw new ErrorDominio("no_encontrado", "pedido");
    if (pedido.status !== "listo") throw new ErrorDominio("pedido_no_listo");

    const org = await deps.organizacion.obtenerActual();
    const texto = renderizarPlantilla(plantillaPara(org, "listo", pedido.cliente.idioma), {
      nombreCliente: pedido.cliente.nombre,
      optica: org.nombre,
      numeroPedido: numeroPedidoSinPrefijo(pedido.numero),
    });

    const resultado = await deps.notificador.enviar({ telefono: pedido.cliente.whatsapp, texto });
    await deps.notificaciones.registrar(
      {
        clienteId: pedido.cliente.id,
        pedidoId: pedido.id,
        tipo: "listo",
        canal: deps.notificador.canal,
        mensaje: texto,
      },
      usuario.id,
    );
    return resultado;
  };
}

/** "Listo y avisar": marca como pronto (se ainda estiver no laboratório) e avisa. */
export function listoYAvisar(deps: DepsAviso) {
  return async (entrada: unknown): Promise<ResultadoEnvio> => {
    await requerirUsuario(deps.sesion);
    const pedidoId = esquemaId.parse(entrada);
    const pedido = await deps.pedidos.obtenerPorId(pedidoId);
    if (!pedido) throw new ErrorDominio("no_encontrado", "pedido");
    if (pedido.status === "en_laboratorio") await marcarComoListo(deps)(pedidoId);
    return generarAvisoCliente(deps)(pedidoId);
  };
}

export function avisarRenovacion(
  deps: Pick<Dependencias, "renovaciones" | "organizacion" | "notificador" | "notificaciones" | "sesion" | "reloj">,
) {
  return async (entrada: unknown): Promise<ResultadoEnvio> => {
    const usuario = await requerirUsuario(deps.sesion);
    const clienteId = esquemaId.parse(entrada);

    const candidato = await deps.renovaciones.obtenerCandidato(clienteId);
    const hoy = fechaLocal(deps.reloj.ahora());
    if (!candidato || !esElegibleRenovacion(candidato, hoy)) throw new ErrorDominio("cliente_no_elegible");

    const org = await deps.organizacion.obtenerActual();
    const texto = renderizarPlantilla(plantillaPara(org, "renovacion", candidato.idioma), {
      nombreCliente: candidato.nombre,
      optica: org.nombre,
    });

    const resultado = await deps.notificador.enviar({ telefono: candidato.whatsapp, texto });
    await deps.notificaciones.registrar(
      {
        clienteId: candidato.clienteId,
        pedidoId: candidato.pedidoId,
        tipo: "renovacion",
        canal: deps.notificador.canal,
        mensaje: texto,
      },
      usuario.id,
    );
    return resultado;
  };
}
