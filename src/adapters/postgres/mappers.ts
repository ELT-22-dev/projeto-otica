import type { Cliente } from "@/domain/cliente/Cliente";
import type { Notificacion } from "@/domain/notificacion/Notificacion";
import type { Organizacion } from "@/domain/organizacion/Organizacion";
import type { Pedido } from "@/domain/pedido/Pedido";
import type { StatusPedido } from "@/domain/pedido/status-pedido";
import type { DatosReceta, Receta } from "@/domain/receta/Receta";
import type { CandidatoRenovacion } from "@/domain/renovacion/regla-renovacion";
import { aCentavos } from "@/domain/shared/dinero";
import type { Idioma } from "@/domain/shared/idioma";
import type { PedidoConCliente } from "@/ports";

/** Drivers devolvem timestamptz como Date (pg-types) ou string; o domínio usa ISO 8601. */
type Instante = Date | string;
type Numerico = number | string;

export function iso(v: Instante): string {
  return (v instanceof Date ? v : new Date(v)).toISOString();
}

const isoONulo = (v: Instante | null): string | null => (v === null ? null : iso(v));
const numONulo = (v: Numerico | null): number | null => (v === null ? null : Number(v));

// Colunas date sempre selecionadas com ::text para não sofrer deslocamento de fuso.
export const COLUMNAS_PEDIDO = `
  id, numero, cliente_id, descripcion_armazon, tipo_lente, valor_total, valor_adelanto,
  fecha_pedido::text as fecha_pedido, fecha_entrega_prevista::text as fecha_entrega_prevista,
  status::text as status, fecha_listo, fecha_entregado, created_at`;

export const COLUMNAS_PEDIDO_LISTA = `${COLUMNAS_PEDIDO},
  cliente_nombre, cliente_whatsapp, cliente_idioma::text as cliente_idioma`;

export interface FilaPedido {
  id: string;
  numero: number;
  cliente_id: string;
  descripcion_armazon: string;
  tipo_lente: string | null;
  valor_total: Numerico;
  valor_adelanto: Numerico;
  fecha_pedido: string;
  fecha_entrega_prevista: string;
  status: StatusPedido;
  fecha_listo: Instante | null;
  fecha_entregado: Instante | null;
  created_at: Instante;
}

export interface FilaPedidoLista extends FilaPedido {
  cliente_nombre: string;
  cliente_whatsapp: string;
  cliente_idioma: Idioma;
}

export function aPedido(f: FilaPedido): Pedido {
  return {
    id: f.id,
    clienteId: f.cliente_id,
    numero: Number(f.numero),
    descripcionArmazon: f.descripcion_armazon,
    tipoLente: f.tipo_lente,
    valorTotal: aCentavos(Number(f.valor_total)),
    valorAdelanto: aCentavos(Number(f.valor_adelanto)),
    fechaPedido: f.fecha_pedido,
    fechaEntregaPrevista: f.fecha_entrega_prevista,
    status: f.status,
    fechaListo: isoONulo(f.fecha_listo),
    fechaEntregado: isoONulo(f.fecha_entregado),
    createdAt: iso(f.created_at),
  };
}

export function aPedidoConCliente(f: FilaPedidoLista): PedidoConCliente {
  return {
    ...aPedido(f),
    cliente: { id: f.cliente_id, nombre: f.cliente_nombre, whatsapp: f.cliente_whatsapp, idioma: f.cliente_idioma },
  };
}

export const COLUMNAS_CLIENTE = `id, nombre, whatsapp, idioma::text as idioma, notas, created_at`;

export interface FilaCliente {
  id: string;
  nombre: string;
  whatsapp: string;
  idioma: Idioma;
  notas: string | null;
  created_at: Instante;
}

export function aCliente(f: FilaCliente): Cliente {
  return { id: f.id, nombre: f.nombre, whatsapp: f.whatsapp, idioma: f.idioma, notas: f.notas, createdAt: iso(f.created_at) };
}

export const COLUMNAS_RECETA = `
  id, cliente_id, pedido_id, od_esfera, od_cilindro, od_eje, oi_esfera, oi_cilindro, oi_eje,
  adicion, dnp_od, dnp_oi, observaciones, fecha_receta::text as fecha_receta, created_at`;

