-- manifest: **LGPD dos comentários (fork Escale, 10-I/10D).** Gatilho `trg_escale_redigir_comentarios_ao_anonimizar` em `contacts` (`after update of is_anonymized`, função definer `fn_escale_redigir_comentarios_do_contato`, fechada a todos): na virada, `escale_disparos_de_comentario` perde o autor (`autor_usuario`/`autor_nome` nulos, `autor_id` e `texto` viram "(anonimizado)") e o que a automação escreveu para a pessoa (`resposta_publicada`, `direct_pendente`); `escale_acoes_no_comentario` perde `texto` e `autor_id`. As linhas ficam (desfecho, motivo e datas são a trilha do que a automação fez). Nenhuma tabela do original muda.
-- ---- FORK ESCALE · LGPD dos comentários (migration 9805) ----

create or replace function public.fn_escale_redigir_comentarios_do_contato()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.escale_disparos_de_comentario d
     set autor_usuario = null,
         autor_nome = null,
         autor_id = 'anonimizado',
         texto = '(anonimizado)',
         resposta_publicada = null,
         direct_pendente = null,
         updated_at = now()
   where d.organization_id = new.organization_id
     and d.contact_id = new.id;

  update public.escale_acoes_no_comentario a
     set texto = null,
         autor_id = null,
         updated_at = now()
   where a.organization_id = new.organization_id
     and a.contact_id = new.id;
  return null;
end;
$$;

revoke all on function public.fn_escale_redigir_comentarios_do_contato() from public, anon, authenticated;

drop trigger if exists trg_escale_redigir_comentarios_ao_anonimizar on public.contacts;
create trigger trg_escale_redigir_comentarios_ao_anonimizar
  after update of is_anonymized on public.contacts
  for each row
  when (new.is_anonymized is true and old.is_anonymized is distinct from true)
  execute function public.fn_escale_redigir_comentarios_do_contato();

notify pgrst, 'reload schema';
