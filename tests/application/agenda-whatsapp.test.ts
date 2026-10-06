import { describe, expect, it } from "vitest";
import { crearCasosDeUso, crearCasosDeUsoBot } from "@/application";
import { ADMIN, crearFakes } from "./fakes";

const AHORA = new Date("2026-10-05T15:00:00.000Z"); // segunda, 12h em São Paulo

function conCliente(f: ReturnType<typeof crearFakes>, whatsapp = "5511987654321", idioma: "es" | "pt" = "es") {
  const id = "00000000-0000-4000-8000-00000000c001";
  f.clientes.set(id, { id, nombre: "Rosa Gutiérrez", whatsapp, idioma, notas: null, createdAt: AHORA.toISOString() });
  return id;
}

describe("agenda", () => {
  it("cita nova para cliente cadastrado: confirmação no idioma dele pelo wa.me", async () => {
    const f = crearFakes({ ahora: AHORA });
    const clienteId = conCliente(f, "5511987654321", "pt");
    const casos = crearCasosDeUso(f.deps);

    const r = await casos.crearCita({
      cliente: { tipo: "existente", id: clienteId },
      fecha: "2026-10-10",
      hora: "9:30",
      motivo: "Exame de vista",
    });

    const texto = "Olá Rosa! Seu horário na Óticas Latina ficou para sábado 10/10 às 09:30.";
    expect(r.envio).toEqual({
      tipo: "requiere_accion",
      url: `https://wa.me/5511987654321?text=${encodeURIComponent(texto)}`,
    });
    expect(f.citas.get(r.id)).toMatchObject({
      estado: "confirmada",
      fecha: "2026-10-10",
      hora: "09:30",
      origen: "sistema",
    });
    expect(f.notificaciones).toEqual([{ clienteId, pedidoId: null, tipo: "cita", canal: "wa_me", mensaje: texto }]);
  });

  it("pessoa sem cadastro: valida o número; sem 'avisar' não envia nada", async () => {
    const f = crearFakes({ ahora: AHORA });
    const casos = crearCasosDeUso(f.deps);
    const r = await casos.crearCita({
      cliente: { tipo: "nuevo", nombre: "Juan Pérez", whatsapp: "11 91234-5678" },
      fecha: "2026-10-05",
      hora: "16:00",
      avisar: false,
    });
    expect(r.envio).toBeNull();
    expect(f.citas.get(r.id)).toMatchObject({ clienteId: null, whatsapp: "5511912345678" });
    await expect(
      casos.crearCita({
        cliente: { tipo: "nuevo", nombre: "Juan", whatsapp: "123" },
        fecha: "2026-10-06",
        hora: "10:00",
      }),
    ).rejects.toThrow("telefono_invalido");
    await expect(
      casos.crearCita({
        cliente: { tipo: "nuevo", nombre: "Juan", whatsapp: "11 91234-5678" },
        fecha: "2026-10-04",
        hora: "10:00",
      }),
    ).rejects.toThrow("fecha_invalida");
  });

  it("com o WhatsApp conectado a confirmação entra na fila e sai sozinha", async () => {
    const f = crearFakes({ ahora: AHORA, whatsappConectado: true });
    const clienteId = conCliente(f);
    const casos = crearCasosDeUso(f.deps);
    const r = await casos.crearCita({
      cliente: { tipo: "existente", id: clienteId },
      fecha: "2026-10-06",
      hora: "11:00",
    });

    expect(r.envio?.tipo).toBe("enviado");
    expect(f.mensajes).toMatchObject([
      { direccion: "saliente", origen: "aviso", estado: "pendiente", whatsapp: "5511987654321", clienteId },
    ]);
    expect(f.notificaciones[0]!.canal).toBe("whatsapp");
  });

  it("solicitação do WhatsApp é confirmada com dia e hora; atendida é final", async () => {
    const f = crearFakes({ ahora: AHORA });
    const casos = crearCasosDeUso(f.deps);
    const id = await f.deps.citas.crear(
      {
        clienteId: null,
        nombre: "Juan",
        whatsapp: "5511912345678",
        jid: "5511912345678@s.whatsapp.net",
        fecha: null,
        hora: null,
        motivo: "examen",
        preferencia: "sábado de mañana",
        notas: null,
        estado: "solicitada",
        origen: "whatsapp",
      },
      null,
    );
    expect((await casos.obtenerAgenda()).solicitudes.map((c) => c.id)).toEqual([id]);

    const r = await casos.confirmarCita({ id, fecha: "2026-10-10", hora: "10:00" });
    expect(r.envio?.tipo).toBe("requiere_accion");
    const agenda = await casos.obtenerAgenda();
    expect(agenda.solicitudes).toEqual([]);
    expect(agenda.dias).toMatchObject([{ fecha: "2026-10-10", citas: [{ id, hora: "10:00" }] }]);

    await casos.cambiarEstadoCita({ id, estado: "atendida" });
    await expect(casos.confirmarCita({ id, fecha: "2026-10-11", hora: "10:00" })).rejects.toThrow(
      "transicion_invalida",
    );
    expect(await casos.resumenAgenda()).toEqual({ solicitudes: 0, hoy: 0 });
  });
});

