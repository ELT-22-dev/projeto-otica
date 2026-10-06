import type { ConexionWhatsapp } from "@/domain/whatsapp/whatsapp";
import type { ServicioWhatsappPort } from "@/ports";

/** Cliente HTTP do serviço do WhatsApp (worker/whatsapp.ts). */
export class ServicioWhatsappHttp implements ServicioWhatsappPort {
  /** Uma consulta de estado por request basta (layout + página + aviso pedem a mesma coisa). */
  private estadoEnCurso: Promise<ConexionWhatsapp | null> | null = null;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async llamar(ruta: string, init: { method?: string; body?: unknown; timeoutMs: number }) {
    const respuesta = await fetch(new URL(ruta, this.url), {
      method: init.method ?? "GET",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(init.timeoutMs),
      cache: "no-store",
    });
    if (!respuesta.ok) throw new Error(`servicio whatsapp ${ruta}: HTTP ${respuesta.status}`);
    return respuesta.json() as Promise<unknown>;
  }

  estado(): Promise<ConexionWhatsapp | null> {
    this.estadoEnCurso ??= this.llamar("estado", { timeoutMs: 2_500 })
      .then((r) => r as ConexionWhatsapp)
      .catch((e) => {
        // Desligado ou sem internet: o app segue com wa.me.
        console.warn(`[whatsapp] servicio no disponible: ${e instanceof Error ? e.message : e}`);
        return null;
      });
    return this.estadoEnCurso;
  }

  async conectar(): Promise<void> {
    this.estadoEnCurso = null;
    await this.llamar("conectar", { method: "POST", timeoutMs: 5_000 });
  }

  async desconectar(): Promise<void> {
    this.estadoEnCurso = null;
    await this.llamar("desconectar", { method: "POST", timeoutMs: 10_000 });
  }

  async enviar(m: Parameters<ServicioWhatsappPort["enviar"]>[0]): Promise<string> {
    const r = (await this.llamar("mensajes", { method: "POST", body: m, timeoutMs: 5_000 })) as { id: string };
    return r.id;
  }
}

/** Sem WHATSAPP_URL configurado: o sistema funciona só com wa.me. */
export const servicioWhatsappApagado: ServicioWhatsappPort = {
  estado: async () => null,
  conectar: async () => {},
  desconectar: async () => {},
  enviar: async () => {
    throw new Error("servicio de WhatsApp no configurado");
  },
};
