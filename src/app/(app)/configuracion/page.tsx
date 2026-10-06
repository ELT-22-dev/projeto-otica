import type { Metadata } from "next";
import { ErrorDominio } from "@/domain/shared/errores";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { FormAjustes } from "./FormAjustes";

export const metadata: Metadata = { title: t.ajustes.titulo };

export default async function PaginaAjustes() {
  let org;
  try {
    org = await (await casosDeUso()).obtenerConfiguracion();
  } catch (e) {
    if (e instanceof ErrorDominio && e.codigo === "no_autorizado") {
      return <p className="py-12 text-center text-sm text-muted-foreground">{t.ajustes.soloAdmin}</p>;
    }
    throw e;
  }

  return (
    <div className="flex flex-col gap-4 lg:max-w-5xl lg:gap-6">
      <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">{t.ajustes.titulo}</h1>
      <FormAjustes
        inicial={{
          nombre: org.nombre,
          telefonoWhatsapp: org.telefonoWhatsapp ? `+${org.telefonoWhatsapp}` : "",
          idiomaDefault: org.idiomaDefault,
          plantillaListoEs: org.plantillas.listo.es,
          plantillaListoPt: org.plantillas.listo.pt,
          plantillaRenovacionEs: org.plantillas.renovacion.es,
          plantillaRenovacionPt: org.plantillas.renovacion.pt,
        }}
      />
    </div>
  );
}
