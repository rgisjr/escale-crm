import { coluna, dimensao, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "historico";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

export const HISTORICO: Assunto = {
  id: A,
  nome: "Histórico do negócio",
  categoria: "negocios",
  umaLinhaPor: "Uma linha por mudança de etapa.",
  perguntas: ["Quantos negócios mudaram de etapa essa semana?", "Quem mais movimenta o funil?"],
  base: { tabela: "public.crm_lead_activities", alias: "b", condicaoFixa: "b.type = 'stage_changed'" },
  joins: {
    l: { sql: "left join public.crm_leads l on l.id = b.lead_id and l.organization_id = b.organization_id" },
    so: { sql: "left join public.crm_stages so on so.id = (b.payload ->> 'from_stage_id')::uuid and so.organization_id = b.organization_id" },
    sd: { sql: "left join public.crm_stages sd on sd.id = (b.payload ->> 'to_stage_id')::uuid and sd.organization_id = b.organization_id" },
    p: {
      sql: "left join public.crm_pipelines p on p.id = l.pipeline_id and p.organization_id = b.organization_id",
      precisa: ["l"],
    },
  },
  medidas: [
    m("mudancas_de_etapa", "Mudanças de etapa", "contagem", "count(*)", "Quantas vezes um negócio mudou de etapa.", {
      apelidos: ["movimentações", "avanços"],
      perguntas: ["Quantas mudanças de etapa houve?", "Quem mais movimenta o funil?"],
    }),
    m("negocios_que_mudaram", "Negócios que mudaram de etapa", "contagem", "count(distinct b.lead_id)", "Negócios diferentes que mudaram de etapa.", {
      apelidos: ["negócios movimentados"],
      perguntas: ["Quantos negócios mudaram de etapa?", "Quantos negócios saíram da etapa inicial?"],
      precisa: [],
    }),
    m("mudancas_por_negocio", "Mudanças por negócio", "contagem", "count(*)::numeric / nullif(count(distinct b.lead_id), 0)", "Média de mudanças de etapa por negócio movimentado.", {
      apelidos: ["movimentação média"],
      perguntas: ["Quantas vezes cada negócio muda de etapa?", "O funil está andando?"],
    }),
    m("tempo_desde_a_criacao", "Tempo da criação até a mudança", "duracao", "avg(extract(epoch from (b.performed_at - l.created_at)))", "Tempo médio entre a criação do negócio e a mudança de etapa.", {
      apelidos: ["idade na mudança"],
      perguntas: ["Quanto tempo o negócio leva para mudar de etapa?", "Em qual etapa a mudança é mais lenta?"],
      precisa: ["l"],
    }),
    m("mudancas_feitas_por_pessoa", "Mudanças feitas por pessoas", "contagem", "count(*) filter (where b.performed_by_user_id is not null)", "Mudanças feitas por um usuário (não por automação).", {
      apelidos: ["mudanças manuais"],
      perguntas: ["Quantas mudanças foram manuais?", "Quem mais movimenta negócios?"],
    }),
  ],
  dimensoes: [
    d("etapa_de_origem", "Etapa de origem", "texto", "b.payload ->> 'from_stage_id'", { rotuloSql: "so.name", precisa: ["so"], opcoes: "etapas", uuid: true, ordemNatural: "so.position" }),
    d("etapa_de_destino", "Etapa de destino", "texto", "b.payload ->> 'to_stage_id'", { rotuloSql: "sd.name", precisa: ["sd"], opcoes: "etapas", uuid: true, ordemNatural: "sd.position" }),
    d("usuario", "Usuário", "texto", "b.performed_by_user_id", { opcoes: "usuarios", uuid: true }),
    d("origem", "Origem", "texto", "l.pipeline_id", { rotuloSql: "p.name", precisa: ["l", "p"], opcoes: "origens", uuid: true }),
    d("negocio", "Negócio", "texto", "b.lead_id", { rotuloSql: "l.title", precisa: ["l"], uuid: true }),
  ],
  tempos: [tempo(A, "mudou_em", "Data da mudança", "b.performed_at", { padrao: true })],
  filtroDoPainel: {
    usuario: { sql: "b.performed_by_user_id" },
    origem: { sql: "l.pipeline_id", precisa: ["l"] },
    grupo_de_origem: { sql: "p.group_id", precisa: ["l", "p"] },
    tags: { sql: "l.tags", precisa: ["l"] },
  },
  camposPersonalizados: { negocio: { sql: "l.custom_fields", precisa: ["l"] } },
  colunasDoDetalhamento: [
    coluna("negocio", "Negócio", "l.title", ["l"]),
    coluna("de", "De", "so.name", ["so"]),
    coluna("para", "Para", "sd.name", ["sd"]),
    coluna("usuario", "Usuário", "b.performed_by_user_id"),
    coluna("quando", "Quando", "b.performed_at", undefined, { formato: "data", tipo: "data" }),
  ],
};
