import { z } from "zod";
import { formatearNumeroPedido } from "@/domain/pedido/numero-pedido";
import { estaAtrasado, saldoPendiente } from "@/domain/pedido/Pedido";
import { STATUS_PEDIDO } from "@/domain/pedido/status-pedido";
import { esElegibleRenovacion, ventanaRenovacion, yaAvisadoRenovacion } from "@/domain/renovacion/regla-renovacion";
import { aReales } from "@/domain/shared/dinero";
import { ErrorDominio } from "@/domain/shared/errores";
import { fechaLocal } from "@/domain/shared/fecha";
import type { HerramientaAsistente, PedidoConCliente } from "@/ports";
import { requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaPreguntaAsistente } from "../esquemas";
import { interpretarBusqueda } from "../pedidos/consultas";

type DepsAsistente = Pick<Dependencias, "asistente" | "pedidos" | "renovaciones" | "organizacion" | "sesion" | "reloj">;

const LIMITE = 100;

/** Só o necessário para responder: nunca dados de receita (LGPD). */
function resumenPedido(p: PedidoConCliente, hoy: string) {
  return {
    numero: formatearNumeroPedido(p.numero),
    cliente: p.cliente.nombre,
    descripcion: p.descripcionArmazon,
    tipo_lente: p.tipoLente,
    estado: p.status,
    fecha_pedido: p.fechaPedido,
    entrega_prevista: p.fechaEntregaPrevista,
    atrasado: estaAtrasado(p, hoy),
    listo_desde: p.fechaListo ? fechaLocal(p.fechaListo) : null,
    entregado_el: p.fechaEntregado ? fechaLocal(p.fechaEntregado) : null,
    total_reales: aReales(p.valorTotal),
    saldo_pendiente_reales: aReales(saldoPendiente(p)),
  };
}

function herramienta<S extends z.ZodObject>(
  nombre: string,
  descripcion: string,
  esquema: S,
  fn: (entrada: z.infer<S>) => Promise<unknown>,
): HerramientaAsistente {
  const json = z.toJSONSchema(esquema) as Record<string, unknown>;
  delete json.$schema;
  return {
    nombre,
    descripcion,
    esquemaEntrada: { ...json, type: "object" },
    ejecutar: async (entrada) => fn(esquema.parse(entrada ?? {})),
  };
}

/** Consultas somente leitura que o assistente pode fazer. Nenhuma altera dados. */
export function herramientasAsistente(deps: Pick<DepsAsistente, "pedidos" | "renovaciones" | "reloj">) {
  const hoy = () => fechaLocal(deps.reloj.ahora());

  return [
    herramienta(
      "resumen_pedidos",
      "Panorama actual: cuántos pedidos hay en cada estado, cuáles están atrasados y cuánto falta cobrar de los pedidos abiertos.",
      z.object({}),
      async () => {
        const [conteos, enLab, listos] = await Promise.all([
          deps.pedidos.contarPorStatus(),
          deps.pedidos.listar({ status: "en_laboratorio", limite: LIMITE }),
          deps.pedidos.listar({ status: "listo", limite: LIMITE }),
        ]);
        const h = hoy();
        const abiertos = [...enLab, ...listos];
        return {
          hoy: h,
          pedidos_por_estado: conteos,
          atrasados: enLab.filter((p) => estaAtrasado(p, h)).map((p) => resumenPedido(p, h)),
          listos_esperando_retiro: listos.length,
          saldo_pendiente_total_reales: aReales(abiertos.reduce((s, p) => s + saldoPendiente(p), 0)),
        };
      },
    ),
    herramienta(
      "listar_pedidos",
      "Lista pedidos de un estado (en_laboratorio, listo, entregado, cancelado). Devuelve hasta 100, los más relevantes primero.",
      z.object({
        estado: z.enum(STATUS_PEDIDO).describe("Estado de los pedidos a listar"),
        solo_atrasados: z.boolean().optional().describe("Solo pedidos en laboratorio con la entrega vencida"),
      }),
      async ({ estado, solo_atrasados }) => {
        const h = hoy();
        const pedidos = await deps.pedidos.listar({ status: estado, limite: LIMITE });
        return pedidos.filter((p) => !solo_atrasados || estaAtrasado(p, h)).map((p) => resumenPedido(p, h));
      },
    ),
    herramienta(
      "buscar_pedidos",
      "Busca pedidos de cualquier estado por nombre del cliente, teléfono o número de pedido (ej: '#12').",
      z.object({ texto: z.string().min(1).max(60).describe("Nombre, teléfono o número de pedido") }),
      async ({ texto }) => {
        const criterio = interpretarBusqueda(texto);
        if (!criterio) return [];
        const h = hoy();
        return (await deps.pedidos.listar({ ...criterio, limite: 30 })).map((p) => resumenPedido(p, h));
      },
    ),
    herramienta(
      "listar_renovaciones",
      "Clientes que recibieron sus lentes hace entre 11 y 13 meses y no volvieron: candidatos a un nuevo examen.",
      z.object({}),
      async () => {
        const h = hoy();
        const candidatos = await deps.renovaciones.listarCandidatos(ventanaRenovacion(h));
        return candidatos
          .filter((c) => esElegibleRenovacion(c, h))
          .map((c) => ({
            cliente: c.nombre,
            ultima_entrega: fechaLocal(c.ultimaEntrega),
            ya_avisado: yaAvisadoRenovacion(c),
          }));
      },
    ),
  ];
}

export function preguntarAsistente(deps: DepsAsistente) {
  return async (entrada: unknown): Promise<string> => {
    const usuario = await requerirUsuario(deps.sesion);
    if (!deps.asistente) throw new ErrorDominio("ia_no_disponible");
    const { pregunta, historial } = esquemaPreguntaAsistente.parse(entrada);
    const org = await deps.organizacion.obtenerActual();

    const instrucciones = [
      `Eres el asistente del sistema de pedidos de la óptica "${org.nombre}" (São Paulo, Brasil).`,
      `Hablas con ${usuario.nombre}, que trabaja en la óptica. Hoy es ${fechaLocal(deps.reloj.ahora())}.`,
      "Responde en el idioma de la pregunta (normalmente español), de forma breve y directa, como un compañero de trabajo.",
      "Usa las herramientas para consultar datos reales; no inventes pedidos, clientes ni valores. Si algo no está en los datos, dilo.",
      "Fechas en formato dd/mm/aaaa y dinero en reales (R$ 1.234,56). Cita los pedidos por su número (#0001).",
      "Solo puedes consultar: no puedes crear, cambiar ni avisar pedidos. Si te lo piden, explica qué botón usar en el sistema.",
      "No tienes acceso a recetas ni datos de salud.",
      'Formato: texto simple. Para varios elementos usa líneas que empiecen con "- ". Puedes resaltar con **negrita**. Sin tablas ni títulos.',
    ].join("\n");

    return deps.asistente.responder({
      instrucciones,
      historial,
      pregunta,
      herramientas: herramientasAsistente(deps),
    });
  };
}
