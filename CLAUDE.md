@AGENTS.md

# Projeto: Sistema de Pedidos — Óticas Latina

- Uma ótica só (sem multi-tenant). Banco Postgres no Neon, login próprio (scrypt + cookie JWT), deploy na Vercel.
- Arquitetura hexagonal; direção das dependências descrita no README e travada pelo ESLint (`eslint.config.mjs`). Driver do banco (`@neondatabase/serverless`, `pg`) só em `src/infra` e `scripts/`; adapters recebem a interface `Sql`.
- Toda regra de negócio nova vai para `src/domain` com teste em `tests/domain`.
- Mudança de schema = nova migration em `db/migrations` (nunca editar uma já aplicada) + ajustar mappers em `src/adapters/postgres` + rodar `npm test` (aplica as migrations no PGlite e roda o fluxo completo).
- Colunas `date` sempre selecionadas com `::text` (evita deslocamento de fuso).
- Strings da UI só em `src/i18n/es.ts`.
- WhatsApp por QR: `worker/whatsapp.ts` (Baileys, ESM, processo separado fora da Vercel). App ↔ serviço só por HTTP com `WHATSAPP_TOKEN`; nada de consultar o banco periodicamente (Neon grátis precisa dormir). Casos de uso do bot em `src/application/whatsapp/bot.ts` (sem sessão, nunca expostos como server action).
- Antes de dizer que algo está pronto: `npm run typecheck && npm run lint && npm test && npm run build`.
