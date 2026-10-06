import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Direção das dependências (arquitetura hexagonal). Cada camada lista o que NÃO pode importar.
 * Quebrar uma dessas regras quebra o `npm run lint`.
 */
const proibido = (grupos, mensagem) => ({
  "no-restricted-imports": ["error", { patterns: grupos.map((g) => ({ ...g, message: mensagem })) }],
});

const camadas = [
  {
    files: ["src/domain/**"],
    rules: proibido(
      // O domínio só importa a si mesmo, por caminho relativo.
      [{ regex: "^(?!\\.{1,2}/).*" }],
      "domain é TypeScript puro: não importa outras camadas nem bibliotecas.",
    ),
  },
  {
    files: ["src/ports/**"],
    rules: proibido([{ regex: "^(?!@/domain/|\\.{1,2}/).*" }], "ports só dependem do domain."),
  },
  {
    files: ["src/application/**"],
    rules: proibido(
      [{ regex: "^(?!@/domain/|@/ports$|@/ports/|\\.{1,2}/|zod$).*" }],
      "application depende só de domain, ports e zod.",
    ),
  },
  {
    files: ["src/adapters/**"],
    rules: proibido(
      [{ group: ["@/app/*", "@/application", "@/application/*", "@/components/*", "@/infra/*", "@neondatabase/*", "pg"] }],
      "adapters implementam ports; não conhecem casos de uso nem UI.",
    ),
  },
  {
    files: ["src/app/**", "src/components/**"],
    rules: proibido(
      [{ group: ["@neondatabase/*", "pg", "@anthropic-ai/*", "@/adapters/*", "@/infra/db", "@/ports", "@/ports/*"] }],
      "A UI chama casos de uso (via @/infra/container), nunca o banco ou adapters direto.",
    ),
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...camadas,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
