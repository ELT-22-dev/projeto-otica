import { z } from "zod";
import type { LecturaReceta } from "@/ports";

/** Esquema e instruções da leitura de receita, iguais para qualquer provedor de IA. */
const numero = z.number().nullable();

export const EsquemaLectura = z.object({
  es_receta_optica: z.boolean().describe("true si la imagen es una receta o prescripción de lentes"),
  od_esfera: numero,
  od_cilindro: numero,
  od_eje: numero,
  oi_esfera: numero,
  oi_cilindro: numero,
  oi_eje: numero,
  adicion: numero,
  dnp_od: numero,
  dnp_oi: numero,
  fecha_receta: z.string().nullable().describe("AAAA-MM-DD"),
  observaciones: z.string().nullable(),
  advertencias: z.string().nullable(),
});

export const INSTRUCCIONES_RECETA = `Lees recetas de lentes (prescripciones oftalmológicas) fotografiadas en una óptica de São Paulo.
Las recetas pueden estar en portugués o español, impresas o escritas a mano.

Equivalencias:
- Ojo derecho: OD. Ojo izquierdo: OI en español, OE ("olho esquerdo") en portugués. Ambos van en los campos oi_*.
- Esfera: "esf", "esférico". Cilindro: "cil", "cilíndrico". Eje: "eixo", "eje", en grados.
- Adición: "adição", "add".
- DNP: distancia naso-pupilar de cada ojo (en mm, normalmente 25-38).

Reglas:
- Copia los valores tal como están escritos, con su signo. "Plano", "pl" o "0,00" en esfera es 0.
- Usa los valores de lejos ("longe"/"lejos"). Si solo hay valores de cerca, déjalos en null y explícalo en advertencias.
- Si solo hay una distancia pupilar total (DP/DIP), deja dnp_od y dnp_oi en null y anota la DP total en advertencias.
- Si un número es ilegible o dudoso, déjalo en null y menciónalo en advertencias. Es mejor null que un valor inventado.
- observaciones: indicaciones del médico relevantes para la óptica (tipo de lente, uso, tratamientos). Sin datos personales.
- advertencias: breve, en español, solo si hay algo que la atendente deba revisar.
- Si la imagen no es una receta de lentes, es_receta_optica = false y todo lo demás null.`;

export function aLectura(r: z.infer<typeof EsquemaLectura>): LecturaReceta {
  return {
    esReceta: r.es_receta_optica,
    valores: {
      odEsfera: r.od_esfera,
      odCilindro: r.od_cilindro,
      odEje: r.od_eje,
      oiEsfera: r.oi_esfera,
      oiCilindro: r.oi_cilindro,
      oiEje: r.oi_eje,
      adicion: r.adicion,
      dnpOd: r.dnp_od,
      dnpOi: r.dnp_oi,
    },
    fechaReceta: r.fecha_receta,
    observaciones: r.observaciones,
    advertencias: r.advertencias,
  };
}