describe("WhatsApp conectado pela tela", () => {
  it("serviço desligado ou celular desvinculado: aviso volta para o wa.me", async () => {
    const f = crearFakes({ ahora: AHORA });
    const clienteId = conCliente(f);
    const casos = crearCasosDeUso(f.deps);
    const cita = { cliente: { tipo: "existente", id: clienteId }, fecha: "2026-10-06", hora: "11:00" };
    expect((await casos.crearCita(cita)).envio?.tipo).toBe("requiere_accion");
    f.servicio.estado = { estado: "desconectado", qr: null, numero: null, nombre: null };
    expect((await casos.crearCita(cita)).envio?.tipo).toBe("requiere_accion");
    expect(f.mensajes).toEqual([]);
    expect((await casos.obtenerWhatsapp()).servicioEnLinea).toBe(true);
  });

  it("avisos de óculos prontos saem sozinhos quando conectado", async () => {
    const f = crearFakes({ ahora: AHORA, whatsappConectado: true });
    const casos = crearCasosDeUso(f.deps);
    const { pedidoId } = await casos.crearPedido({
      cliente: { tipo: "nuevo", nombre: "Ana Torres", whatsapp: "11 98765-4321", idioma: "es" },
      descripcionArmazon: "Armação preta",
      valorTotal: "300",
      fechaEntregaPrevista: "2026-10-10",
    });
    const r = await casos.listoYAvisar(pedidoId);
    expect(r.tipo).toBe("enviado");
    expect(f.mensajes[0]).toMatchObject({ estado: "pendiente", texto: expect.stringContaining("Ana") });
    expect(f.notificaciones[0]!.canal).toBe("whatsapp");
  });

  it("conectar e desconectar: só admin e só com o serviço no ar", async () => {
    const apagado = crearCasosDeUso(crearFakes({ ahora: AHORA, usuario: ADMIN }).deps);
    await expect(apagado.conectarWhatsapp()).rejects.toThrow("whatsapp_servicio_apagado");

    const f = crearFakes({ ahora: AHORA, usuario: ADMIN, whatsappConectado: true });
    await crearCasosDeUso(f.deps).desconectarWhatsapp();
    expect(f.servicio.acciones).toEqual(["desconectar"]);

    const atendente = crearCasosDeUso(crearFakes({ ahora: AHORA, whatsappConectado: true }).deps);
    await expect(atendente.desconectarWhatsapp()).rejects.toThrow("no_autorizado");
  });

  it("QR só aparece para o admin", async () => {
    const f = crearFakes({ ahora: AHORA, usuario: ADMIN, whatsappConectado: true });
    f.servicio.estado = { estado: "esperando_qr", qr: "2@abc", numero: null, nombre: null };
    expect((await crearCasosDeUso(f.deps).obtenerWhatsapp()).qr).toBe("2@abc");
    const g = crearFakes({ ahora: AHORA, whatsappConectado: true });
    g.servicio.estado = { estado: "esperando_qr", qr: "2@abc", numero: null, nombre: null };
    expect((await crearCasosDeUso(g.deps).obtenerWhatsapp()).qr).toBeNull();
  });
});

