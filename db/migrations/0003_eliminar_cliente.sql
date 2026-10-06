-- Apagar um cliente e tudo o que é dele (LGPD: direito à eliminação), numa transação só.
-- Leva junto pedidos, receitas, avisos, citas e mensagens do WhatsApp do mesmo número.
create function eliminar_cliente(p_cliente_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_whatsapp text;
begin
  select whatsapp into v_whatsapp from clientes where id = p_cliente_id for update;
  if not found then
    return false;
  end if;

  delete from notificaciones where cliente_id = p_cliente_id;
  delete from recetas where cliente_id = p_cliente_id;
  delete from citas where cliente_id = p_cliente_id;
  -- Mensagens ligadas ao cliente ou ao número dele (as que chegaram antes do cadastro também).
  -- Se outro cliente usa o mesmo número (família), as mensagens ficam para ele.
  delete from mensajes_whatsapp
   where cliente_id = p_cliente_id
      or (whatsapp = v_whatsapp
          and not exists (select 1 from clientes c where c.whatsapp = v_whatsapp and c.id <> p_cliente_id));
  delete from pedidos where cliente_id = p_cliente_id;
  delete from clientes where id = p_cliente_id;
  return true;
end
$$;
