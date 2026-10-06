import { z } from "zod";

/** Variáveis só do servidor. Nenhuma delas pode ter prefixo NEXT_PUBLIC_. */
const esquema = z.object({
  DATABASE_URL: z.string().startsWith("postgres"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET precisa de pelo menos 32 caracteres"),
});

export function env() {
  const r = esquema.safeParse({ DATABASE_URL: process.env.DATABASE_URL, SESSION_SECRET: process.env.SESSION_SECRET });
  if (!r.success) {
    throw new Error(
      `Configuração inválida: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}. Veja .env.example.`,
    );
  }
  return r.data;
}
