import { coluna, dimensao, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "ligacao";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

export const LIGACAO: Assunto = {
  id: A,
  nome: "Ligação",
  categoria: "ligacoes",
  umaLinhaPor: "Uma linha por ligação.",
  perguntas: ["Quantas ligações fiz hoje?", "Qual a taxa de atendimento por usuário?"],
  base: { tabela: "public.voice_calls", alias: "b" },
  joins: {
    c: { sql: "left join public.contacts c on c.id = b.contact_id and c.organization_id = b.organization_id" },
    cs: { sql: "left join public.channel_sessions cs on cs.id = b.channel_session_id and cs.organization_id = b.organization_id" },
    tg: { sql: "left join lateral unnest(c.tags) tg(tag) on true", precisa: ["c"] },
  },
  medidas: [
    m("total", "Ligações", "contagem", "count(*)", "Todas as ligações do recorte.", {
      apelidos: ["total de ligações", "chamadas"],
      perguntas: ["Quantas ligações houve?", "Quem mais liga?"],
    }),
    m("recebidas", "Recebidas", "contagem", "count(*) filter (where b.direction = 'inbound')", "Ligações recebidas.", {
      apelidos: ["entrada", "inbound"],
      perguntas: ["Quantas ligações recebi?", "Em qual número recebo mais ligações?"],
    }),
    m("realizadas", "Realizadas", "contagem", "count(*) filter (where b.direction = 'outbound')", "Ligações feitas.", {
      apelidos: ["saída", "feitas", "outbound"],
      perguntas: ["Quantas ligações fiz?", "Quem faz mais ligações?"],
    }),
    m("atendidas", "Atendidas", "contagem", "count(*) filter (where b.answered_at is not null)", "Ligações atendidas.", {
      apelidos: ["completadas"],
      perguntas: ["Quantas ligações foram atendidas?", "Quem tem mais ligações atendidas?"],
    }),
    m("nao_atendidas", "Não atendidas", "contagem", "count(*) filter (where b.answered_at is null and b.status = 'ended')", "Ligações encerradas sem atendimento.", {
      apelidos: ["perdidas", "sem resposta"],
      perguntas: ["Quantas ligações não foram atendidas?", "Em que horário há mais ligações perdidas?"],
    }),
    m("taxa_de_atendimento", "Taxa de atendimento", "percentual", "100.0 * count(*) filter (where b.answered_at is not null) / nullif(count(*), 0)", "Ligações atendidas sobre o total.", {
      apelidos: ["% atendidas", "taxa de contato"],
      perguntas: ["Qual a taxa de atendimento?", "Qual usuário tem a melhor taxa de atendimento?"],
    }),
    m("duracao_media", "Duração média", "duracao", "avg(b.duration_ms) / 1000.0", "Duração média das ligações.", {
      apelidos: ["tempo médio de ligação"],
      perguntas: ["Quanto dura uma ligação?", "Quem tem as ligações mais longas?"],
    }),
    m("duracao_total", "Duração total", "duracao", "sum(b.duration_ms) / 1000.0", "Soma do tempo de todas as ligações.", {
      apelidos: ["tempo no telefone"],
      perguntas: ["Quanto tempo passei no telefone?", "Quem passou mais tempo em ligações?"],
    }),
  ],
  dimensoes: [
    d("direcao", "Direção", "texto", "b.direction"),
    d("status", "Status", "texto", "b.status"),
    d("motivo_do_fim", "Motivo do fim", "texto", "b.end_reason"),
    d("usuario", "Usuário", "texto", "b.created_by", { opcoes: "usuarios", uuid: true }),
    d("numero", "Número", "texto", "b.channel_session_id", { rotuloSql: "coalesce(cs.display_name, cs.phone_number)", precisa: ["cs"], opcoes: "numeros", uuid: true }),
    d("contato", "Contato", "texto", "b.contact_id", { rotuloSql: "c.name", precisa: ["c"], uuid: true }),
    d("tag_do_contato", "Tag do contato", "texto", "tg.tag", { precisa: ["tg"], multivalorada: true, opcoes: "tags" }),
  ],
  tempos: [
    tempo(A, "iniciada_em", "Data de início", "b.started_at", { padrao: true }),
    tempo(A, "encerrada_em", "Data de encerramento", "b.ended_at"),
  ],
  filtroDoPainel: {
    usuario: { sql: "b.created_by" },
    tags: { sql: "c.tags", precisa: ["c"] },
  },
  camposPersonalizados: { contato: { sql: "c.custom_fields", precisa: ["c"] } },
  colunasDoDetalhamento: [
    coluna("contato", "Contato", "c.name", ["c"]),
    coluna("telefone", "Telefone", "c.phone_number", ["c"]),
    coluna("direcao", "Direção", "b.direction"),
    coluna("status", "Status", "b.status"),
    coluna("inicio", "Início", "b.started_at", undefined, { formato: "data", tipo: "data" }),
    coluna("duracao", "Duração (s)", "b.duration_ms / 1000.0", undefined, { formato: "duracao", tipo: "numero" }),
    coluna("usuario", "Usuário", "b.created_by"),
  ],
};