export interface FilaReceta {
  id: string;
  cliente_id: string;
  pedido_id: string | null;
  od_esfera: Numerico | null;
  od_cilindro: Numerico | null;
  od_eje: Numerico | null;
  oi_esfera: Numerico | null;
  oi_cilindro: Numerico | null;
  oi_eje: Numerico | null;
  adicion: Numerico | null;
  dnp_od: Numerico | null;
  dnp_oi: Numerico | null;
  observaciones: string | null;
  fecha_receta: string | null;
  created_at: Instante;
}

export function aReceta(f: FilaReceta): Receta {
  return {
    id: f.id,
    clienteId: f.cliente_id,
    pedidoId: f.pedido_id,
    odEsfera: numONulo(f.od_esfera),
    odCilindro: numONulo(f.od_cilindro),
    odEje: numONulo(f.od_eje),
    oiEsfera: numONulo(f.oi_esfera),
    oiCilindro: numONulo(f.oi_cilindro),
    oiEje: numONulo(f.oi_eje),
    adicion: numONulo(f.adicion),
    dnpOd: numONulo(f.dnp_od),
    dnpOi: numONulo(f.dnp_oi),
    observaciones: f.observaciones,
    fechaReceta: f.fecha_receta,
    createdAt: iso(f.created_at),
  };
}

export function recetaAJson(r: DatosReceta): string {
  return JSON.stringify({
    od_esfera: r.odEsfera,
    od_cilindro: r.odCilindro,
    od_eje: r.odEje,
    oi_esfera: r.oiEsfera,
    oi_cilindro: r.oiCilindro,
    oi_eje: r.oiEje,
    adicion: r.adicion,
    dnp_od: r.dnpOd,
    dnp_oi: r.dnpOi,
    observaciones: r.observaciones,
    fecha_receta: r.fechaReceta,
  });
}

export const COLUMNAS_NOTIFICACION = `id, cliente_id, pedido_id, tipo::text as tipo, canal::text as canal, mensaje, created_at`;

export interface FilaNotificacion {
  id: string;
  cliente_id: string;
  pedido_id: string | null;
  tipo: Notificacion["tipo"];
  canal: Notificacion["canal"];
  mensaje: string;
  created_at: Instante;
}

export function aNotificacion(f: FilaNotificacion): Notificacion {
  return {
    id: f.id,
    clienteId: f.cliente_id,
    pedidoId: f.pedido_id,
    tipo: f.tipo,
    canal: f.canal,
    mensaje: f.mensaje,
    createdAt: iso(f.created_at),
  };
}

export interface FilaConfiguracion {
  nombre: string;
  telefono_whatsapp: string | null;
  idioma_default: Idioma;
  plantilla_listo_es: string;
  plantilla_listo_pt: string;
  plantilla_renovacion_es: string;
  plantilla_renovacion_pt: string;
}

export function aOrganizacion(f: FilaConfiguracion): Organizacion {
  return {
    nombre: f.nombre,
    telefonoWhatsapp: f.telefono_whatsapp,
    idiomaDefault: f.idioma_default,
    plantillas: {
      listo: { es: f.plantilla_listo_es, pt: f.plantilla_listo_pt },
      renovacion: { es: f.plantilla_renovacion_es, pt: f.plantilla_renovacion_pt },
    },
  };
}

export const COLUMNAS_CANDIDATO = `
  cliente_id, nombre, whatsapp, idioma::text as idioma, pedido_id, pedido_numero, pedido_creado_en,
  ultima_entrega, ultimo_pedido_creado_en, pedidos_abiertos, ultimo_aviso_renovacion`;

export interface FilaCandidato {
  cliente_id: string;
  nombre: string;
  whatsapp: string;
  idioma: Idioma;
  pedido_id: string;
  pedido_numero: number;
  pedido_creado_en: Instante;
  ultima_entrega: Instante;
  ultimo_pedido_creado_en: Instante;
  pedidos_abiertos: number;
  ultimo_aviso_renovacion: Instante | null;
}

export function aCandidato(f: FilaCandidato): CandidatoRenovacion {
  return {
    clienteId: f.cliente_id,
    nombre: f.nombre,
    whatsapp: f.whatsapp,
    idioma: f.idioma,
    pedidoId: f.pedido_id,
    pedidoNumero: Number(f.pedido_numero),
    pedidoCreadoEn: iso(f.pedido_creado_en),
    ultimaEntrega: iso(f.ultima_entrega),
    ultimoPedidoCreadoEn: iso(f.ultimo_pedido_creado_en),
    pedidosAbiertos: Number(f.pedidos_abiertos),
    ultimoAvisoRenovacion: isoONulo(f.ultimo_aviso_renovacion),
  };
}
