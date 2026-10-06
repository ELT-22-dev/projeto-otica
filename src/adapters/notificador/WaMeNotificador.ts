import type { MensajeSaliente, NotificadorPort, ResultadoEnvio } from "@/ports";

/** Não envia nada: devolve o link wa.me para a atendente tocar "enviar" no WhatsApp. */
export class WaMeNotificador implements NotificadorPort {
  readonly canal = "wa_me" as const;

  async enviar({ telefono, texto }: MensajeSaliente): Promise<ResultadoEnvio> {
    return { tipo: "requiere_accion", url: `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}` };
  }
}
