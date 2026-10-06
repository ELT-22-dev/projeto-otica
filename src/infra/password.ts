import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (senha: string, sal: Buffer, tamanho: number, opcoes: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(senha, sal, tamanho, opcoes, (erro, chave) => (erro ? reject(erro) : resolve(chave))),
  );

const N = 16384;
const R = 8;
const P = 1;
const TAMANHO = 64;

/** Formato: scrypt$N$r$p$sal$hash (base64). Os parâmetros ficam no hash para poder subir o custo depois. */
export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha.normalize("NFKC"), sal, TAMANHO, { N, r: R, p: P });
  return ["scrypt", N, R, P, sal.toString("base64"), hash.toString("base64")].join("$");
}

export async function verificarSenha(senha: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, salB64, hashB64] = partes;
  const esperado = Buffer.from(hashB64!, "base64");
  const obtido = await scrypt(senha.normalize("NFKC"), Buffer.from(salB64!, "base64"), esperado.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(esperado, obtido);
}

/** Hash válido de uma senha aleatória: usado para gastar o mesmo tempo quando o e-mail não existe. */
export const HASH_FICTICIO = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");
