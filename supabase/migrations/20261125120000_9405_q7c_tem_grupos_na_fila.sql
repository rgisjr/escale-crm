-- manifest: **Revisão Q7c: "tem grupo?" da fila de Conversas sem contar tudo (fork Escale).** `fn_escale_fila_tem_grupos(p_org)` (invoker, `stable`, fechada ao `anon`) responde sim ou não com `EXISTS`, passando pelo mesmo filtro da fila (`fn_escale_conversa_passa` com `grupos = grupos`), no lugar do `count(*)` que varria todas as conversas da organização a cada abertura da tela só para virar um booleano; índice parcial `idx_conversations_org_grupos` em `conversations (organization_id) where is_group`. Nenhum dado muda.
-- ---- FORK ESCALE · revisão Q7c: tem grupo na fila (migration 9405) ----
-- 9405: revisão de qualidade Q7c (fork Escale). Só uma função e um índice; nenhum dado muda.

-- A tela da fila só precisa saber SE existe grupo (para mostrar o preset e a seção
-- de grupos); contar todos os grupos da organização, linha a linha e com a RLS de
-- quem olha, era o custo de toda abertura. EXISTS para na primeira conversa que passa.
-- O filtro é o mesmo da fila, então vale o que o Inbox esconde (contato pessoal, canal
-- desativado) e a RLS de quem pergunta: o resultado é igual a `contar(grupos) > 0`.
create or replace function public.fn_escale_fila_tem_grupos(p_org uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.conversations c
     where c.organization_id = p_org
       and c.is_group
       and public.fn_escale_conversa_passa(c, '{"grupos":"grupos"}'::jsonb)
  )
$$;

revoke all on function public.fn_escale_fila_tem_grupos(uuid) from public, anon;
grant execute on function public.fn_escale_fila_tem_grupos(uuid) to authenticated, service_role;

comment on function public.fn_escale_fila_tem_grupos(uuid) is
  'Fork Escale (9405): a organização tem alguma conversa de grupo visível na fila? EXISTS, sem contar. Invoker; mesmo filtro e mesma RLS da fila.';

-- O EXISTS acima procura por organização e is_group: o índice parcial só guarda grupos.
create index if not exists idx_conversations_org_grupos
  on public.conversations (organization_id)
  where is_group;

notify pgrst, 'reload schema';
