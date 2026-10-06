import { describe, expect, it } from "vitest";
import { HASH_FICTICIO, hashSenha, verificarSenha } from "@/infra/password";
import { firmarToken, verificarToken } from "@/infra/token";

const SECRET = "x".repeat(40);

describe("senha", () => {
  it("hash confere com a senha certa e rejeita a errada", async () => {
    const hash = await hashSenha("clave-secreta-123");
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verificarSenha("clave-secreta-123", hash)).toBe(true);
    expect(await verificarSenha("clave-secreta-124", hash)).toBe(false);
  });

  it("dois hashes da mesma senha são diferentes (sal aleatório)", async () => {
    expect(await hashSenha("abc12345")).not.toBe(await hashSenha("abc12345"));
  });

  it("hash fictício nunca confere e formato inválido é recusado", async () => {
    expect(await verificarSenha("", HASH_FICTICIO)).toBe(false);
    expect(await verificarSenha("x", "md5$abc")).toBe(false);
  });
});

describe("token de sessão", () => {
  it("assina e verifica", async () => {
    const token = await firmarToken("usuario-1", SECRET);
    expect(await verificarToken(token, SECRET)).toBe("usuario-1");
  });

  it("rejeita token adulterado, de outro segredo ou ausente", async () => {
    const token = await firmarToken("usuario-1", SECRET);
    expect(await verificarToken(token.slice(0, -2) + "xx", SECRET)).toBeNull();
    expect(await verificarToken(token, "y".repeat(40))).toBeNull();
    expect(await verificarToken(undefined, SECRET)).toBeNull();
  });
});
