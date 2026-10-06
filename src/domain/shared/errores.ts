export type CodigoErrorDominio =
  | "telefono_invalido"
  | "nombre_invalido"
  | "descripcion_requerida"
  | "transicion_invalida"
  | "monto_invalido"
  | "adelanto_mayor_que_total"
  | "fecha_invalida"
  | "receta_invalida"
  | "plantilla_invalida"
  | "pedido_no_listo"
  | "cliente_no_elegible"
  | "no_encontrado"
  | "no_autorizado"
  | "conflicto"
  | "ia_no_disponible"
  | "imagen_invalida"
  | "receta_no_legible"
  | "email_en_uso"
  | "contrasena_corta"
  | "operacion_no_permitida"
  | "horario_invalido"
  | "cita_sin_whatsapp"
  | "whatsapp_servicio_apagado"
  | "whatsapp_no_conectado";

export class ErrorDominio extends Error {
  readonly codigo: CodigoErrorDominio;

  constructor(codigo: CodigoErrorDominio, detalle?: string) {
    super(detalle ? `${codigo}: ${detalle}` : codigo);
    this.name = "ErrorDominio";
    this.codigo = codigo;
  }
}
