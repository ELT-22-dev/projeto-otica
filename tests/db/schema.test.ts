import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { crearBaseDeDatos } from "./pglite";

let db: PGlite;
let clienteId: string;

async function registrar(cliente: string | null, extra: { total?: number; adelanto?: number; receta?: object } = {}) {
  const { rows } = await db.query<{ r: { pedido_id: string; numero: number; cliente_id: string } }>(
    `select registrar_pedido(null, $1, 'José Gutiérrez', '5511987654321', 'es', 'Armazón negro', null, $2, $3,
       '2026-10-05', '2026-10-12', $4::jsonb) as r`,
    [cliente, extra.total ?? 500, extra.adelanto ?? 200, extra.receta ? JSON.stringify(extra.receta) : null],
  );
  return rows[0]!.r;
}

beforeAll(async () => {
  db = await crearBaseDeDatos();
  clienteId = (await registrar(null)).cliente_id;
  await registrar(clienteId);
}, 60_000);

describe("schema", () => {
  it("numera pedidos em sequência", async () => {
    const { rows } = await db.query<{ numero: number }>("select numero from pedidos order by numero");
    expect(rows.map((r) => r.numero)).toEqual([1, 2]);
  });

  it("numero não pode ser escolhido pelo app", async () => {
    await expect(
      db.query(
        `insert into pedidos (numero, cliente_id, descripcion_armazon, valor_total, fecha_entrega_prevista)
         values (99, $1, 'x', 1, '2030-01-01')`,
        [clienteId],
      ),
    ).rejects.toThrow(/generated always|cannot insert/i);
  });

  it("nombre_busqueda é minúsculo e sem acento", async () => {
    const { rows } = await db.query<{ nombre_busqueda: string }>("select nombre_busqueda from clientes where id = $1", [
      clienteId,
    ]);
    expect(rows[0]!.nombre_busqueda).toBe("jose gutierrez");
  });

  it("registrar_pedido grava a receita na mesma transação", async () => {
    const r = await registrar(clienteId, { receta: { od_esfera: -1.25, od_eje: 90, observaciones: "lejos" } });
    const { rows } = await db.query<{ od_esfera: string; od_eje: number; observaciones: string }>(
      "select od_esfera, od_eje, observaciones from recetas where pedido_id = $1",
      [r.pedido_id],
    );
    expect(rows).toEqual([{ od_esfera: "-1.25", od_eje: 90, observaciones: "lejos" }]);
  });

  it("falha no meio desfaz tudo (receita inválida não deixa pedido órfão)", async () => {
    const antes = (await db.query<{ n: number }>("select count(*)::int as n from pedidos")).rows[0]!.n;
    await expect(registrar(clienteId, { receta: { od_eje: 500 } })).rejects.toThrow(/od_eje/);
    const despues = (await db.query<{ n: number }>("select count(*)::int as n from pedidos")).rows[0]!.n;
    expect(despues).toBe(antes);
  });

  it("constraints de negócio", async () => {
    await expect(registrar(clienteId, { total: 100, adelanto: 200 })).rejects.toThrow(/adelanto_no_supera_total/);
    await expect(db.query("update pedidos set status = 'listo' where numero = 1")).rejects.toThrow(/listo_tiene_fecha/);
    await expect(db.query("insert into clientes (nombre, whatsapp) values ('Ana', '123')")).rejects.toThrow(
      /whatsapp_check/,
    );
  });

  it("configuração tem exatamente uma linha", async () => {
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from configuracion");
    expect(rows[0]!.n).toBe(1);
    await expect(db.query("insert into configuracion (id, nombre) values (2, 'Outra')")).rejects.toThrow(/check/);
  });

  it("e-mail de usuário é único e minúsculo", async () => {
    await db.query("insert into usuarios (email, nombre, password_hash) values ('a@b.com', 'A', 'x')");
    await expect(
      db.query("insert into usuarios (email, nombre, password_hash) values ('a@b.com', 'B', 'x')"),
    ).rejects.toThrow(/unique/);
    await expect(
      db.query("insert into usuarios (email, nombre, password_hash) values ('C@b.com', 'C', 'x')"),
    ).rejects.toThrow(/check/);
  });
});
