import { coluna, dimensao, juntarPerfil, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "conversa";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

const ENCERRADA = "b.status in ('resolved','closed','archived')";

export const CONVERSA: Assunto = {
  id: A,
  nome: "Conversa",
  categoria: "conversas",
  umaLinhaPor: "Uma linha por conversa.",
  perguntas: ["Quantas conversas iniciei hoje?", "Qual o tempo de primeira resposta por atendente?"],
  base: { tabela: "public.conversations", alias: "b" },
  joins: {
    c: { sql: "left join public.contacts c on c.id = b.contact_id and c.organization_id = b.organization_id" },
    cs: { sql: "left join public.channel_sessions cs on cs.id = b.channel_session_id and cs.organization_id = b.organization_id" },
    pr: { sql: juntarPerfil("pr", "b.assigned_to_user_id") },
    fr: {
      sql: "left join lateral (select min(m.sent_at) filter (where m.direction = 'inbound') as primeira_entrada, min(m.sent_at) filter (where m.direction = 'outbound' and m.sent_by_user_id is not null) as primeira_resposta_humana, min(m.sent_at) filter (where m.direction = 'outbound') as primeira_resposta from public.messages m where m.conversation_id = b.id and m.organization_id = b.organization_id) fr on true",
    },
    tg: { sql: "left join lateral unnest(c.tags) tg(tag) on true", precisa: ["c"] },
  },
  medidas: [
    m("iniciadas", "Conversas iniciadas", "contagem", "count(*)", "Conversas abertas no período.", {
      apelidos: ["atendimentos", "total de conversas"],
      perguntas: ["Quantas conversas iniciei hoje?", "Quantos atendimentos houve por canal?"],
    }),
    m("encerradas", "Conversas encerradas", "contagem", `count(*) filter (where ${ENCERRADA})`, "Conversas resolvidas, fechadas ou arquivadas.", {
      apelidos: ["resolvidas", "finalizadas"],
      perguntas: ["Quantas conversas foram encerradas?", "Quem encerra mais conversas?"],
    }),
    m("em_aberto", "Conversas em aberto", "contagem", `count(*) filter (where b.status not in ('resolved','closed','archived'))`, "Conversas que ainda não foram encerradas.", {
      apelidos: ["abertas", "em andamento"],
      perguntas: ["Quantas conversas estão em aberto?", "Qual atendente tem mais conversas abertas?"],
    }),
    m("atribuidas", "Conversas atribuídas", "contagem", "count(*) filter (where b.assigned_to_user_id is not null)", "Conversas que têm um atendente.", {
      apelidos: ["conversas atendidas", "com atendente"],
      perguntas: ["Quantas conversas cada atendente atendeu?", "Quantas conversas foram atribuídas?"],
    }),
    m("nao_atribuidas", "Conversas sem atendente", "contagem", "count(*) filter (where b.assigned_to_user_id is null)", "Conversas sem responsável.", {
      apelidos: ["sem responsável", "na fila"],
      perguntas: ["Quantas conversas estão sem atendente?", "Em qual canal há conversas sem dono?"],
    }),
    m("com_atendimento_humano", "Com resposta humana", "contagem", "count(*) filter (where fr.primeira_resposta_humana is not null)", "Conversas em que uma pessoa respondeu.", {
      apelidos: ["respondidas por pessoas"],
      perguntas: ["Quantas conversas tiveram resposta humana?", "Quanto do atendimento é humano?"],
      precisa: ["fr"],
    }),
    m("sem_resposta", "Sem nenhuma resposta", "contagem", "count(*) filter (where fr.primeira_entrada is not null and fr.primeira_resposta is null)", "Conversas em que o contato escreveu e ninguém respondeu.", {
      apelidos: ["abandonadas", "sem retorno"],
      perguntas: ["Quantas conversas ficaram sem resposta?", "Qual canal deixa mais conversas sem retorno?"],
      precisa: ["fr"],
    }),
    m("tempo_de_primeira_resposta", "Tempo de primeira resposta (humana)", "duracao", "avg(extract(epoch from (fr.primeira_resposta_humana - fr.primeira_entrada))) filter (where fr.primeira_resposta_humana > fr.primeira_entrada)", "Tempo médio entre a primeira mensagem do contato e a primeira resposta de uma pessoa.", {
      apelidos: ["tempo de resposta", "TMR", "1ª resposta"],
      perguntas: ["Qual o tempo de primeira resposta por atendente?", "Quanto demoro para responder?"],
      precisa: ["fr"],
    }),
    m("tempo_de_primeira_resposta_qualquer", "Tempo de primeira resposta (humana ou IA)", "duracao", "avg(extract(epoch from (fr.primeira_resposta - fr.primeira_entrada))) filter (where fr.primeira_resposta > fr.primeira_entrada)", "Tempo médio até a primeira resposta, de pessoa ou do agente de IA.", {
      apelidos: ["tempo de resposta geral"],
      perguntas: ["Em quanto tempo o contato recebe a primeira resposta?", "A IA responde mais rápido que as pessoas?"],
      precisa: ["fr"],
    }),
    m("respondidas_em_5_min", "Respondidas em até 5 minutos", "contagem", "count(*) filter (where fr.primeira_resposta_humana - fr.primeira_entrada <= interval '5 minutes')", "Conversas com a primeira resposta humana em até 5 minutos.", {
      apelidos: ["resposta rápida"],
      perguntas: ["Quantas conversas respondi em até 5 minutos?", "Quem responde mais rápido?"],
      precisa: ["fr"],
    }),
    m("tempo_ate_encerrar", "Tempo até encerrar", "duracao", "avg(extract(epoch from (b.service_closed_at - coalesce(b.service_started_at, b.created_at)))) filter (where b.service_closed_at is not null)", "Tempo médio entre o início e o encerramento do atendimento.", {
      apelidos: ["duração do atendimento", "TMA"],
      perguntas: ["Quanto dura um atendimento?", "Qual atendente resolve mais rápido?"],
    }),
    m("com_transferencia_para_humano", "Com passagem para humano", "contagem", "count(*) filter (where b.last_handoff_at is not null)", "Conversas que o agente de IA passou para uma pessoa.", {
      apelidos: ["handoff", "transferidas"],
      perguntas: ["Quantas conversas a IA passou para humanos?", "Qual o motivo das passagens?"],
    }),
    m("em_grupo", "Conversas em grupo", "contagem", "count(*) filter (where b.is_group)", "Conversas de grupo.", {
      apelidos: ["grupos"],
      perguntas: ["Quantas conversas são de grupo?", "Em qual número há mais grupos?"],
    }),
  ],
  dimensoes: [
    d("canal", "Canal", "texto", "b.channel", { opcoes: "canais" }),
    d("atendente", "Atendente", "texto", "b.assigned_to_user_id", { rotuloSql: "pr.full_name", precisa: ["pr"], opcoes: "usuarios", uuid: true }),
    d("numero", "Número", "texto", "b.channel_session_id", { rotuloSql: "coalesce(cs.display_name, cs.phone_number)", precisa: ["cs"], opcoes: "numeros", uuid: true }),
    d("status", "Status", "texto", "b.status", { opcoes: "status_da_conversa" }),
    d("situacao", "Situação", "texto", `case when ${ENCERRADA} then 'encerrada' else 'aberta' end`),
    d("contato", "Contato", "texto", "b.contact_id", { rotuloSql: "c.name", precisa: ["c"], uuid: true }),
    d("tag_do_contato", "Tag do contato", "texto", "tg.tag", { precisa: ["tg"], multivalorada: true, opcoes: "tags" }),
    d("motivo_da_passagem", "Motivo da passagem", "texto", "b.last_handoff_reason"),
  ],
  tempos: [
    tempo(A, "iniciada_em", "Data de início", "b.created_at", { padrao: true }),
    tempo(A, "encerrada_em", "Data de encerramento", "b.service_closed_at"),
    tempo(A, "ultima_mensagem_em", "Última mensagem", "b.last_message_at"),
    tempo(A, "atribuida_em", "Data de atribuição", "b.assigned_at"),
  ],
  filtroDoPainel: {
    usuario: { sql: "b.assigned_to_user_id" },
    tags: { sql: "c.tags", precisa: ["c"] },
  },
  camposPersonalizados: { contato: { sql: "c.custom_fields", precisa: ["c"] } },
  colunasDoDetalhamento: [
    coluna("contato", "Contato", "c.name", ["c"]),
    coluna("canal", "Canal", "b.channel"),
    coluna("numero", "Número", "coalesce(cs.display_name, cs.phone_number)", ["cs"]),
    coluna("atendente", "Atendente", "pr.full_name", ["pr"]),
    coluna("status", "Status", "b.status"),
    coluna("iniciada_em", "Iniciada em", "b.created_at"),
    coluna("ultima_mensagem", "Última mensagem", "b.last_message_at"),
    coluna("primeira_resposta", "Primeira resposta (s)", "extract(epoch from (fr.primeira_resposta - fr.primeira_entrada))", ["fr"]),
  ],
};
