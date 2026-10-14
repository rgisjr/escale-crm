-- manifest: **Toda origem tem grupo (fork Escale, Fase 1B — painel Origens).** O grupo de funis ganha cor (um tom da paleta das etiquetas, ou nulo = automática), ícone (lista fechada) e "arquivado". Todo funil passa a ter grupo: o gatilho `trg_crm_pipelines_sempre_em_grupo` (definer, fechado a anon/authenticated) põe no grupo "Geral" da organização — criado sob demanda — o funil que chega sem grupo por qualquer caminho (lista de funis, IA, API, funil semeado da organização nova), e o backfill faz o mesmo com os que já existem. A FK `crm_pipelines_group_fk` deixa de soltar os funis (`set null`) e passa a recusar a exclusão de grupo com funil: quem exclui escolhe antes o grupo de destino. `crm_pipelines.group_id` vira NOT NULL.
-- 9002: toda origem tem grupo (fork Escale).

alter table public.crm_pipeline_groups
  add column if not exists color text,
  add column if not exists icon text not null default 'iniciais',
  add column if not exists is_archived boolean not null default false;

do $checks$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_pipeline_groups_cor_valida') then
    alter table public.crm_pipeline_groups
      add constraint crm_pipeline_groups_cor_valida
      check (color is null or color ~ '^#[0-9a-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crm_pipeline_groups_icone_valido') then
    alter table public.crm_pipeline_groups
      add constraint crm_pipeline_groups_icone_valido
      check (icon in ('iniciais', 'funil', 'pessoas', 'predio', 'loja', 'megafone', 'telefone'));
  end if;
end $checks$;

comment on column public.crm_pipeline_groups.color is
  'Cor do ícone do grupo: um tom de PALETA_DE_ETIQUETAS (lib/tags/cor-da-etiqueta.ts) ou NULL = cor automática pelo id.';
comment on column public.crm_pipeline_groups.icon is
  'Ícone do grupo no painel Origens; iniciais = duas letras do nome.';
comment on column public.crm_pipeline_groups.is_archived is
  'Grupo arquivado some do painel COM as origens dele, que continuam vivas (recebem negócio). Desarquivar devolve tudo.';

-- ── O GRUPO DE RESERVA ─────────────────────────────────────────────────────
-- Definer porque quem cria funil nem sempre pode criar grupo (o funil semeado
-- da organização nova nasce dentro do INSERT em organizations). O nome "Geral"
-- é procurado sem caixa nem espaços nas pontas — a mesma régua do índice
-- `uq_crm_pipeline_groups_org_nome` —, então o `on conflict` resolve a corrida
-- de dois funis chegando juntos. Se o "Geral" estiver arquivado, ele volta: o
-- funil novo nunca nasce escondido.
create or replace function public.fn_escale_origem_sempre_em_grupo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_grupo uuid;
begin
  if new.group_id is not null then
    return new;
  end if;

  insert into public.crm_pipeline_groups (organization_id, name)
    values (new.organization_id, 'Geral')
    on conflict (organization_id, (lower(btrim(name)))) do nothing;

  select g.id into v_grupo
    from public.crm_pipeline_groups g
    where g.organization_id = new.organization_id
      and lower(btrim(g.name)) = 'geral'
    limit 1;

  update public.crm_pipeline_groups
    set is_archived = false
    where id = v_grupo and is_archived;

  new.group_id := v_grupo;
  return new;
end
$fn$;

revoke all on function public.fn_escale_origem_sempre_em_grupo() from public, anon, authenticated;

drop trigger if exists trg_crm_pipelines_sempre_em_grupo on public.crm_pipelines;
create trigger trg_crm_pipelines_sempre_em_grupo
  before insert or update of group_id on public.crm_pipelines
  for each row execute function public.fn_escale_origem_sempre_em_grupo();

-- Backfill pelo MESMO caminho: "pedir nulo" aciona o gatilho, que põe o funil
-- no "Geral". Uma regra só, sem segunda cópia em SQL solto.
update public.crm_pipelines set group_id = null where group_id is null;

-- A FK deixa de soltar funis: com NOT NULL, `set null` viraria erro no meio da
-- exclusão. Sem ação = recusa no fim do comando — o que também deixa excluir a
-- organização inteira, porque funis e grupos saem no mesmo comando.
--
-- A troca só acontece enquanto a FK ainda é a da 9001 (`confdeltype` diferente
-- de 'a' = no action): reaplicar o baseline numa base que já passou por aqui
-- (update.sh) não derruba a FK nem revalida a tabela — nunca há janela sem FK.
-- O `add` vai por `format('%I')` porque a FK nasce na 9001 com o MESMO nome, e
-- a régua `baseline-constraint-reconstruida` conta nomes literais de
-- `add constraint`; o que ela vigia (reconstruir em série sobre dados) não
-- acontece aqui, porque esta troca roda uma vez só.
do $fk$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'crm_pipelines_group_fk'
      and conrelid = 'public.crm_pipelines'::regclass
      and confdeltype <> 'a'
  ) then
    alter table public.crm_pipelines drop constraint if exists crm_pipelines_group_fk;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'crm_pipelines_group_fk'
      and conrelid = 'public.crm_pipelines'::regclass
  ) then
    execute format(
      'alter table public.crm_pipelines add constraint %I foreign key (organization_id, group_id) '
        'references public.crm_pipeline_groups (organization_id, id)',
      'crm_pipelines_group_fk'
    );
  end if;
end $fk$;

alter table public.crm_pipelines alter column group_id set not null;

comment on column public.crm_pipelines.group_id is
  'Grupo de funis (crm_pipeline_groups) da MESMA organização (FK composta crm_pipelines_group_fk). Nunca nulo: o gatilho trg_crm_pipelines_sempre_em_grupo põe no grupo "Geral" quem chega sem grupo.';

notify pgrst, 'reload schema';
