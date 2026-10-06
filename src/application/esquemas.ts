import { z } from "zod";
import { STATUS_PEDIDO } from "@/domain/pedido/status-pedido";
import { IDIOMAS } from "@/domain/shared/idioma";

/** Campo numérico opcional vindo de formulário: "" → null, "-1,25" → -1.25. */
const numeroOpcional = z.preprocess((v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") {
    const t = v.trim().replace(",", ".").replace(/^\+/, "");
    return t === "" ? null : Number(t);
  }
  return v;
}, z.number().nullable());

const textoOpcional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

export const esquemaId = z.uuid();

export const esquemaReceta = z.object({
  odEsfera: numeroOpcional,
  odCilindro: numeroOpcional,
  odEje: numeroOpcional,
  oiEsfera: numeroOpcional,
  oiCilindro: numeroOpcional,
  oiEje: numeroOpcional,
  adicion: numeroOpcional,
  dnpOd: numeroOpcional,
  dnpOi: numeroOpcional,
  observaciones: textoOpcional(2000).transform((v) => v ?? null),
  fechaReceta: z
    .preprocess((v) => (v === "" ? null : v), z.iso.date().nullable().optional())
    .transform((v) => v ?? null),
});

export const esquemaCrearPedido = z.object({
  cliente: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("existente"), id: z.uuid() }),
    z.object({
      tipo: z.literal("nuevo"),
      nombre: z.string().trim().min(2).max(120),
      whatsapp: z.string().trim().min(1).max(25),
      idioma: z.enum(IDIOMAS),
    }),
  ]),
  descripcionArmazon: z.string().trim().min(1).max(500),
  tipoLente: textoOpcional(200),
  /** Texto como a atendente digitou ("350,50"); o domínio converte. */
  valorTotal: z.string().trim().min(1).max(20),
  valorAdelanto: z.string().trim().max(20).optional(),
  fechaEntregaPrevista: z.iso.date(),
  receta: esquemaReceta.nullable().optional(),
});
export type EntradaCrearPedido = z.input<typeof esquemaCrearPedido>;

export const esquemaCambiarStatus = z.object({
  pedidoId: z.uuid(),
  status: z.enum(STATUS_PEDIDO),
});

export const esquemaListarPedidos = z.object({
  status: z.enum(STATUS_PEDIDO).optional(),
  busqueda: z.string().trim().max(60).optional(),
});

export const esquemaBuscarClientes = z.string().trim().max(60);

const plantilla = z.string().trim().min(1).max(1000);

export const esquemaConfiguracion = z.object({
  nombre: z.string().trim().min(2).max(120),
  telefonoWhatsapp: textoOpcional(25),
  idiomaDefault: z.enum(IDIOMAS),
  plantillaListoEs: plantilla,
  plantillaListoPt: plantilla,
  plantillaRenovacionEs: plantilla,
  plantillaRenovacionPt: plantilla,
});
export type EntradaConfiguracion = z.input<typeof esquemaConfiguracion>;
