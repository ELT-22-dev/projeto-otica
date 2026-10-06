import { normalizarBusqueda } from "@/domain/cliente/Cliente";
import { compararFechas, fechaLocal, inicioDeMes, sumarDias, sumarMeses, type FechaISO } from "@/domain/shared/fecha";
import { estaAtrasado, saldoPendiente } from "@/domain/pedido/Pedido";
import { esElegibleRenovacion, ventanaRenovacion, yaAvisadoRenovacion } from "@/domain/renovacion/regla-renovacion";
import type { PedidoConCliente, VentasMes } from "@/ports";
import { requerirAdmin, requerirUsuario, type Dependencias } from "../dependencias";
import { esquemaBuscarClientes } from "../esquemas";

const LIMITE = 200;

type Deps = Pick<Dependencias, "pedidos" | "renovaciones" | "consultas" | "sesion" | "reloj">;

async function pedidosAbiertos(deps: Pick<Dependencias, "pedidos">) {
  const [enLaboratorio, listos] = await Promise.all([
    deps.pedidos.listar({ status: "en_laboratorio", limite: LIMITE }),
    deps.pedidos.listar({ status: "listo", limite: LIMITE }),
  ]);
  return { enLaboratorio, listos };
}

const sumaSaldos = (pedidos: PedidoConCliente[]) => pedidos.reduce((s, p) => s + saldoPendiente(p), 0);

async function renovacionesPendientes(deps: Pick<Dependencias, "renovaciones">, hoy: FechaISO) {
  const candidatos = await deps.renovaciones.listarCandidatos(ventanaRenovacion(hoy));
  return candidatos.filter((c) => esElegibleRenovacion(c, hoy) && !yaAvisadoRenovacion(c)).length;
}

