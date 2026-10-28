import { coluna, dimensao, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "negocio";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);
const tp = (...a: Parameters<typeof tempo> extends [string, ...infer R] ? R : never) => tempo(A, ...a);

const PARADO = (dias: number) =>
  `count(*) filter (where b.status = 'open' and coalesce(b.last_activity_at, b.created_at) < now() - interval '${dias} days')`;

export const NEGOCIO: Assunto = {
  id: A,
  nome: "Negócio",
  categoria: "negocios",
  umaLinhaPor: "Uma linha por negócio.",
  perguntas: ["Quantos negócios ganhei esse mês?", "Qual SDR mais converte?"],
  base: { tabela: "public.crm_leads", alias: "b" },
  joins: {
    s: { sql: "left join public.crm_stages s on s.id = b.stage_id and s.organization_id = b.organization_id" },
    p: { sql: "left join public.crm_pipelines p on p.id = b.pipeline_id and p.organization_id = b.organization_id" },
    g: {
      sql: "left join public.crm_pipeline_groups g on g.id = p.group_id and g.organization_id = b.organization_id",
      precisa: ["p"],
    },
    c: { sql: "left join public.contacts c on c.id = b.contact_id and c.organization_id = b.organization_id" },
    sp: { sql: "left join public.crm_stages sp on sp.id = b.lost_from_stage_id and sp.organization_id = b.organization_id" },
    tg: { sql: "left join lateral unnest(b.tags) tg(tag) on true" },
  },
  medidas: [
    m("quantidade", "Quantidade", "contagem", "count(*)", "Quantos negócios existem no recorte.", {
      apelidos: ["total de negócios", "leads", "oportunidades"],
      perguntas: ["Quantos negócios eu criei?", "Quantos negócios entraram no funil?"],
    }),
    m("ganhos", "Quantidade de ganhos", "contagem", "count(*) filter (where b.status = 'won')", "Negócios marcados como ganhos.", {
      apelidos: ["vendas", "fechados", "won"],
      perguntas: ["Quantos negócios ganhei esse mês?", "Quantas vendas fechei?"],
    }),
    m("perdidos", "Quantidade de perdidos", "contagem", "count(*) filter (where b.status = 'lost')", "Negócios marcados como perdidos.", {
      apelidos: ["perdas", "lost"],
      perguntas: ["Quantos negócios perdi?", "Qual origem mais perde negócios?"],
    }),
    m("abertos", "Quantidade em aberto", "contagem", "count(*) filter (where b.status = 'open')", "Negócios que ainda estão em andamento.", {
      apelidos: ["em andamento", "pipeline aberto"],
      perguntas: ["Quantos negócios estão em aberto?", "Quantos negócios há em cada etapa?"],
    }),
    m("soma_de_valores", "Soma de valores", "valor", "sum(b.value_cents) / 100.0", "Soma do valor de todos os negócios.", {
      apelidos: ["valor total", "receita potencial"],
      perguntas: ["Qual o valor total dos negócios?", "Quanto há em negociação?"],
      antesDeUsar: "Valor em reais; negócios com moedas diferentes não são somados.",
    }),
    m("soma_de_valores_ganhos", "Soma de valores ganhos", "valor", "sum(b.value_cents) filter (where b.status = 'won') / 100.0", "Soma do valor dos negócios ganhos.", {
      apelidos: ["faturamento", "receita", "vendas em reais"],
      perguntas: ["Quanto vendi esse mês?", "Qual o faturamento por vendedor?"],
      antesDeUsar: "Valor em reais; negócios com moedas diferentes não são somados.",
    }),
    m("soma_de_valores_perdidos", "Soma de valores perdidos", "valor", "sum(b.value_cents) filter (where b.status = 'lost') / 100.0", "Soma do valor dos negócios perdidos.", {
      apelidos: ["valor perdido", "receita perdida"],
      perguntas: ["Quanto deixei de vender?", "Quanto perdi por motivo?"],
      antesDeUsar: "Valor em reais; negócios com moedas diferentes não são somados.",
    }),
    m("soma_de_valores_abertos", "Soma de valores em aberto", "valor", "sum(b.value_cents) filter (where b.status = 'open') / 100.0", "Soma do valor dos negócios em andamento.", {
      apelidos: ["pipeline em reais", "valor em aberto"],
      perguntas: ["Quanto há em aberto no funil?", "Qual o valor do funil por etapa?"],
      antesDeUsar: "Valor em reais; negócios com moedas diferentes não são somados.",
    }),
    m("ticket_medio", "Ticket médio (ganhos)", "valor", "avg(b.value_cents) filter (where b.status = 'won') / 100.0", "Valor médio dos negócios ganhos.", {
      apelidos: ["ticket médio", "valor médio das vendas"],
      perguntas: ["Qual o ticket médio das vendas?", "Qual vendedor tem o maior ticket médio?"],
    }),
    m("valor_medio", "Valor médio", "valor", "avg(b.value_cents) / 100.0", "Valor médio de todos os negócios.", {
      apelidos: ["média de valores"],
      perguntas: ["Qual o valor médio dos negócios?", "Qual origem traz negócios de maior valor?"],
    }),
    m("taxa_de_conversao", "Taxa de conversão", "percentual", "100.0 * count(*) filter (where b.status = 'won') / nullif(count(*) filter (where b.status in ('won','lost')), 0)", "Ganhos sobre o total de negócios já decididos (ganhos e perdidos).", {
      apelidos: ["conversão", "taxa de ganho"],
      perguntas: ["Qual SDR mais converte?", "Qual origem converte mais?"],
      antesDeUsar: "Negócios em aberto não entram na conta.",
    }),
    m("percentual_de_ganhos", "Percentual de ganhos", "percentual", "100.0 * count(*) filter (where b.status = 'won') / nullif(count(*), 0)", "Ganhos sobre todos os negócios do recorte, inclusive os em aberto.", {
      apelidos: ["% de ganhos", "proporção de ganhos"],
      perguntas: ["Qual a proporção de negócios ganhos?", "Quanto do funil virou venda?"],
    }),
    m("percentual_de_perdidos", "Percentual de perdidos", "percentual", "100.0 * count(*) filter (where b.status = 'lost') / nullif(count(*), 0)", "Perdidos sobre todos os negócios do recorte.", {
      apelidos: ["% de perdas", "proporção de perdas"],
      perguntas: ["Qual a proporção de negócios perdidos?", "Qual origem perde mais?"],
    }),
    m("ciclo_de_venda", "Ciclo de venda", "duracao", "avg(extract(epoch from (b.closed_at - b.created_at))) filter (where b.status = 'won')", "Tempo médio entre a criação e o ganho do negócio.", {
      apelidos: ["tempo de venda", "ciclo médio"],
      perguntas: ["Quanto tempo leva para fechar uma venda?", "Qual vendedor fecha mais rápido?"],
    }),
    m("tempo_ate_perda", "Tempo até a perda", "duracao", "avg(extract(epoch from (b.closed_at - b.created_at))) filter (where b.status = 'lost')", "Tempo médio entre a criação e a perda do negócio.", {
      apelidos: ["tempo para perder", "tempo de perda"],
      perguntas: ["Quanto tempo leva até perder um negócio?", "Em qual origem a perda é mais rápida?"],
    }),
    m("tempo_na_etapa_atual", "Tempo na etapa atual", "duracao", "avg(extract(epoch from (now() - coalesce(b.stage_changed_at, b.created_at)))) filter (where b.status = 'open')", "Tempo médio que os negócios em aberto estão na etapa em que estão.", {
      apelidos: ["tempo parado na etapa", "idade na etapa"],
      perguntas: ["Quanto tempo os negócios ficam em cada etapa?", "Onde o funil está travando?"],
    }),
    m("parados_7_dias", "Parados há mais de 7 dias", "contagem", PARADO(7), "Negócios em aberto sem atividade há mais de 7 dias.", {
      apelidos: ["negócios parados", "sem movimento"],
      perguntas: ["Quantos negócios estão parados há uma semana?", "Quem tem negócios esquecidos?"],
    }),
    m("parados_30_dias", "Parados há mais de 30 dias", "contagem", PARADO(30), "Negócios em aberto sem atividade há mais de 30 dias.", {
      apelidos: ["negócios abandonados", "muito tempo parados"],
      perguntas: ["Quantos negócios estão parados há um mês?", "Qual etapa acumula negócios velhos?"],
    }),
    m("sem_dono", "Sem dono", "contagem", "count(*) filter (where b.owner_user_id is null)", "Negócios que não têm responsável.", {
      apelidos: ["sem responsável", "órfãos"],
      perguntas: ["Quantos negócios estão sem dono?", "Em qual origem há negócios sem responsável?"],
    }),
    m("atrasados", "Atrasados", "contagem", "count(*) filter (where b.status = 'open' and b.expected_close_date < current_date)", "Negócios em aberto com a previsão de fechamento vencida.", {
      apelidos: ["vencidos", "fora do prazo"],
      perguntas: ["Quantos negócios passaram da previsão de fechamento?", "Quem tem mais negócios atrasados?"],
    }),
    m("com_valor", "Com valor", "contagem", "count(*) filter (where coalesce(b.value_cents, 0) > 0)", "Negócios que têm valor preenchido.", {
      apelidos: ["valor preenchido"],
      perguntas: ["Quantos negócios têm valor?", "Quantos negócios estão sem valor?"],
    }),
  ],
  dimensoes: [
    d("etapa", "Etapa", "texto", "b.stage_id", { rotuloSql: "s.name", precisa: ["s"], opcoes: "etapas", uuid: true, ordemNatural: "s.position" }),
    d("origem", "Origem", "texto", "b.pipeline_id", { rotuloSql: "p.name", opcoes: "origens", uuid: true, precisa: ["p"] }),
    d("grupo_de_origem", "Grupo de origem", "texto", "p.group_id", { rotuloSql: "g.name", precisa: ["p", "g"], opcoes: "grupos_de_origem", uuid: true }),
    d("dono", "Dono", "texto", "b.owner_user_id", { opcoes: "usuarios", uuid: true }),
    d("status", "Status", "texto", "b.status", { opcoes: "status_do_negocio" }),
    d("motivo_de_perda", "Motivo de perda", "texto", "b.lost_reason", { opcoes: "motivos_de_perda" }),
    d("etapa_da_perda", "Etapa da perda", "texto", "b.lost_from_stage_id", { rotuloSql: "sp.name", precisa: ["sp"], opcoes: "etapas", uuid: true, ordemNatural: "sp.position" }),
    d("moeda", "Moeda", "texto", "b.currency", { opcoes: "moedas" }),
    d("fonte", "Fonte", "texto", "b.source", { opcoes: "fontes" }),
    d("tag", "Tag", "texto", "tg.tag", { precisa: ["tg"], multivalorada: true, opcoes: "tags" }),
    d("contato", "Contato", "texto", "b.contact_id", { rotuloSql: "c.name", precisa: ["c"], uuid: true }),
    d("tem_dono", "Tem dono", "booleano", "(b.owner_user_id is not null)"),
    d("titulo", "Título", "texto", "b.title"),
  ],
  tempos: [
    tp("criado_em", "Data de criação", "b.created_at", { padrao: true }),
    tp("fechado_em", "Data de fechamento", "b.closed_at"),
    tp("ganho_em", "Data do ganho", "case when b.status = 'won' then b.closed_at end"),
    tp("perdido_em", "Data da perda", "case when b.status = 'lost' then b.closed_at end"),
    tp("previsao_de_fechamento", "Previsão de fechamento", "b.expected_close_date::timestamptz"),
    tp("entrou_na_etapa_em", "Entrada na etapa atual", "coalesce(b.stage_changed_at, b.created_at)"),
    tp("ultima_atividade_em", "Última atividade", "b.last_activity_at"),
  ],
  filtroDoPainel: {
    usuario: { sql: "b.owner_user_id" },
    origem: { sql: "b.pipeline_id" },
    grupo_de_origem: { sql: "p.group_id", precisa: ["p"] },
    tags: { sql: "b.tags" },
  },
  camposPersonalizados: {
    negocio: { sql: "b.custom_fields" },
    contato: { sql: "c.custom_fields", precisa: ["c"] },
  },
  colunasDoDetalhamento: [
    coluna("id", "ID do negócio", "b.id"),
    coluna("titulo", "Título", "b.title"),
    coluna("contato", "Nome do contato", "c.name", ["c"]),
    coluna("dono", "Dono", "b.owner_user_id"),
    coluna("origem", "Origem", "p.name", ["p"]),
    coluna("etapa", "Etapa", "s.name", ["s"]),
    coluna("status", "Status", "b.status", undefined, { formato: "status_do_negocio", tipo: "texto" }),
    coluna("valor", "Valor", "b.value_cents / 100.0", undefined, { formato: "valor", tipo: "numero" }),
    coluna("moeda", "Moeda", "b.currency"),
    coluna("criado_em", "Data de criação", "b.created_at", undefined, { formato: "data", tipo: "data" }),
    coluna("fechado_em", "Data de fechamento", "b.closed_at", undefined, { formato: "data", tipo: "data" }),
    coluna("motivo_de_perda", "Motivo de perda", "b.lost_reason"),
  ],
};
