/** A mudança de hospedagem copia tudo igual: datas, horas, valores, numeração dos pedidos e sessão do WhatsApp. */
import type { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { copiarDatos, type Consulta } from "../../scripts/_copiar";
import { sembrarDemo } from "../../scripts/datos-demo";
import { crearBaseDeDatos } from "./pglite";

const consulta =
  (db: PGlite): Consulta =>
  async <T>(texto: string, params?: unknown[]) =>
    (await db.query<T>(texto, params)).rows;

describe("copiar banco", () => {
  it("destino fica idêntico e a numeração dos pedidos continua", async () => {
    const [origen, destino] = await Promise.all([crearBaseDeDatos(), crearBaseDeDatos()]);
    await sembrarDemo(consulta(origen), {
      hoy: "2026-10-05",
      usuarios: [{ email: "admin@x.com", nombre: "Eddy", rol: "admin", passwordHash: "h" }],
      demoWhatsapp: null,
    });
    await origen.query("update configuracion set info_para_ia = 'Rua 1', plantilla_cita_es = 'Hola {nombre} {fecha}'");
    await origen.query(
      `insert into citas (nombre, whatsapp, fecha, hora, estado) values ('Ana', '5511912345678', '2026-10-10', '09:30', 'confirmada')`,
    );
    await origen.query(`insert into whatsapp_auth (clave, valor) values ('creds', '{"me":1}')`);

    await copiarDatos(consulta(origen), consulta(destino));

    for (const sql of [
      "select * from configuracion",
      "select id, numero, fecha_pedido::text, fecha_entrega_prevista::text, valor_total::text, fecha_listo, status::text from pedidos order by numero",
      "select id, nombre, nombre_busqueda, whatsapp from clientes order by id",
      "select fecha::text, hora::text, estado::text from citas",
      "select * from whatsapp_auth",
      "select count(*)::int as n from notificaciones",
    ]) {
      expect((await destino.query(sql)).rows).toEqual((await origen.query(sql)).rows);
    }

    // Próximo pedido segue a numeração do original.
    const [{ max }] = (await origen.query<{ max: number }>("select max(numero) as max from pedidos")).rows as [
      { max: number },
    ];
    const cliente = (await destino.query<{ id: string }>("select id from clientes limit 1")).rows[0]!.id;
    const nuevo = await destino.query<{ numero: number }>(
      `insert into pedidos (cliente_id, descripcion_armazon, valor_total, fecha_entrega_prevista)
       values ($1, 'x', 10, '2026-12-01') returning numero`,
      [cliente],
    );
    expect(nuevo.rows[0]!.numero).toBe(max + 1);

    // Não copia por cima de dados existentes.
    await expect(copiarDatos(consulta(origen), consulta(destino))).rejects.toThrow("já tem dados");
  }, 60_000);
});