/** Inicio: o que precisa de atenção hoje e como vai o mês. */
export function obtenerPanel(deps: Deps) {
  return async () => {
    await requerirUsuario(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const mes = inicioDeMes(hoy);
    const [conteos, { enLaboratorio, listos }, sinAviso, ventas, renovaciones, clientes] = await Promise.all([
      deps.pedidos.contarPorStatus(),
      pedidosAbiertos(deps),
      deps.consultas.listosSinAviso(),
      deps.consultas.ventasPorMes(mes),
      renovacionesPendientes(deps, hoy),
      deps.consultas.contarClientes(),
    ]);
    return {
      hoy,
      conteos,
      atrasados: enLaboratorio.filter((p) => estaAtrasado(p, hoy)),
      entregasHoy: enLaboratorio.filter((p) => p.fechaEntregaPrevista === hoy),
      listosSinAviso: sinAviso,
      porCobrar: sumaSaldos([...enLaboratorio, ...listos]),
      ventasMes: ventas[0] ?? { mes: mes.slice(0, 7), pedidos: 0, total: 0, adelantos: 0 },
      renovacionesPendientes: renovaciones,
      clientes,
    };
  };
}

export function listarClientes(deps: Pick<Dependencias, "consultas" | "sesion">) {
  return async (entrada: unknown) => {
    await requerirUsuario(deps.sesion);
    const texto = esquemaBuscarClientes.parse(entrada ?? "");
    const digitos = texto.replace(/[\s()+-]/g, "");
    const filtro = /^\d{3,}$/.test(digitos)
      ? { telefono: digitos }
      : texto
        ? { nombre: normalizarBusqueda(texto) }
        : {};
    return deps.consultas.listarClientes({ ...filtro, limite: LIMITE });
  };
}

export function listarRecetas(deps: Pick<Dependencias, "consultas" | "sesion">) {
  return async () => {
    await requerirUsuario(deps.sesion);
    return deps.consultas.recetasRecientes(100);
  };
}

/** Laboratório: pedidos em produção agrupados pela urgência da entrega. */
export function obtenerLaboratorio(deps: Pick<Dependencias, "pedidos" | "sesion" | "reloj">) {
  return async () => {
    await requerirUsuario(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const enSemana = sumarDias(hoy, 7);
    const pedidos = await deps.pedidos.listar({ status: "en_laboratorio", limite: LIMITE });
    const grupos = { atrasados: [], hoy: [], semana: [], despues: [] } as Record<
      "atrasados" | "hoy" | "semana" | "despues",
      PedidoConCliente[]
    >;
    for (const p of pedidos) {
      const c = compararFechas(p.fechaEntregaPrevista, hoy);
      if (c < 0) grupos.atrasados.push(p);
      else if (c === 0) grupos.hoy.push(p);
      else if (compararFechas(p.fechaEntregaPrevista, enSemana) <= 0) grupos.semana.push(p);
      else grupos.despues.push(p);
    }
    return { hoy, grupos, total: pedidos.length };
  };
}

/**
 * Finanças a partir dos pedidos. Considera que o saldo é cobrado na entrega
 * (o sistema ainda não registra pagamentos separados).
 */
export function obtenerFinanzas(deps: Pick<Dependencias, "pedidos" | "consultas" | "sesion" | "reloj">) {
  return async () => {
    await requerirAdmin(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const mes = inicioDeMes(hoy);
    const [{ enLaboratorio, listos }, ventas, cobradoEntrega] = await Promise.all([
      pedidosAbiertos(deps),
      deps.consultas.ventasPorMes(mes),
      deps.consultas.saldoCobradoAlEntregar(mes, hoy),
    ]);
    const abiertos = [...listos, ...enLaboratorio].filter((p) => saldoPendiente(p) > 0);
    const ventasMes = ventas[0] ?? { mes: mes.slice(0, 7), pedidos: 0, total: 0, adelantos: 0 };
    return {
      hoy,
      porCobrar: sumaSaldos(abiertos),
      pendientes: abiertos.sort((a, b) => saldoPendiente(b) - saldoPendiente(a)),
      ventasMes,
      adelantosMes: ventasMes.adelantos,
      cobradoAlEntregarMes: cobradoEntrega,
      ingresosMes: ventasMes.adelantos + cobradoEntrega,
      ticketMedioMes: ventasMes.pedidos ? Math.round(ventasMes.total / ventasMes.pedidos) : 0,
    };
  };
}

/** WhatsApp/CRM: quem ainda não foi avisado e o histórico de mensagens. */
export function obtenerCrm(deps: Deps) {
  return async () => {
    await requerirUsuario(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const [listosSinAviso, avisos, renovaciones, avisosHoy] = await Promise.all([
      deps.consultas.listosSinAviso(),
      deps.consultas.avisosRecientes(40),
      renovacionesPendientes(deps, hoy),
      deps.consultas.avisosEnviadosDesde(hoy),
    ]);
    return { hoy, listosSinAviso, avisos, renovacionesPendientes: renovaciones, avisosHoy };
  };
}

/** Últimos `n` meses (AAAA-MM), incluindo o atual, com zero onde não houve vendas. */
export function completarMeses(ventas: VentasMes[], hoy: FechaISO, n: number): VentasMes[] {
  const porMes = new Map(ventas.map((v) => [v.mes, v]));
  return Array.from({ length: n }, (_, i) => {
    const mes = sumarMeses(inicioDeMes(hoy), i - (n - 1)).slice(0, 7);
    return porMes.get(mes) ?? { mes, pedidos: 0, total: 0, adelantos: 0 };
  });
}

export function obtenerReportes(deps: Pick<Dependencias, "consultas" | "sesion" | "reloj">) {
  return async () => {
    await requerirAdmin(deps.sesion);
    const hoy = fechaLocal(deps.reloj.ahora());
    const desde6 = sumarMeses(inicioDeMes(hoy), -5);
    const [ventas, porTipo] = await Promise.all([
      deps.consultas.ventasPorMes(desde6),
      deps.consultas.ventasPorTipoLente(sumarMeses(inicioDeMes(hoy), -11)),
    ]);
    const meses = completarMeses(ventas, hoy, 6);
    const total = meses.reduce((s, m) => s + m.total, 0);
    const pedidos = meses.reduce((s, m) => s + m.pedidos, 0);
    return { hoy, meses, porTipo, total, pedidos, ticketMedio: pedidos ? Math.round(total / pedidos) : 0 };
  };
}
