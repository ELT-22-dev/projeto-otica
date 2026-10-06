import { describe, expect, it } from "vitest";
import { formatearWhatsapp, normalizarWhatsapp } from "@/domain/cliente/telefono";

describe("normalizarWhatsapp", () => {
  it.each([
    ["11 98765-4321", "5511987654321"],
    ["(11) 98765-4321", "5511987654321"],
    ["11987654321", "5511987654321"],
    ["011 98765-4321", "5511987654321"],
    ["5511987654321", "5511987654321"],
    ["+55 11 98765-4321", "5511987654321"],
    ["(11) 3333-4444", "551133334444"],
    ["51 98765-4321", "5551987654321"], // sem "+" é celular de Porto Alegre
    ["+51 987 654 321", "51987654321"], // Peru
    ["+591 71234567", "59171234567"], // Bolívia
    ["0058 412 1234567", "584121234567"], // Venezuela com 00
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarWhatsapp(entrada)).toBe(esperado);
  });

  it.each([
    ["98765-4321"], // sem DDD
    ["123"],
    [""],
    ["(20) 98765-4321"], // DDD inexistente
    ["11 8765-43210"], // celular sem o 9
    ["591 71234567"], // estrangeiro sem "+"
    ["+55 11 1234"], // +55 incompleto
  ])("rejeita %s", (entrada) => {
    expect(() => normalizarWhatsapp(entrada)).toThrow("telefono_invalido");
  });
});

describe("formatearWhatsapp", () => {
  it("formata número brasileiro", () => {
    expect(formatearWhatsapp("5511987654321")).toBe("+55 (11) 98765-4321");
    expect(formatearWhatsapp("551133334444")).toBe("+55 (11) 3333-4444");
  });

  it("estrangeiro só ganha o +", () => {
    expect(formatearWhatsapp("51987654321")).toBe("+51987654321");
  });
});
