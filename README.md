# Sistema de Pedidos — Óticas Latina

Gestão de pedidos de uma ótica, mais fácil que o caderno. Interface em espanhol, mobile-first.
Avisos ao cliente pelo WhatsApp: com um toque pelo wa.me, ou sozinhos com o WhatsApp da ótica conectado por QR
(e então a IA também responde dúvidas e anota pedidos de cita). Agenda de citas.

**Stack:** Next.js 16 (App Router) · TypeScript strict · Postgres no **Neon** · Tailwind + shadcn/ui · Zod · Vitest · Vercel.
Tudo num deploy só: as telas, as Server Actions (backend) e o login rodam na Vercel; o banco fica no Neon.

---

## Arquitetura

Hexagonal (ports & adapters). As setas são as únicas dependências permitidas, e o ESLint quebra o build se alguém violar:

```
app (UI) ──► infra/container ──► application ──► domain
                    │                  └──────► ports ──► domain
                    └──► adapters (Postgres, wa.me, IA, serviço WhatsApp) ──► ports, domain

worker/whatsapp.ts (fora da Vercel) ──► application (bot), adapters, domain
```

| Pasta | O que tem | Pode importar |
|---|---|---|
| `src/domain` | Regras puras: status do pedido, renovação, telefone, templates, dinheiro, datas | nada |
| `src/ports` | Interfaces: repositórios, `NotificadorPort`, `SesionPort`, `Reloj` | domain |
| `src/application` | Casos de uso + validação Zod das entradas | domain, ports, zod |
| `src/adapters` | Repositórios Postgres (SQL puro sobre a interface `Sql`), notificadores, IA (Claude / OpenAI / NVIDIA), cliente HTTP do serviço do WhatsApp | domain, ports |
| `src/infra` | Driver Neon, login/sessão, `container.ts` (composition root) | tudo acima |
| `src/app`, `src/components` | Telas e Server Actions | application, domain, infra/container |

| `worker` | Serviço do WhatsApp por QR (Baileys): processo separado, sempre ligado | tudo acima |

**Avisos:** `NotificadorWhatsapp` pergunta ao serviço do WhatsApp se está conectado. Se sim, ele envia sozinho
(`{ tipo: "enviado" }`); se não (desligado, sem `WHATSAPP_URL`, celular desvinculado), devolve o link wa.me.

### Segurança
- O banco só é acessado pelo servidor. `DATABASE_URL` e `SESSION_SECRET` nunca têm prefixo `NEXT_PUBLIC_` e nunca chegam ao navegador.
- Login próprio: senha com **scrypt** (sal aleatório), sessão em cookie `httpOnly` assinado (JWT HS256, 30 dias). Usuário desativado perde o acesso no próximo request.
- Sem cadastro público: usuários são criados pelo seed ou por `npm run usuario`.
- Todo caso de uso confere o usuário logado; Ajustes exige admin.
- Receita (dado de saúde) fica em tabela separada e não tem como entrar numa mensagem: o template só aceita nome, ótica e número do pedido.

---

## Setup

