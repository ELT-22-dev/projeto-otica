import { describe, expect, it } from "vitest";
import { crearCasosDeUso } from "@/application";
import { completarMeses } from "@/application/gestion/gestion";
import { inicioDeMes } from "@/domain/shared/fecha";
import { validarCambioUsuario } from "@/domain/usuario/Usuario";
import { ADMIN, ATENDENTE, crearFakes } from "./fakes";

describe("validarCambioUsuario (domínio)", () => {
  const admin = { id: "a", rol: "admin" as const, activo: true };

  it("ninguém se desativa nem tira o próprio admin", () => {
    expect(() =>
      validarCambioUsuario({ actorId: "a", objetivo: admin, cambios: { activo: false }, adminsActivos: 2 }),
    ).toThrow("operacion_no_permitida");
    expect(() =>
      validarCambioUsuario({ actorId: "a", objetivo: admin, cambios: { rol: "atendente" }, adminsActivos: 2 }),
    ).toThrow("operacion_no_permitida");
  });

  it("a ótica nunca fica sem admin ativo", () => {
    expect(() =>
      validarCambioUsuario({ actorId: "b", objetivo: admin, cambios: { activo: false }, adminsActivos: 1 }),
    ).toThrow("operacion_no_permitida");
    expect(() =>
      validarCambioUsuario({ actorId: "b", objetivo: admin, cambios: { activo: false }, adminsActivos: 2 }),
    ).not.toThrow();
  });

  it("mudanças comuns em atendentes são livres", () => {
    expect(() =>
      validarCambioUsuario({
        actorId: "a",
        objetivo: { id: "n", rol: "atendente", activo: true },
        cambios: { activo: false },
        adminsActivos: 1,
      }),
    ).not.toThrow();
  });
});

describe("gestão de usuários", () => {
  it("só admin gerencia usuários", async () => {
    const casos = crearCasosDeUso(crearFakes({ usuario: ATENDENTE }).deps);
    await expect(casos.listarUsuarios()).rejects.toThrow("no_autorizado");
  });

  it("cria usuário com senha protegida, recusa e-mail repetido e senha curta", async () => {
    const f = crearFakes({ usuario: ADMIN });
    const casos = crearCasosDeUso(f.deps);
    await casos.crearUsuario({ email: "Ana@Optica.com", nombre: "Ana", rol: "atendente", contrasena: "segura123" });
    expect(f.usuarios.at(-1)).toMatchObject({ email: "ana@optica.com", passwordHash: "h:segura123" });
    await expect(
      casos.crearUsuario({ email: "ana@optica.com", nombre: "Ana 2", rol: "atendente", contrasena: "segura123" }),
    ).rejects.toThrow("email_en_uso");
    await expect(
      casos.crearUsuario({ email: "bia@optica.com", nombre: "Bia", rol: "atendente", contrasena: "123" }),
    ).rejects.toThrow("contrasena_corta");
  });

  it("desativa atendente e troca senha; não deixa o admin se desativar", async () => {
    const f = crearFakes({ usuario: ADMIN });
    const casos = crearCasosDeUso(f.deps);
    await casos.actualizarUsuario({ id: ATENDENTE.id, activo: false });
    expect(f.usuarios.find((u) => u.id === ATENDENTE.id)?.activo).toBe(false);
    await casos.restablecerContrasena({ id: ATENDENTE.id, contrasena: "nueva-clave-1" });
    expect(f.usuarios.find((u) => u.id === ATENDENTE.id)?.passwordHash).toBe("h:nueva-clave-1");
    await expect(casos.actualizarUsuario({ id: ADMIN.id, activo: false })).rejects.toThrow("operacion_no_permitida");
  });
});

describe("helpers de período", () => {
  it("inicio do mês e meses sem vendas completados com zero", () => {
    expect(inicioDeMes("2026-10-05")).toBe("2026-10-01");
    const meses = completarMeses([{ mes: "2026-09", pedidos: 2, total: 1000, adelantos: 500 }], "2026-10-05", 3);
    expect(meses.map((m) => [m.mes, m.pedidos])).toEqual([
      ["2026-08", 0],
      ["2026-09", 2],
      ["2026-10", 0],
    ]);
  });
});
