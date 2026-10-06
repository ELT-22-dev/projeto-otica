-- Agenda de citas + WhatsApp conectado por QR (aparelho vinculado) com respostas automáticas da IA.
--
-- O serviço do WhatsApp (worker/whatsapp.ts) roda fora da Vercel. O app fala com ele por HTTP
-- (estado/QR, conectar, desconectar, enviar); aqui ficam só as credenciais e o histórico de mensagens.
-- Sem consultas periódicas: o banco (Neon) pode dormir quando ninguém está usando.

-- Valores novos de enum não podem ser usados na mesma transação em que são criados: aqui só são declarados.
alter type canal_notificacion add value if not exists 'whatsapp';
alter type tipo_notificacion add value if not exists 'cita';

alter table configuracion
  add column plantilla_cita_es text not null default
    'Hola {nombre}! Tu cita en {optica} quedó para el {fecha} a las {hora}. ¡Te esperamos! Si no puedes venir, avísanos por aquí.',
  add column plantilla_cita_pt text not null default
    'Olá {nombre}! Seu horário na {optica} ficou para {fecha} às {hora}. Te esperamos! Se não puder vir, avise a gente por aqui.',
  -- A quem a IA responde no WhatsApp: ninguém, só clientes cadastrados, ou qualquer pessoa.
  add column ia_responde text not null default 'clientes' check (ia_responde in ('nadie', 'clientes', 'todos')),
  -- Endereço, horário, serviços, preços: o que a IA pode contar aos clientes.
  add column info_para_ia text not null default '' check (length(info_para_ia) <= 3000),
  add constraint plantillas_cita_no_vacias check (
    length(trim(plantilla_cita_es)) > 0 and length(trim(plantilla_cita_pt)) > 0
  );

-- Agenda ------------------------------------------------------------------------

create type estado_cita as enum ('solicitada', 'confirmada', 'atendida', 'cancelada');
create type origen_cita as enum ('sistema', 'whatsapp');

create table citas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes (id),
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  -- Pode faltar quando o pedido chegou pelo WhatsApp de um contato que não mostra o número.
  whatsapp text check (whatsapp ~ '^[1-9][0-9]{9,14}$'),
  -- Endereço do chat no WhatsApp (número ou LID), para responder na mesma conversa.
  jid text check (length(jid) <= 100),
  fecha date,
  hora time,
  motivo text check (length(motivo) <= 300),
  -- O que o cliente pediu ("sábado de manhã") até a ótica confirmar dia e hora.
  preferencia text check (length(preferencia) <= 300),
  notas text check (length(notas) <= 1000),
  estado estado_cita not null default 'confirmada',
  origen origen_cita not null default 'sistema',
  created_by uuid references usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cita_con_horario check (estado not in ('confirmada', 'atendida') or (fecha is not null and hora is not null))
);

create index citas_fecha_idx on citas (fecha, hora);
create index citas_solicitadas_idx on citas (created_at) where estado = 'solicitada';

create trigger citas_updated_at before update on citas for each row execute function tocar_updated_at();

-- WhatsApp ----------------------------------------------------------------------

-- Credenciais do aparelho vinculado (Baileys). Apagadas ao desconectar.
create table whatsapp_auth (
  clave text primary key,
  valor text not null
);

create type direccion_mensaje as enum ('entrante', 'saliente');
create type estado_mensaje as enum ('recibido', 'pendiente', 'enviado', 'error');
-- cliente: escrito pelo cliente · aviso: aviso do sistema · ia: resposta automática
-- telefono: alguém da ótica respondeu direto pelo celular (a IA fica quieta nessa conversa).
create type origen_mensaje as enum ('cliente', 'aviso', 'ia', 'telefono');

create table mensajes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  direccion direccion_mensaje not null,
  origen origen_mensaje not null,
  estado estado_mensaje not null,
  jid text check (length(jid) <= 100),
  whatsapp text check (whatsapp ~ '^[1-9][0-9]{9,14}$'),
  cliente_id uuid references clientes (id),
  nombre text check (length(nombre) <= 120),
  texto text not null check (length(texto) <= 4000),
  id_externo text,
  error text check (length(error) <= 500),
  intentos smallint not null default 0,
  -- Mensagem do cliente que a IA não soube resolver: aparece para a equipe até alguém marcar como vista.
  requiere_atencion boolean not null default false,
  created_at timestamptz not null default now(),
  enviado_en timestamptz,
  constraint mensaje_tiene_destino check (jid is not null or whatsapp is not null),
  constraint direccion_estado check (
    (direccion = 'entrante' and estado = 'recibido') or (direccion = 'saliente' and estado <> 'recibido')
  )
);

create index mensajes_pendientes_idx on mensajes_whatsapp (created_at) where estado = 'pendiente';
create index mensajes_jid_idx on mensajes_whatsapp (jid, created_at desc);
create index mensajes_whatsapp_idx on mensajes_whatsapp (whatsapp, created_at desc);
create index mensajes_atencion_idx on mensajes_whatsapp (created_at) where requiere_atencion;
create unique index mensajes_id_externo_idx on mensajes_whatsapp (id_externo) where id_externo is not null;
