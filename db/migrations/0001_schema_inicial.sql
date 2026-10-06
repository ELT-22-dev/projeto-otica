-- Schema inicial: uma ótica só (sem multi-tenant).
-- O app acessa o banco só pelo servidor (DATABASE_URL nunca vai ao navegador);
-- permissões e papéis são verificados nos casos de uso.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type idioma as enum ('es', 'pt');
create type rol_usuario as enum ('admin', 'atendente');
create type status_pedido as enum ('en_laboratorio', 'listo', 'entregado', 'cancelado');
create type tipo_notificacion as enum ('listo', 'renovacion');
create type canal_notificacion as enum ('wa_me');

-- Dados da ótica e templates de mensagem. Sempre exatamente uma linha (id = 1).
create table configuracion (
  id smallint primary key default 1 check (id = 1),
  nombre text not null check (length(trim(nombre)) between 2 and 120),
  telefono_whatsapp text check (telefono_whatsapp ~ '^[1-9][0-9]{9,14}$'),
  idioma_default idioma not null default 'es',
  plantilla_listo_es text not null default
    'Hola {nombre}! 👋 Te escribimos de {optica}. Tus lentes (pedido #{numero}) ya están listos. Puedes pasar a recogerlos o, si prefieres, te los enviamos por motoboy. ¡Te esperamos!',
  plantilla_listo_pt text not null default
    'Olá {nombre}! 👋 Aqui é da {optica}. Seus óculos (pedido #{numero}) já estão prontos. Pode vir retirar ou, se preferir, enviamos por motoboy. Te esperamos!',
  plantilla_renovacion_es text not null default
    'Hola {nombre}! Ya pasó casi un año desde tus últimos lentes en {optica}. ¿Qué tal un nuevo examen de vista? Escríbenos para agendar 😊',
  plantilla_renovacion_pt text not null default
    'Olá {nombre}! Já faz quase um ano desde seus últimos óculos na {optica}. Que tal um novo exame de vista? Fale com a gente para agendar 😊',
  updated_at timestamptz not null default now(),
  constraint plantillas_no_vacias check (
    length(trim(plantilla_listo_es)) > 0 and length(trim(plantilla_listo_pt)) > 0
    and length(trim(plantilla_renovacion_es)) > 0 and length(trim(plantilla_renovacion_pt)) > 0
  )
);

insert into configuracion (nombre) values ('Mi óptica');

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email like '%@%'),
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  rol rol_usuario not null default 'atendente',
  -- scrypt$N$r$p$salt$hash (ver src/infra/password.ts)
  password_hash text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (email)
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 2 and 120),
  nombre_busqueda text not null default '',
  -- Não é único: membros da mesma família costumam dividir o número.
  whatsapp text not null check (whatsapp ~ '^[1-9][0-9]{9,14}$'),
  idioma idioma not null default 'es',
  notas text check (length(notas) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clientes_whatsapp_idx on clientes (whatsapp);
create index clientes_nombre_busqueda_trgm_idx on clientes using gin (nombre_busqueda extensions.gin_trgm_ops);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  -- Sequência do banco: segura contra pedidos simultâneos. Exibido como #0001.
  numero integer generated always as identity unique,
  cliente_id uuid not null references clientes (id),
  descripcion_armazon text not null check (length(trim(descripcion_armazon)) between 1 and 500),
  tipo_lente text check (length(tipo_lente) <= 200),
  valor_total numeric(10, 2) not null check (valor_total >= 0),
  valor_adelanto numeric(10, 2) not null default 0 check (valor_adelanto >= 0),
  fecha_pedido date not null default (now() at time zone 'America/Sao_Paulo')::date,
  fecha_entrega_prevista date not null,
  status status_pedido not null default 'en_laboratorio',
  fecha_listo timestamptz,
  fecha_entregado timestamptz,
  created_by uuid references usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adelanto_no_supera_total check (valor_adelanto <= valor_total),
  constraint entrega_despues_del_pedido check (fecha_entrega_prevista >= fecha_pedido),
  constraint listo_tiene_fecha check (status <> 'listo' or fecha_listo is not null),
  constraint entregado_tiene_fecha check (status <> 'entregado' or fecha_entregado is not null)
);

create index pedidos_status_idx on pedidos (status, fecha_entrega_prevista);
create index pedidos_cliente_idx on pedidos (cliente_id, fecha_pedido desc);

-- Dado de saúde (LGPD): tabela separada, nunca usada em mensagens.
create table recetas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id),
  pedido_id uuid references pedidos (id),
  od_esfera numeric(5, 2) check (od_esfera between -30 and 30),
  od_cilindro numeric(5, 2) check (od_cilindro between -15 and 15),
  od_eje smallint check (od_eje between 0 and 180),
  oi_esfera numeric(5, 2) check (oi_esfera between -30 and 30),
  oi_cilindro numeric(5, 2) check (oi_cilindro between -15 and 15),
  oi_eje smallint check (oi_eje between 0 and 180),
  adicion numeric(4, 2) check (adicion between 0 and 5),
  dnp_od numeric(4, 1) check (dnp_od between 15 and 45),
  dnp_oi numeric(4, 1) check (dnp_oi between 15 and 45),
  observaciones text check (length(observaciones) <= 2000),
  fecha_receta date,
  created_at timestamptz not null default now()
);

create index recetas_cliente_idx on recetas (cliente_id);
create index recetas_pedido_idx on recetas (pedido_id);

-- Log dos avisos. Com wa.me registra "aviso gerado", não "entregue".
create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id),
  pedido_id uuid references pedidos (id),
  tipo tipo_notificacion not null,
  canal canal_notificacion not null,
  mensaje text not null check (length(mensaje) <= 2000),
  created_by uuid references usuarios (id) on delete set null,
  created_at timestamptz not null default now()
);