Pré-requisitos: Node 22+, conta no [Neon](https://neon.com) e na Vercel.

### 1. Criar o banco no Neon
Duas formas (escolha uma):
- **Pela Vercel (recomendado):** no projeto da Vercel → **Storage → Create Database → Neon**. A Vercel cria o banco e já cadastra `DATABASE_URL` nas variáveis do projeto.
- **Direto no Neon:** [console.neon.tech](https://console.neon.tech) → **New project** → região **AWS São Paulo (sa-east-1)**.

Escolha a região **São Paulo** (LGPD e latência).

### 2. Variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha `DATABASE_URL` (Neon → Connection Details), gere o `SESSION_SECRET` com o comando que está no arquivo e defina e-mails/senhas do seed.

### 3. Instalar e criar as tabelas
```bash
npm install
npm run db:migrar -- --listar   # mostra as migrations pendentes (db/migrations)
npm run db:migrar               # aplica
```

### 4. Dados iniciais
```bash
npm run seed              # usuários + 10 pedidos de exemplo
npm run seed -- --reset   # apaga clientes/pedidos e recria a demo
```
O seed recusa rodar se já houver pedidos (proteção contra apagar dados reais).
As datas são relativas a hoje: sempre há 2 clientes elegíveis para renovação (Carlos e Rosa) e 2 de controle que não aparecem.
Com `SEED_DEMO_WHATSAPP` preenchido, 3 clientes usam esse número e o "Avisar" abre uma conversa real.

**Antes de usar de verdade:** apague os dados de demo e comece limpo:
```sql
truncate notificaciones, recetas, pedidos, clientes restart identity;
```

### 5. Usuários
```bash
npm run usuario -- nataly@email.com "Nataly" atendente   # pede a senha no terminal
npm run usuario -- dono@email.com "Eddy" admin
```
O mesmo comando troca a senha de um usuário existente.

### 6. Rodar
```bash
npm run dev        # http://localhost:3000
```

### Desenvolver sem Neon (Postgres local, sem Docker)
```bash
npm run db:local   # deixa rodando num terminal; dados em .pglite/
```
Com `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable` no `.env.local`, os passos 3 a 6 funcionam igual. O app usa o driver `pg` quando o host é local e o driver do Neon nos demais casos.

### Testes
```bash
npm test          # domínio, casos de uso, login, e o fluxo completo num Postgres embutido (PGlite)
npm run lint      # inclui as regras de dependência entre camadas
npm run typecheck
```
`npm test` aplica as migrations reais num Postgres em memória, roda o seed de demo e executa os casos de uso com os repositórios Postgres de verdade — sem precisar de Neon nem Docker.

---

## WhatsApp conectado por QR + IA (opcional)

Sem isso o sistema funciona com wa.me (um toque abre o WhatsApp com a mensagem pronta). Com o serviço ligado:

- **Ajustes de conexão:** tela *Avisos WhatsApp* → *Conectar con QR* → no celular da ótica, *Dispositivos vinculados* → *Vincular*.
  Desconecta pela mesma tela ou pelo celular, quando quiser.
- **Avisos** de óculos prontos, renovação e cita confirmada saem sozinhos (com um intervalo de 1,5–3,5 s entre mensagens).
- **IA no WhatsApp:** responde dúvidas com o texto de *Ajustes → Lo que la IA puede contar*, consulta o pedido do próprio
  número, anota pedidos de cita (aparecem na *Agenda* para confirmar dia e hora) e marca "Necesita respuesta" quando não sabe.
  Fica quieta por 12 h numa conversa em que alguém da ótica respondeu pelo celular. *Ajustes* define se responde a ninguém,
  só a clientes cadastrados ou a todos.
- **Ligações** não passam pelo serviço: continuam tocando no celular. Mensagens não são marcadas como lidas.

**Rodar o serviço** (`worker/whatsapp.ts`): precisa ficar ligado 24 h, então não roda na Vercel. Qualquer Node 22 serve
(Railway, Render pago, Fly, VPS). Na Railway o `railway.json` já define tudo (sem build do Next, início com
`npm run whatsapp`, 1 réplica só: duas cópias brigariam pela mesma sessão). Em outro lugar: `npm ci` e `npm run whatsapp`. Variáveis:
`DATABASE_URL`, `WHATSAPP_TOKEN` e as da IA (ver `.env.example`). No app (Vercel): `WHATSAPP_URL` (endereço público do
serviço) e o mesmo `WHATSAPP_TOKEN`. As credenciais do aparelho ficam no banco (`whatsapp_auth`): reiniciar o serviço
não pede QR de novo.

**Por que HTTP e não o banco** para app ↔ serviço: um serviço consultando o Neon a cada poucos segundos impediria o banco de
dormir e estouraria as 100 CU-horas do plano grátis em ~2 semanas. Assim o banco só acorda quando algo acontece.

**Atenção:** Baileys não é a API oficial do WhatsApp. Para avisos a clientes que já conhecem a ótica o risco é baixo,
mas o WhatsApp pode bloquear números que mandam mensagens em massa ou recebem muitas denúncias. Não usar para propaganda.

---

## Produção

- **App:** https://projeto-otica-psi.vercel.app (projeto `projeto-otica` no time EDLT24 da Vercel)
- **Banco:** Neon `otica-latina-db`, região São Paulo, ligado ao projeto pela integração da Vercel
- **Deploy:** automático a cada `git push` na `main`

Rodar migrations / seed / usuários contra o banco de produção:
```bash
npx vercel env pull .env.neon.local --environment=production   # credenciais (arquivo ignorado pelo git)
npx tsx --env-file=.env.neon.local scripts/migrar.ts --listar
npx tsx --env-file=.env.neon.local scripts/migrar.ts
npx tsx --env-file=.env.neon.local scripts/crear-usuario.ts nataly@email.com "Nataly" atendente
rm .env.neon.local                                              # não deixar credenciais no disco
```

## Deploy na Vercel (do zero)

1. Suba o repositório para o GitHub e importe na Vercel (**New Project**).
2. **Settings → Environment Variables** (Production e Preview):
   - `DATABASE_URL` (já vem se o banco foi criado pela integração)
   - `SESSION_SECRET` (um valor novo, diferente do de desenvolvimento)
   - **Não** cadastre as variáveis `SEED_*`.
3. Região das funções: `vercel.json` já define `gru1` (São Paulo).
4. Rode `npm run db:migrar` e `npm run seed` apontando para o banco de produção (pelo `.env.local`).
5. Cada `git push` na branch principal faz deploy.

### Checklist da demo (em produção, pelo celular)
- [ ] Login e cadastro de um pedido em menos de 1 minuto
- [ ] "Listo y avisar" abre o WhatsApp com a mensagem em espanhol
- [ ] Renovaciones mostra os 2 clientes do seed

---

## Custos e observações
- **Neon grátis:** 1 GB e 100 horas de processamento por mês (limites mudam; ver neon.com/pricing). O banco "dorme" após 5 min sem uso; o primeiro acesso depois disso leva um instante a mais. Backup (restaurar no tempo) só das últimas 6 horas.
- **Neon pago (Launch):** por uso, sem mínimo; backup de até 7 dias. Recomendado quando a ótica depender do sistema.
- **Log de avisos:** com wa.me o sistema registra "aviso gerado", não "mensagem entregue". Com o WhatsApp conectado, o
  histórico mostra "Enviando…" até o serviço confirmar e "No se pudo enviar" depois de 3 tentativas.
- **Fuso horário:** datas de negócio usam `America/Sao_Paulo`.
