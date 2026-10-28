import { coluna, dimensao, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "mensagem";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

export const MENSAGEM: Assunto = {
  id: A,
  nome: "Mensagem",
  categoria: "conversas",
  umaLinhaPor: "Uma linha por mensagem.",
  perguntas: ["Quantas mensagens enviei hoje?", "Em que horário recebo mais mensagens?"],
  base: { tabela: "public.messages", alias: "b" },
  joins: {
    cv: { sql: "left join public.conversations cv on cv.id = b.conversation_id and cv.organization_id = b.organization_id" },
    c: { sql: "left join public.contacts c on c.id = b.contact_id and c.organization_id = b.organization_id" },
    cs: { sql: "left join public.channel_sessions cs on cs.id = b.channel_session_id and cs.organization_id = b.organization_id" },
    tg: { sql: "left join lateral unnest(c.tags) tg(tag) on true", precisa: ["c"] },
  },
  medidas: [
    m("total", "Mensagens", "contagem", "count(*)", "Todas as mensagens do recorte.", {
      apelidos: ["total de mensagens", "volume"],
      perguntas: ["Quantas mensagens trocamos?", "Qual o volume de mensagens por dia?"],
    }),
    m("enviadas", "Mensagens enviadas", "contagem", "count(*) filter (where b.direction = 'outbound')", "Mensagens que saíram.", {
      apelidos: ["saída", "outbound"],
      perguntas: ["Quantas mensagens enviei?", "Quem mais envia mensagens?"],
    }),
    m("recebidas", "Mensagens recebidas", "contagem", "count(*) filter (where b.direction = 'inbound')", "Mensagens que chegaram.", {
      apelidos: ["entrada", "inbound"],
      perguntas: ["Quantas mensagens recebi?", "Em que horário recebo mais mensagens?"],
    }),
    m("enviadas_por_pessoas", "Enviadas por pessoas", "contagem", "count(*) filter (where b.direction = 'outbound' and b.sent_by_user_id is not null)", "Mensagens enviadas por um usuário.", {
      apelidos: ["manuais", "humanas"],
      perguntas: ["Quantas mensagens as pessoas enviaram?", "Quem envia mais mensagens?"],
    }),
    m("enviadas_pela_ia", "Enviadas pelo agente de IA", "contagem", "count(*) filter (where b.direction = 'outbound' and b.sent_by_user_id is null)", "Mensagens enviadas sem usuário (agente de IA ou automação).", {
      apelidos: ["automáticas", "robô"],
      perguntas: ["Quantas mensagens a IA enviou?", "Quanto do atendimento é automático?"],
      antesDeUsar: "Inclui automações e campanhas, que também saem sem usuário.",
    }),
    m("com_erro", "Com erro", "contagem", "count(*) filter (where b.status = 'failed' or b.error_code is not null)", "Mensagens que falharam no envio.", {
      apelidos: ["falhas", "não enviadas"],
      perguntas: ["Quantas mensagens deram erro?", "Qual número tem mais falhas?"],
    }),
    m("entregues", "Entregues", "contagem", "count(*) filter (where b.delivered_at is not null or b.read_at is not null)", "Mensagens entregues ou lidas.", {
      apelidos: ["recebidas pelo contato"],
      perguntas: ["Quantas mensagens foram entregues?", "Qual canal entrega mais?"],
    }),
    m("lidas", "Lidas", "contagem", "count(*) filter (where b.read_at is not null)", "Mensagens lidas pelo contato.", {
      apelidos: ["visualizadas"],
      perguntas: ["Quantas mensagens foram lidas?", "Qual atendente tem mais mensagens lidas?"],
    }),
  ],
  dimensoes: [
    d("direcao", "Direção", "texto", "b.direction"),
    d("tipo", "Tipo", "texto", "b.type"),
    d("status", "Status", "texto", "b.status"),
    d("canal", "Canal", "texto", "cv.channel", { precisa: ["cv"], opcoes: "canais" }),
    d("numero", "Número", "texto", "b.channel_session_id", { rotuloSql: "coalesce(cs.display_name, cs.phone_number)", precisa: ["cs"], opcoes: "numeros", uuid: true }),
    d("atendente", "Atendente", "texto", "b.sent_by_user_id", { opcoes: "usuarios", uuid: true }),
    d("hora_do_dia", "Hora do dia", "numero", "extract(hour from (b.sent_at at time zone $fuso))::int"),
    d("dia_da_semana", "Dia da semana", "numero", "extract(isodow from (b.sent_at at time zone $fuso))::int"),
    d("contato", "Contato", "texto", "b.contact_id", { rotuloSql: "c.name", precisa: ["c"], uuid: true }),
    d("tag_do_contato", "Tag do contato", "texto", "tg.tag", { precisa: ["tg"], multivalorada: true, opcoes: "tags" }),
  ],
  tempos: [tempo(A, "enviada_em", "Data de envio", "b.sent_at", { padrao: true })],
  filtroDoPainel: {
    usuario: { sql: "b.sent_by_user_id" },
    tags: { sql: "c.tags", precisa: ["c"] },
  },
  camposPersonalizados: { contato: { sql: "c.custom_fields", precisa: ["c"] } },
  colunasDoDetalhamento: [
    coluna("contato", "Contato", "c.name", ["c"]),
    coluna("direcao", "Direção", "b.direction"),
    coluna("tipo", "Tipo", "b.type"),
    coluna("status", "Status", "b.status"),
    coluna("enviada_em", "Enviada em", "b.sent_at"),
    coluna("atendente", "Atendente", "b.sent_by_user_id"),
  ],
};