describe("IA respondendo no WhatsApp", () => {
  const JID = "5511987654321@s.whatsapp.net";
  const chat = { jid: JID, whatsapp: "5511987654321", nombre: "Rosa" };
  let n = 0;
  const recibir = (bot: ReturnType<typeof crearCasosDeUsoBot>, texto: string) =>
    bot.registrarMensajeCliente({ ...chat, texto, idExterno: `wa-${++n}` });

  it("cliente pergunta pelo pedido: a IA consulta e a resposta entra na fila", async () => {
    const f = crearFakes({
      ahora: AHORA,
      respuestaIA: async ({ herramientas }) => {
        const r = (await herramientas.find((h) => h.nombre === "estado_de_mis_pedidos")!.ejecutar({})) as {
          pedidos: { numero: string; estado: string }[];
        };
        return `Tu pedido ${r.pedidos[0]!.numero} está ${r.pedidos[0]!.estado}`;
      },
    });
    const clienteId = conCliente(f, "551187654321"); // cadastrado sem o 9
    await crearCasosDeUso(f.deps).crearPedido({
      cliente: { tipo: "existente", id: clienteId },
      descripcionArmazon: "Ray-Ban",
      valorTotal: "300",
      fechaEntregaPrevista: "2026-10-10",
    });
    const bot = crearCasosDeUsoBot(f.deps);

    await recibir(bot, "hola, mis lentes ya están?");
    await recibir(bot, "es el pedido de la semana pasada");
    const r = await bot.responderConversacion(chat);

    expect(r).toEqual({ respondido: true, texto: "Tu pedido #0001 está en_laboratorio" });
    expect(f.asistente.pregunta).toBe("hola, mis lentes ya están?\nes el pedido de la semana pasada");
    expect(f.mensajes.at(-1)).toMatchObject({ origen: "ia", estado: "pendiente", jid: JID, clienteId });
    // Nada novo para responder.
    expect(await bot.responderConversacion(chat)).toEqual({ respondido: false, motivo: "nada_nuevo" });
  });

  it("pedido de cita vira solicitação na agenda (uma só por conversa)", async () => {
    const f = crearFakes({
      ahora: AHORA,
      respuestaIA: async ({ herramientas }) => {
        const h = herramientas.find((x) => x.nombre === "solicitar_cita")!;
        await h.ejecutar({ preferencia: "sábado de mañana", motivo: "examen de vista" });
        await h.ejecutar({ preferencia: "sábado", motivo: "examen" });
        return "¡Listo! El equipo te confirma el horario por aquí.";
      },
    });
    conCliente(f);
    const bot = crearCasosDeUsoBot(f.deps);
    await recibir(bot, "quiero agendar un examen el sábado de mañana");
    await bot.responderConversacion(chat);

    const solicitudes = [...f.citas.values()];
    expect(solicitudes).toMatchObject([
      { estado: "solicitada", origen: "whatsapp", nombre: "Rosa Gutiérrez", jid: JID, preferencia: "sábado de mañana" },
    ]);
    expect(await crearCasosDeUso(f.deps).resumenAgenda()).toEqual({ solicitudes: 1, hoy: 0 });
  });

  it("número desconhecido não recebe resposta no modo 'só clientes'", async () => {
    const f = crearFakes({ ahora: AHORA });
    const bot = crearCasosDeUsoBot(f.deps);
    await recibir(bot, "hola");
    expect(await bot.responderConversacion(chat)).toEqual({ respondido: false, motivo: "no_cliente" });
    expect(f.mensajes).toHaveLength(1);
  });

  it("depois que a equipe responde pelo celular, a IA fica quieta", async () => {
    const f = crearFakes({ ahora: AHORA });
    conCliente(f);
    const bot = crearCasosDeUsoBot(f.deps);
    await recibir(bot, "hola");
    await bot.registrarMensajeDelTelefono({
      jid: JID,
      whatsapp: chat.whatsapp,
      texto: "Hola Rosa!",
      idExterno: "tel-1",
    });
    await recibir(bot, "gracias, ¿a qué hora cierran?");
    expect(await bot.responderConversacion(chat)).toEqual({ respondido: false, motivo: "humano_atendiendo" });
  });

  it("mensagem repetida (mesmo id do WhatsApp) é ignorada", async () => {
    const f = crearFakes({ ahora: AHORA });
    const bot = crearCasosDeUsoBot(f.deps);
    await bot.registrarMensajeCliente({ ...chat, texto: "hola", idExterno: "dup" });
    await bot.registrarMensajeCliente({ ...chat, texto: "hola", idExterno: "dup" });
    expect(f.mensajes).toHaveLength(1);
  });

  it("IA fora do ar: a conversa fica marcada para a equipe", async () => {
    const { ErrorDominio } = await import("@/domain/shared/errores");
    const f = crearFakes({
      ahora: AHORA,
      respuestaIA: async () => {
        throw new ErrorDominio("ia_no_disponible");
      },
    });
    conCliente(f);
    const bot = crearCasosDeUsoBot(f.deps);
    await recibir(bot, "hola");
    expect(await bot.responderConversacion(chat)).toEqual({ respondido: false, motivo: "ia_no_disponible" });
    expect(await f.deps.whatsapp.contarChatsConAtencion()).toBe(1);

    const conversaciones = await crearCasosDeUso(f.deps).listarConversaciones();
    expect(conversaciones).toMatchObject([{ jid: JID, nombre: "Rosa Gutiérrez", requiereAtencion: true }]);
    await crearCasosDeUso(f.deps).marcarConversacionAtendida(JID);
    expect(await f.deps.whatsapp.contarChatsConAtencion()).toBe(0);
  });

  it("equipe responde pela tela: sai pelo WhatsApp, apaga o sinal e a IA dá um tempo", async () => {
    const f = crearFakes({ ahora: AHORA, whatsappConectado: true });
    conCliente(f);
    const bot = crearCasosDeUsoBot(f.deps);
    const casos = crearCasosDeUso(f.deps);
    await recibir(bot, "¿cuánto cuestan los progresivos?");
    await f.deps.whatsapp.marcarAtencion(JID, true);

    await casos.responderConversacion({ jid: JID, texto: "Hola Rosa, depende de la receta. ¿Nos mandas una foto?" });

    expect(f.mensajes.at(-1)).toMatchObject({
      direccion: "saliente",
      origen: "telefono",
      estado: "pendiente",
      jid: JID,
      whatsapp: "5511987654321",
    });
    expect(await f.deps.whatsapp.contarChatsConAtencion()).toBe(0);
    await recibir(bot, "ok, ya te mando");
    expect(await bot.responderConversacion(chat)).toEqual({ respondido: false, motivo: "humano_atendiendo" });
  });

  it("responder pela tela exige o WhatsApp conectado", async () => {
    const f = crearFakes({ ahora: AHORA });
    await recibir(crearCasosDeUsoBot(f.deps), "hola");
    await expect(crearCasosDeUso(f.deps).responderConversacion({ jid: JID, texto: "hola" })).rejects.toThrow(
      "whatsapp_no_conectado",
    );
  });

  it("sem IA configurada ninguém responde", async () => {
    const f = crearFakes({ ahora: AHORA, sinIA: true });
    conCliente(f);
    const bot = crearCasosDeUsoBot(f.deps);
    await recibir(bot, "hola");
    expect(await bot.responderConversacion(chat)).toEqual({ respondido: false, motivo: "desactivada" });
  });
});
