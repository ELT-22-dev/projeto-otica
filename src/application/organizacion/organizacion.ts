import { normalizarWhatsapp } from "@/domain/cliente/telefono";
import { validarPlantilla } from "@/domain/notificacion/plantilla";
import { requerirAdmin, type Dependencias } from "../dependencias";
import { esquemaConfiguracion } from "../esquemas";

/** Usuário logado + nome da ótica, para o cabeçalho e a navegação. */
export function obtenerContexto(deps: Pick<Dependencias, "organizacion" | "sesion">) {
  return async () => {
    const usuario = await deps.sesion.usuarioActual();
    if (!usuario) return null;
    const org = await deps.organizacion.obtenerActual();
    return { usuario, organizacion: { nombre: org.nombre, idiomaDefault: org.idiomaDefault } };
  };
}

export function obtenerConfiguracion(deps: Pick<Dependencias, "organizacion" | "sesion">) {
  return async () => {
    await requerirAdmin(deps.sesion);
    return deps.organizacion.obtenerActual();
  };
}

export function actualizarConfiguracion(deps: Pick<Dependencias, "organizacion" | "sesion">) {
  return async (entrada: unknown) => {
    await requerirAdmin(deps.sesion);
    const d = esquemaConfiguracion.parse(entrada);
    await deps.organizacion.actualizar({
      nombre: d.nombre,
      telefonoWhatsapp: d.telefonoWhatsapp ? normalizarWhatsapp(d.telefonoWhatsapp) : null,
      idiomaDefault: d.idiomaDefault,
      plantillas: {
        listo: { es: validarPlantilla(d.plantillaListoEs), pt: validarPlantilla(d.plantillaListoPt) },
        renovacion: { es: validarPlantilla(d.plantillaRenovacionEs), pt: validarPlantilla(d.plantillaRenovacionPt) },
        cita: { es: validarPlantilla(d.plantillaCitaEs), pt: validarPlantilla(d.plantillaCitaPt) },
      },
      bot: { responde: d.iaResponde, info: d.infoParaIa },
    });
  };
}
