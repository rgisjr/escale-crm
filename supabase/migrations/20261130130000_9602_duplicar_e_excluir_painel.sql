-- manifest: **Duplicar e excluir painel de Indicadores (fork Escale, Fase 7B).** `fn_escale_duplicar_painel` copia um painel visível e os seus gráficos numa transação (security invoker: a RLS da 9601 decide). `fn_escale_excluir_painel` grava `deleted_at` (exclusão suave) se quem chama é gerente ou acima, vê o painel e não está em suporte somente leitura, e recusa painel padrão ou modelo; é security definer porque o UPDATE deixaria a linha invisível à policy de SELECT. Nenhuma tabela muda.
-- ---- FORK ESCALE · duplicar e excluir painel (migration 9602) ----

create or replace function public.fn_escale_duplicar_painel(p_painel uuid, p_nome text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_origem public.crm_paineis;
  v_novo uuid;
begin
  select * into v_origem from public.crm_paineis where id = p_painel and deleted_at is null;
  if not found then
    raise exception 'painel_nao_encontrado' using errcode = 'no_data_found';
  end if;
  insert into public.crm_paineis (organization_id, nome, cor, icone, permissoes_usuarios, permissoes_papeis, criado_por)
  values (v_origem.organization_id, left(btrim(p_nome), 80), v_origem.cor, v_origem.icone,
          v_origem.permissoes_usuarios, v_origem.permissoes_papeis, auth.uid())
  returning id into v_novo;
  insert into public.crm_graficos (organization_id, painel_id, nome, descricao, tipo, layout, pergunta, opcoes, criado_por)
  select g.organization_id, v_novo, g.nome, g.descricao, g.tipo, g.layout, g.pergunta, g.opcoes, auth.uid()
  from public.crm_graficos g
  where g.painel_id = p_painel and g.deleted_at is null
  order by g.created_at;
  return v_novo;
end $$;
revoke all on function public.fn_escale_duplicar_painel(uuid, text) from public, anon;
grant execute on function public.fn_escale_duplicar_painel(uuid, text) to authenticated, service_role;

create or replace function public.fn_escale_excluir_painel(p_painel uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v public.crm_paineis;
begin
  select * into v from public.crm_paineis where id = p_painel and deleted_at is null;
  if not found
     or v.organization_id not in (select public.fn_user_org_ids())
     or not public.fn_escale_pode_ver_painel(v.organization_id, v.permissoes_usuarios, v.permissoes_papeis) then
    raise exception 'painel_nao_encontrado' using errcode = 'no_data_found';
  end if;
  -- Definer passa por cima das travas restritivas do suporte (0274): confere à mão.
  if not public.fn_role_at_least(v.organization_id, 'manager')
     or not public.fn_support_write_allowed(v.organization_id) then
    raise exception 'sem_permissao' using errcode = 'insufficient_privilege';
  end if;
  if v.padrao or v.modelo then
    raise exception 'painel_protegido' using errcode = 'check_violation',
      hint = 'Não é possível excluir um dashboard padrão ou template.';
  end if;
  update public.crm_paineis set deleted_at = now(), updated_at = now() where id = p_painel;
end $$;
revoke all on function public.fn_escale_excluir_painel(uuid) from public, anon;
grant execute on function public.fn_escale_excluir_painel(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
