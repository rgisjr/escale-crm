-- manifest: **Atividades do playbook endurecidas (fork Escale, Fase 1I).** Fecha o que a revisão do PR #29 apontou na 9009: em `crm_atividades_do_negocio` a política era `for all` para agente ou acima e o `authenticated` tinha todas as colunas, então quem chamasse o PostgREST direto podia forjar QUEM concluiu e QUANDO (`concluida_por`/`concluida_em`), trocar tipo, etapa ou a atividade do playbook de uma linha, ou apontar a linha para a tarefa de outro negócio. Agora: o `authenticated` só INSERE, e só nas colunas que a rota grava (`tarefa_id, organization_id, lead_id, stage_id, tipo, visibilidade`); UPDATE e DELETE diretos saem (a conclusão continua pelo gatilho da `crm_tasks`, e apagar a tarefa apaga a linha por cascata); o INSERT confere que a tarefa é do MESMO negócio e da mesma organização, que o negócio é visível a quem grava (`crm_leads` com a RLS dele) e que a etapa é da organização. Em `crm_atividades_da_etapa`, a escrita do gerente passa a exigir que a etapa seja da própria origem (`pipeline_id`), como a função de salvar já fazia. Os gatilhos `security definer` da 9009 não mudam e seguem gravando o que lhes cabe.
-- 9012: atividades do playbook endurecidas (fork Escale).

-- ── 1. atividades do negócio: só INSERT, nas colunas da rota, amarrado à tarefa e ao negócio ──
drop policy if exists crm_atividades_do_negocio_agent_write on public.crm_atividades_do_negocio;
drop policy if exists crm_atividades_do_negocio_insert on public.crm_atividades_do_negocio;

-- As subconsultas rodam sob a RLS de quem grava: o negócio precisa ser visível a ele (fn_can_view_lead).
create policy crm_atividades_do_negocio_insert on public.crm_atividades_do_negocio
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and exists (select 1 from public.crm_tasks t
                     where t.id = crm_atividades_do_negocio.tarefa_id
                       and t.organization_id = crm_atividades_do_negocio.organization_id
                       and t.lead_id = crm_atividades_do_negocio.lead_id)
        and exists (select 1 from public.crm_leads l
                     where l.id = crm_atividades_do_negocio.lead_id
                       and l.organization_id = crm_atividades_do_negocio.organization_id)
        and (crm_atividades_do_negocio.stage_id is null
             or exists (select 1 from public.crm_stages s
                         where s.id = crm_atividades_do_negocio.stage_id
                           and s.organization_id = crm_atividades_do_negocio.organization_id)))
  );

-- Quem concluiu, quando e a atividade do playbook são do banco (gatilhos definer): nunca do cliente.
revoke insert, update, delete, truncate, references, trigger on public.crm_atividades_do_negocio from authenticated;
grant insert (tarefa_id, organization_id, lead_id, stage_id, tipo, visibilidade)
  on public.crm_atividades_do_negocio to authenticated;

-- ── 2. playbook: a etapa precisa ser da própria origem ─────────────────────────
drop policy if exists crm_atividades_da_etapa_manager_write on public.crm_atividades_da_etapa;
create policy crm_atividades_da_etapa_manager_write on public.crm_atividades_da_etapa
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    (public.fn_is_platform_admin_full()
     or ((organization_id in (select public.fn_user_org_ids()))
         and public.fn_role_at_least(organization_id, 'manager')))
    and exists (select 1 from public.crm_stages s
                 where s.id = crm_atividades_da_etapa.stage_id
                   and s.organization_id = crm_atividades_da_etapa.organization_id
                   and s.pipeline_id = crm_atividades_da_etapa.pipeline_id)
  );

notify pgrst, 'reload schema';
