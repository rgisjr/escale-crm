-- manifest: **Faixa B · FB0: a mensagem agendada só aponta para contato e dispositivo da própria organização.** O insert de `crm_mensagens_agendadas` (9202) só conferia a conversa; `contact_id` e `channel_session_id` têm FK simples, então um agente podia agendar para contato ou dispositivo de outra organização e o cron enviaria por essa FK. A policy de insert passa a exigir que os dois pertençam à organização da linha. Só `alter policy`; nenhum dado muda; a linha legítima (tudo da mesma organização) continua entrando como antes.
-- ---- FORK ESCALE · Faixa B FB0: agendada só do mesmo tenant (migration 9403) ----
-- 9403: o with check do insert ganha duas conferências. O resto da policy é o da 9202,
-- com o `(select auth.uid())` que a 9402 (Q7b) já tinha posto.
alter policy crm_mensagens_agendadas_insert on public.crm_mensagens_agendadas
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and criado_por = (select auth.uid())
    and status = 'pendente'
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.organization_id = crm_mensagens_agendadas.organization_id)
    and exists (select 1 from public.contacts ct where ct.id = contact_id and ct.organization_id = crm_mensagens_agendadas.organization_id)
    and exists (select 1 from public.channel_sessions cs where cs.id = channel_session_id and cs.organization_id = crm_mensagens_agendadas.organization_id)
  );

notify pgrst, 'reload schema';