create index notificaciones_cliente_idx on notificaciones (cliente_id, tipo, created_at desc);
create index notificaciones_pedido_idx on notificaciones (pedido_id);

-- Triggers ------------------------------------------------------------------

create function normalizar_busqueda_cliente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Forma com dicionário explícito: a de um argumento procura o dicionário no search_path, que aqui é vazio.
  new.nombre_busqueda := lower(extensions.unaccent('extensions.unaccent'::regdictionary, new.nombre));
  return new;
end
$$;

create trigger clientes_normalizar_busqueda
  before insert or update of nombre on clientes
  for each row execute function normalizar_busqueda_cliente();

create function tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger clientes_updated_at before update on clientes for each row execute function tocar_updated_at();
create trigger pedidos_updated_at before update on pedidos for each row execute function tocar_updated_at();
create trigger configuracion_updated_at before update on configuracion for each row execute function tocar_updated_at();

-- Views ---------------------------------------------------------------------

create view v_pedidos_lista as
select
  p.id,
  p.numero,
  p.cliente_id,
  p.descripcion_armazon,
  p.tipo_lente,
  p.valor_total,
  p.valor_adelanto,
  p.fecha_pedido,
  p.fecha_entrega_prevista,
  p.status,
  p.fecha_listo,
  p.fecha_entregado,
  p.created_at,
  c.nombre as cliente_nombre,
  c.nombre_busqueda as cliente_nombre_busqueda,
  c.whatsapp as cliente_whatsapp,
  c.idioma as cliente_idioma
from pedidos p
join clientes c on c.id = p.cliente_id;

-- Fatos por cliente com pelo menos um pedido entregado. A regra de elegibilidade
-- (janela de 11–13 meses, pedido posterior, pedido em aberto) fica no domínio TypeScript.
create view v_candidatos_renovacion as
with ultima_entrega as (
  select distinct on (p.cliente_id)
    p.cliente_id,
    p.id as pedido_id,
    p.numero as pedido_numero,
    p.created_at as pedido_creado_en,
    p.fecha_entregado
  from pedidos p
  where p.status = 'entregado'
  order by p.cliente_id, p.fecha_entregado desc
)
select
  c.id as cliente_id,
  c.nombre,
  c.whatsapp,
  c.idioma,
  u.pedido_id,
  u.pedido_numero,
  u.pedido_creado_en,
  u.fecha_entregado as ultima_entrega,
  (u.fecha_entregado at time zone 'America/Sao_Paulo')::date as ultima_entrega_fecha,
  (select max(p2.created_at) from pedidos p2 where p2.cliente_id = c.id and p2.status <> 'cancelado')
    as ultimo_pedido_creado_en,
  (select count(*)::integer from pedidos p3 where p3.cliente_id = c.id and p3.status in ('en_laboratorio', 'listo'))
    as pedidos_abiertos,
  (select max(n.created_at) from notificaciones n where n.cliente_id = c.id and n.tipo = 'renovacion')
    as ultimo_aviso_renovacion
from ultima_entrega u
join clientes c on c.id = u.cliente_id;

-- Cria cliente novo (se p_cliente_id for nulo), pedido e receita numa transação só.
create function registrar_pedido(
  p_usuario_id uuid,
  p_cliente_id uuid,
  p_cliente_nombre text,
  p_cliente_whatsapp text,
  p_cliente_idioma idioma,
  p_descripcion_armazon text,
  p_tipo_lente text,
  p_valor_total numeric,
  p_valor_adelanto numeric,
  p_fecha_pedido date,
  p_fecha_entrega_prevista date,
  p_receta jsonb default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_cliente_id uuid := p_cliente_id;
  v_pedido_id uuid;
  v_numero integer;
begin
  if v_cliente_id is null then
    insert into clientes (nombre, whatsapp, idioma)
    values (p_cliente_nombre, p_cliente_whatsapp, p_cliente_idioma)
    returning id into v_cliente_id;
  end if;

  insert into pedidos (
    cliente_id, descripcion_armazon, tipo_lente, valor_total, valor_adelanto,
    fecha_pedido, fecha_entrega_prevista, created_by
  )
  values (
    v_cliente_id, p_descripcion_armazon, p_tipo_lente, p_valor_total, p_valor_adelanto,
    p_fecha_pedido, p_fecha_entrega_prevista, p_usuario_id
  )
  returning id, numero into v_pedido_id, v_numero;

  if p_receta is not null then
    insert into recetas (
      cliente_id, pedido_id,
      od_esfera, od_cilindro, od_eje, oi_esfera, oi_cilindro, oi_eje,
      adicion, dnp_od, dnp_oi, observaciones, fecha_receta
    )
    values (
      v_cliente_id, v_pedido_id,
      (p_receta ->> 'od_esfera')::numeric, (p_receta ->> 'od_cilindro')::numeric, (p_receta ->> 'od_eje')::smallint,
      (p_receta ->> 'oi_esfera')::numeric, (p_receta ->> 'oi_cilindro')::numeric, (p_receta ->> 'oi_eje')::smallint,
      (p_receta ->> 'adicion')::numeric, (p_receta ->> 'dnp_od')::numeric, (p_receta ->> 'dnp_oi')::numeric,
      p_receta ->> 'observaciones', (p_receta ->> 'fecha_receta')::date
    );
  end if;

  return jsonb_build_object('pedido_id', v_pedido_id, 'numero', v_numero, 'cliente_id', v_cliente_id);
end
$$;
