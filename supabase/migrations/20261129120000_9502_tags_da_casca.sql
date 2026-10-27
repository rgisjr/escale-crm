-- manifest: **Tags da casca (fork Escale).** `fn_escale_tag_gravar(p_org, p_tag, p_cor, p_descricao)` cria ou atualiza a entrada da tag em `organizations.settings.tags`: define cor (`#rrggbb`, null apaga) e descrição (≤160, null apaga); entrada nova ganha `criada_em` e `criada_por` (a tela de Tags da Clint mostra os dois). Entrada antiga em texto vira objeto sem duplicar. Portão: gerente (`fn_role_at_least`). Security definer, revogada de public e anon. Aditiva e idempotente; sem backfill.
-- ---- FORK ESCALE · Tags da casca (migration 9502) ----
create or replace function public.fn_escale_tag_gravar(
  p_org uuid,
  p_tag text,
  p_cor text,
  p_descricao text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_tag text := lower(btrim(coalesce(p_tag, '')));
  v_cor text := nullif(lower(btrim(coalesce(p_cor, ''))), '');
  v_desc text := nullif(btrim(coalesce(p_descricao, '')), '');
  v_lista jsonb;
  v_nova jsonb := '[]'::jsonb;
  v_item jsonb;
  v_entrada jsonb;
  v_achou boolean := false;
begin
  if not public.fn_role_at_least(p_org, 'manager') then
    raise exception 'sem permissão para mudar as tags' using errcode = '42501';
  end if;
  if v_tag = '' or length(v_tag) > 40 then
    raise exception 'tag_invalida' using errcode = '22023';
  end if;
  if v_cor is not null and v_cor !~ '^#[0-9a-f]{6}$' then
    raise exception 'cor_invalida' using errcode = '22023';
  end if;
  if v_desc is not null and length(v_desc) > 160 then
    raise exception 'descricao_longa' using errcode = '22023';
  end if;

  select case when jsonb_typeof(o.settings -> 'tags') = 'array' then o.settings -> 'tags' else '[]'::jsonb end
    into v_lista
    from public.organizations o
   where o.id = p_org
   for update;
  if not found then
    raise exception 'organizacao_inexistente' using errcode = 'P0002';
  end if;

  for v_item in select value from jsonb_array_elements(v_lista) loop
    if (jsonb_typeof(v_item) = 'string' and lower(btrim(v_item #>> '{}')) = v_tag)
       or (jsonb_typeof(v_item) = 'object' and lower(btrim(coalesce(v_item ->> 'tag', ''))) = v_tag) then
      if not v_achou then
        v_entrada := case when jsonb_typeof(v_item) = 'object' then v_item else jsonb_build_object('tag', v_tag) end;
        v_entrada := (v_entrada - 'cor' - 'descricao')
          || jsonb_strip_nulls(jsonb_build_object('cor', v_cor, 'descricao', v_desc));
        v_nova := v_nova || jsonb_build_array(v_entrada);
      end if;
      v_achou := true;
    else
      v_nova := v_nova || jsonb_build_array(v_item);
    end if;
  end loop;

  if not v_achou then
    v_entrada := jsonb_strip_nulls(jsonb_build_object(
      'tag', v_tag, 'cor', v_cor, 'descricao', v_desc,
      'criada_em', now(), 'criada_por', auth.uid()
    ));
    v_nova := v_nova || jsonb_build_array(v_entrada);
  end if;

  update public.organizations o
     set settings = jsonb_set(coalesce(o.settings, '{}'::jsonb), '{tags}', v_nova)
   where o.id = p_org;
  return v_entrada;
end;
$$;

revoke execute on function public.fn_escale_tag_gravar(uuid, text, text, text) from public, anon;
grant execute on function public.fn_escale_tag_gravar(uuid, text, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
