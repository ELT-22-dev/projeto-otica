import { describe, expect, it } from "vitest";
import { agruparPorDia, normalizarHora, puedeCambiarCita, validarHorario, type Cita } from "@/domain/cita/Cita";
import { variantesWhatsapp } from "@/domain/cliente/telefono";
import { fechaParaMensaje, renderizarPlantilla, validarPlantilla } from "@/domain/notificacion/plantilla";
import {
  decidirRespuesta,
  envioAutomaticoDisponible,
  type ConexionWhatsapp,
  type SituacionChat,
} from "@/domain/whatsapp/whatsapp";

describe("horário da cita", () => {
  it.each([
    ["9:30", "09:30"],
    ["09:30", "09:30"],
    ["14:05:00", "14:05"],
    ["23:59", "23:59"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarHora(entrada)).toBe(esperado);
  });

  it.each(["24:00", "9", "09:60", "", "abc"])("rejeita %s", (h) => {
    expect(() => normalizarHora(h)).toThrow("horario_invalido");
  });

  it("não marca em dia que já passou; hoje pode", () => {
    expect(validarHorario("2026-10-05", "10:00", "2026-10-05")).toEqual({ fecha: "2026-10-05", hora: "10:00" });
    expect(() => validarHorario("2026-10-04", "10:00", "2026-10-05")).toThrow("fecha_invalida");
    expect(() => validarHorario("2026-02-30", "10:00", "2026-01-01")).toThrow("fecha_invalida");
  });

  it("transições: solicitação vira confirmada; finais não mudam", () => {
    expect(puedeCambiarCita("solicitada", "confirmada")).toBe(true);
    expect(puedeCambiarCita("solicitada", "atendida")).toBe(false);
    expect(puedeCambiarCita("confirmada", "confirmada")).toBe(true);
    expect(puedeCambiarCita("atendida", "cancelada")).toBe(false);
    expect(puedeCambiarCita("cancelada", "confirmada")).toBe(false);
  });

  it("agrupa por dia em ordem de horário e ignora as sem data", () => {
    const base = { clienteId: null, whatsapp: null, jid: null, motivo: null, preferencia: null, notas: null };
    const cita = (id: string, fecha: string | null, hora: string | null): Cita => ({
      ...base,
      id,
      nombre: id,
      fecha,
      hora,
      estado: fecha ? "confirmada" : "solicitada",
      origen: "sistema",
      createdAt: "2026-10-01T00:00:00.000Z",
    });
    const dias = agruparPorDia([
      cita("c", "2026-10-06", "15:00"),
      cita("a", "2026-10-05", "11:00"),
      cita("s", null, null),
      cita("b", "2026-10-06", "09:00"),
    ]);
    expect(dias.map((d) => [d.fecha, d.citas.map((c) => c.id)])).toEqual([
      ["2026-10-05", ["a"]],
      ["2026-10-06", ["b", "c"]],
    ]);
  });
});

describe("variantes do número no WhatsApp", () => {
  it("celular brasileiro com e sem o 9", () => {
    expect(variantesWhatsapp("5511987654321")).toEqual(["5511987654321", "551187654321"]);
    expect(variantesWhatsapp("551187654321")).toEqual(["551187654321", "5511987654321"]);
  });

  it("fixo e estrangeiro não ganham variante", () => {
    expect(variantesWhatsapp("551133334444")).toEqual(["551133334444"]);
    expect(variantesWhatsapp("51987654321")).toEqual(["51987654321"]);
  });
});

describe("mensagem de cita", () => {
  it("data no idioma do cliente", () => {
    expect(fechaParaMensaje("2026-10-10", "es")).toBe("sábado 10/10");
    expect(fechaParaMensaje("2026-10-12", "pt")).toBe("segunda-feira 12/10");
  });

  it("template aceita {fecha} e {hora}", () => {
    const plantilla = validarPlantilla("Hola {nombre}! {optica}: {fecha} a las {hora}.");
    expect(
      renderizarPlantilla(plantilla, {
        nombreCliente: "Rosa Gutiérrez",
        optica: "Latina",
        fecha: "sábado 10/10",
        hora: "10:30",
      }),
    ).toBe("Hola Rosa! Latina: sábado 10/10 a las 10:30.");
  });
});

describe("WhatsApp conectado", () => {
  const ahora = new Date("2026-10-05T15:00:00.000Z");
  const conexion = (c: Partial<ConexionWhatsapp>): ConexionWhatsapp => ({
    estado: "conectado",
    qr: null,
    numero: "5511900000000",
    nombre: null,
    ...c,
  });

  it("só envia sozinho com o serviço no ar e o celular vinculado", () => {
    expect(envioAutomaticoDisponible(conexion({}))).toBe(true);
    expect(envioAutomaticoDisponible(conexion({ estado: "esperando_qr" }))).toBe(false);
    expect(envioAutomaticoDisponible(null)).toBe(false);
  });

  const situacion = (s: Partial<SituacionChat>): SituacionChat => ({
    modo: "clientes",
    iaDisponible: true,
    esCliente: true,
    ultimaRespuestaHumana: null,
    respuestasIaUltimaHora: 0,
    ultimoMensajeCliente: "2026-10-05T14:59:00.000Z",
    ...s,
  });

  it("responde cliente cadastrado com IA ligada", () => {
    expect(decidirRespuesta(situacion({}), ahora)).toEqual({ responder: true });
  });

  it.each([
    [{ modo: "nadie" as const }, "desactivada"],
    [{ iaDisponible: false }, "desactivada"],
    [{ esCliente: false }, "no_cliente"],
    [{ ultimoMensajeCliente: "2026-10-05T14:40:00.000Z" }, "antiguo"],
    [{ ultimaRespuestaHumana: "2026-10-05T10:00:00.000Z" }, "humano_atendiendo"],
    [{ respuestasIaUltimaHora: 8 }, "limite"],
  ])("não responde: %o → %s", (cambio, motivo) => {
    expect(decidirRespuesta(situacion(cambio), ahora)).toEqual({ responder: false, motivo });
  });

  it("modo 'todos' responde quem não é cliente; a pausa humana acaba depois de 12 h", () => {
    expect(decidirRespuesta(situacion({ modo: "todos", esCliente: false }), ahora).responder).toBe(true);
    expect(decidirRespuesta(situacion({ ultimaRespuestaHumana: "2026-10-05T02:00:00.000Z" }), ahora).responder).toBe(
      true,
    );
  });
});
