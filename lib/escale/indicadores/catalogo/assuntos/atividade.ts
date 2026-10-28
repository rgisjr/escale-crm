import { coluna, dimensao, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "atividade";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

const CONCLUIDA = "(b.status = 'done' or a.concluida_em is not null)";
const PENDENTE = "b.status in ('pending','in_progress') and a.concluida_em is null";

export const ATIVIDADE: Assunto = {
  id: A,
  nome: "Atividade",
  categoria: "atividades",
  umaLinhaPor: "Uma linha por atividade.",
  perguntas: ["Quantas reuniões foram realizadas?", "Quem mais conclui atividades?"],
  base: { tabela: "public.crm_tasks", alias: "b" },
  joins: {
    a: { sql: "left join public.crm_atividades_do_negocio a on a.tarefa_id = b.id" },
    l: { sql: "left join public.crm_leads l on l.id = b.lead_id and l.organization_id = b.organization_id" },
    s: { sql: "left join public.crm_stages s on s.id = a.stage_id and s.organization_id = b.organization_id", precisa: ["a"] },
    p: { sql: "left join public.crm_pipelines p on p.id = l.pipeline_id and p.organization_id = b.organization_id", precisa: ["l"] },
  },
  medidas: [
    m("criadas", "Atividades criadas", "contagem", "count(*)", "Atividades criadas no recorte.", {
      apelidos: ["tarefas", "total de atividades"],
      perguntas: ["Quantas atividades foram criadas?", "Quem cria mais atividades?"],
    }),
    m("concluidas", "Atividades concluídas", "contagem", `count(*) filter (where ${CONCLUIDA})`, "Atividades marcadas como concluídas.", {
      apelidos: ["feitas", "finalizadas"],
      perguntas: ["Quantas atividades foram concluídas?", "Quem mais conclui atividades?"],
      precisa: ["a"],
    }),
    m("pendentes", "Atividades pendentes", "contagem", `count(*) filter (where ${PENDENTE})`, "Atividades ainda não concluídas.", {
      apelidos: ["a fazer", "em aberto"],
      perguntas: ["Quantas atividades estão pendentes?", "Quem tem mais atividades a fazer?"],
      precisa: ["a"],
    }),
    m("canceladas", "Atividades canceladas", "contagem", "count(*) filter (where b.status = 'cancelled')", "Atividades canceladas.", {
      apelidos: ["descartadas"],
      perguntas: ["Quantas atividades foram canceladas?", "Quem mais cancela atividades?"],
    }),
    m("atrasadas", "Atividades atrasadas", "contagem", `count(*) filter (where ${PENDENTE} and b.due_date < now())`, "Atividades pendentes com o prazo vencido.", {
      apelidos: ["vencidas", "fora do prazo"],
      perguntas: ["Quantas atividades estão atrasadas?", "Quem tem mais atividades vencidas?"],
      precisa: ["a"],
    }),
    m("reunioes", "Reuniões", "contagem", "count(*) filter (where a.tipo = 'reuniao')", "Atividades do tipo reunião.", {
      apelidos: ["reuniões marcadas", "agendadas"],
      perguntas: ["Quantas reuniões marquei?", "Quem agenda mais reuniões?"],
      precisa: ["a"],
    }),
    m("reunioes_realizadas", "Reuniões realizadas", "contagem", `count(*) filter (where a.tipo = 'reuniao' and ${CONCLUIDA})`, "Reuniões marcadas como concluídas.", {
      apelidos: ["reuniões feitas"],
      perguntas: ["Quantas reuniões foram realizadas?", "Qual SDR realiza mais reuniões?"],
      precisa: ["a"],
    }),
    m("ligacoes_agendadas", "Ligações (atividade)", "contagem", "count(*) filter (where a.tipo = 'ligacao')", "Atividades do tipo ligação.", {
      apelidos: ["ligações agendadas"],
      perguntas: ["Quantas ligações agendei?", "Quem agenda mais ligações?"],
      precisa: ["a"],
    }),
    m("taxa_de_conclusao", "Taxa de conclusão", "percentual", `100.0 * count(*) filter (where ${CONCLUIDA}) / nullif(count(*), 0)`, "Atividades concluídas sobre o total criado.", {
      apelidos: ["% concluídas", "produtividade"],
      perguntas: ["Qual a taxa de conclusão das atividades?", "Quem conclui mais do que cria?"],
      precisa: ["a"],
    }),
    m("tempo_ate_concluir", "Tempo até concluir", "duracao", `avg(extract(epoch from (coalesce(a.concluida_em, b.updated_at) - b.created_at))) filter (where ${CONCLUIDA})`, "Tempo médio entre criar e concluir a atividade.", {
      apelidos: ["tempo de execução"],
      perguntas: ["Quanto tempo leva para concluir uma atividade?", "Quem conclui mais rápido?"],
      precisa: ["a"],
    }),
  ],
  dimensoes: [
    d("tipo", "Tipo", "texto", "coalesce(a.tipo, 'tarefa')", { precisa: ["a"], opcoes: "tipos_de_atividade" }),
    d("responsavel", "Responsável", "texto", "b.assigned_to", { opcoes: "usuarios", uuid: true }),
    d("criador", "Criador", "texto", "b.created_by", { opcoes: "usuarios", uuid: true }),
    d("status", "Status", "texto", "b.status"),
    d("prioridade", "Prioridade", "texto", "b.priority"),
    d("etapa", "Etapa", "texto", "a.stage_id", { rotuloSql: "s.name", precisa: ["a", "s"], opcoes: "etapas", uuid: true }),
    d("origem", "Origem", "texto", "l.pipeline_id", { rotuloSql: "p.name", precisa: ["l", "p"], opcoes: "origens", uuid: true }),
    d("concluida", "Concluída", "booleano", CONCLUIDA, { precisa: ["a"] }),
    d("negocio", "Negócio", "texto", "b.lead_id", { rotuloSql: "l.title", precisa: ["l"], uuid: true }),
  ],
  tempos: [
    tempo(A, "criada_em", "Data de criação", "b.created_at", { padrao: true }),
    tempo(A, "vence_em", "Data de vencimento", "b.due_date"),
    tempo(A, "concluida_em", "Data de conclusão", "a.concluida_em", { precisa: ["a"] }),
  ],
  filtroDoPainel: {
    usuario: { sql: "b.assigned_to" },
    origem: { sql: "l.pipeline_id", precisa: ["l"] },
    grupo_de_origem: { sql: "p.group_id", precisa: ["l", "p"] },
    tags: { sql: "l.tags", precisa: ["l"] },
  },
  camposPersonalizados: { negocio: { sql: "l.custom_fields", precisa: ["l"] } },
  colunasDoDetalhamento: [
    coluna("titulo", "Título", "b.title"),
    coluna("tipo", "Tipo", "coalesce(a.tipo, 'tarefa')", ["a"]),
    coluna("responsavel", "Responsável", "b.assigned_to"),
    coluna("status", "Status", "b.status"),
    coluna("vencimento", "Vencimento", "b.due_date"),
    coluna("concluida_em", "Concluída em", "a.concluida_em", ["a"]),
    coluna("negocio", "Negócio", "l.title", ["l"]),
  ],
};
