import { envioAutomaticoDisponible } from "@/domain/whatsapp/whatsapp";
import type { MensajeSaliente, NotificadorPort, ResultadoEnvio, ServicioWhatsappPort } from "@/ports";
import { WaMeNotificador } from "./WaMeNotificador";

/**
 * Com o WhatsApp da ótica conectado por QR, o serviço envia sozinho.
 * Se ele estiver desligado, desconectado ou falhar, cai no wa.me de sempre: o aviso nunca deixa de sair.
 */
export class NotificadorWhatsapp implements NotificadorPort {
  private readonly respaldo = new WaMeNotificador();

  constructor(private readonly servicio: ServicioWhatsappPort) {}

  async enviar(m: MensajeSaliente): Promise<ResultadoEnvio> {
    if (!envioAutomaticoDisponible(await this.servicio.estado())) return this.respaldo.enviar(m);
    try {
      const id = await this.servicio.enviar({
        whatsapp: m.telefono,
        jid: m.jid ?? null,
        clienteId: m.clienteId ?? null,
        texto: m.texto,
      });
      return { tipo: "enviado", idExterno: id };
    } catch (e) {
      console.error("[whatsapp] el servicio no aceptó el mensaje; se usa wa.me", e);
      return this.respaldo.enviar(m);
    }
  }
}
