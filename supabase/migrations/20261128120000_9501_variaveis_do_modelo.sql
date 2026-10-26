-- manifest: **Variáveis do modelo de mensagem (fork Escale, Frente V).** Duas colunas em `meta_templates`: `variaveis` (jsonb `not null default '{}'`, CHECK de objeto) guarda de onde vem cada `{{n}}` do modelo, por `slotKey` (`{"1": {"fonte":"campo","campo":"[CONTACT.FIRST_NAME]","alternativo":null}}` ou `{"fonte":"fixo","valor":"..."}`), e `variaveis_contrato` guarda o `contract_hash` do momento em que foi salvo (diferente do atual = mapeamento desatualizado, o modelo mudou na Meta). Coluna no espelho e não tabela nova, como `saved_values` (0382): o valor pertence à definição (organização + WABA + nome + idioma) e o `upsert` do sync lista só as colunas da plataforma, então ressincronizar não apaga o mapeamento. A policy da tabela (0088) deixa todo membro escrever; o gatilho `fn_escale_variaveis_do_modelo_so_admin` recusa (42501) quem, como `authenticated`, muda essas duas colunas sem ser administrador da organização. O servidor (service role) grava pela rota `PATCH /api/v1/channels/templates/variaveis`. Aditiva e idempotente; sem backfill.
-- ---- FORK ESCALE · Frente V: variáveis do modelo de mensagem (migration 9501) ----
-- 9501: o mapeamento das variáveis do modelo (fork Escale, Frente V).

alter table public.meta_templates
  add column if not exists variaveis jsonb not null default '{}'::jsonb,
  add column if not exists variaveis_contrato text;

alter table public.meta_templates drop constraint if exists meta_templates_variaveis_objeto;
alter table public.meta_templates
  add constraint meta_templates_variaveis_objeto check (jsonb_typeof(variaveis) = 'object');

comment on column public.meta_templates.variaveis is
  'Fork Escale (9501): de onde vem cada {{n}}, por slotKey: {"1": {"fonte":"campo","campo":"[CONTACT.FIRST_NAME]","alternativo":null}} ou {"fonte":"fixo","valor":"..."}. Gravada pelo servidor (PATCH /api/v1/channels/templates/variaveis), em todas as linhas do mesmo nome e idioma da organização.';
comment on column public.meta_templates.variaveis_contrato is
  'Fork Escale (9501): contract_hash do modelo quando o mapeamento foi salvo; diferente do atual = mapeamento desatualizado.';

-- A policy da tabela é FOR ALL para todo membro: sem esta trava, um atendente
-- mudaria pelo PostgREST o que o modelo manda para todos os contatos.
create or replace function public.fn_escale_variaveis_do_modelo_so_admin()
  returns trigger
  language plpgsql
  security invoker
  set search_path = public, pg_temp
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.variaveis is not distinct from old.variaveis
     and new.variaveis_contrato is not distinct from old.variaveis_contrato then
    return new;
  end if;
  if tg_op = 'INSERT' and new.variaveis = '{}'::jsonb and new.variaveis_contrato is null then
    return new;
  end if;
  if not public.fn_role_at_least(new.organization_id, 'admin') then
    raise exception 'só o administrador muda as variáveis do modelo' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_meta_templates_variaveis_so_admin on public.meta_templates;
create trigger trg_meta_templates_variaveis_so_admin
  before insert or update on public.meta_templates
  for each row execute function public.fn_escale_variaveis_do_modelo_so_admin();

notify pgrst, 'reload schema';
