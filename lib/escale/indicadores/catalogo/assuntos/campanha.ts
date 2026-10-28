import { coluna, dimensao, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "campanha";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

// Régua da 9301: enviado, entregue, lido e respondido são cumulativos; falha nunca conta.
const ENVIADO = "b.status <> 'failed' and (b.sent_at is not null or b.delivered_at is not null or b.read_at is not null or b.replied_at is not null)";
const ENTREGUE = "b.status <> 'failed' and (b.delivered_at is not null or b.read_at is not null or b.replied_at is not null)";
const LIDO = "b.status <> 'failed' and (b.read_at is not null or b.replied_at is not null)";
const RESPONDIDO = "b.replied_at is not null";
const contar = (cond: string) => `count(*) filter (where ${cond})`;
const taxa = (num: string, den: string) => `100.0 * ${contar(num)} / nullif(${contar(den)}, 0)`;

export const CAMPANHA: Assunto = {
  id: A,
  nome: "Campanha de WhatsApp",
  categoria: "campanhas",
  umaLinhaPor: "Uma linha por destinatário de campanha.",
  perguntas: ["Qual campanha teve a maior taxa de resposta?", "Quantas mensagens de campanha foram entregues?"],
  base: { tabela: "public.campaign_recipients", alias: "b" },
  joins: {
    ca: { sql: "left join public.campaigns ca on ca.id = b.campaign_id and ca.organization_id = b.organization_id" },
    c: { sql: "left join public.contacts c on c.id = b.contact_id and c.organization_id = b.organization_id" },
    cs: { sql: "left join public.channel_sessions cs on cs.id = ca.channel_session_id and cs.organization_id = b.organization_id", precisa: ["ca"] },
    tg: { sql: "left join lateral unnest(c.tags) tg(tag) on true", precisa: ["c"] },
  },
  medidas: [
    m("destinatarios", "Destinatários", "contagem", "count(*)", "Todos os contatos ligados às campanhas.", {
      apelidos: ["total de destinatários", "audiência"],
      perguntas: ["Quantos destinatários tive?", "Qual campanha tem a maior audiência?"],
    }),
    m("adicionados", "Adicionados (elegíveis)", "contagem", contar("b.eligibility_status = 'eligible'"), "Destinatários elegíveis ao envio.", {
      apelidos: ["elegíveis"],
      perguntas: ["Quantos contatos estavam elegíveis?", "Qual campanha tem mais elegíveis?"],
    }),
    m("excluidos", "Excluídos pela régua", "contagem", contar("b.eligibility_status = 'excluded'"), "Destinatários removidos pelas regras de elegibilidade.", {
      apelidos: ["removidos", "fora da régua"],
      perguntas: ["Quantos contatos a régua excluiu?", "Qual o principal motivo de exclusão?"],
    }),
    m("enviados", "Enviados", "contagem", contar(ENVIADO), "Mensagens que saíram da campanha.", {
      apelidos: ["disparos", "mensagens enviadas"],
      perguntas: ["Quantas mensagens a campanha enviou?", "Qual campanha enviou mais?"],
    }),
    m("entregues", "Entregues", "contagem", contar(ENTREGUE), "Mensagens que chegaram ao contato (inclui lidas e respondidas).", {
      apelidos: ["recebidos"],
      perguntas: ["Quantas mensagens foram entregues?", "Qual número entrega mais?"],
    }),
    m("lidos", "Lidos", "contagem", contar(LIDO), "Mensagens lidas (inclui respondidas).", {
      apelidos: ["visualizados"],
      perguntas: ["Quantas mensagens foram lidas?", "Qual campanha foi mais lida?"],
    }),
    m("respondidos", "Respondidos", "contagem", contar(RESPONDIDO), "Contatos que responderam à campanha.", {
      apelidos: ["respostas", "retornos"],
      perguntas: ["Quantos contatos responderam?", "Qual campanha gerou mais respostas?"],
    }),
    m("com_erro", "Com erro", "contagem", contar("b.status = 'failed'"), "Envios que falharam.", {
      apelidos: ["falhas", "não enviados"],
      perguntas: ["Quantos envios falharam?", "Qual campanha teve mais erros?"],
    }),
    m("descadastrados", "Descadastrados (opt-out)", "contagem", contar("b.opted_out_at is not null"), "Contatos que pediram para sair.", {
      apelidos: ["opt-out", "cancelaram"],
      perguntas: ["Quantos contatos se descadastraram?", "Qual campanha gera mais descadastros?"],
    }),
    m("taxa_de_entrega", "Taxa de entrega", "percentual", taxa(ENTREGUE, ENVIADO), "Entregues sobre enviados.", {
      apelidos: ["% entregues"],
      perguntas: ["Qual a taxa de entrega?", "Qual número tem a melhor entrega?"],
    }),
    m("taxa_de_leitura", "Taxa de leitura", "percentual", taxa(LIDO, ENTREGUE), "Lidos sobre entregues.", {
      apelidos: ["% lidos", "open rate"],
      perguntas: ["Qual a taxa de leitura?", "Qual campanha é mais lida?"],
    }),
    m("taxa_de_resposta", "Taxa de resposta", "percentual", taxa(RESPONDIDO, ENVIADO), "Respondidos sobre enviados.", {
      apelidos: ["% respondidos", "reply rate"],
      perguntas: ["Qual a taxa de resposta?", "Qual campanha teve a maior taxa de resposta?"],
    }),
  ],
  dimensoes: [
    d("campanha", "Campanha", "texto", "b.campaign_id", { rotuloSql: "ca.name", precisa: ["ca"], opcoes: "campanhas", uuid: true }),
    d("status_do_destinatario", "Status do destinatário", "texto", "b.status"),
    d("motivo_de_exclusao", "Motivo de exclusão", "texto", "b.exclusion_reason"),
    d("status_da_campanha", "Status da campanha", "texto", "ca.status", { precisa: ["ca"], opcoes: "status_da_campanha" }),
    d("numero", "Número", "texto", "ca.channel_session_id", { rotuloSql: "coalesce(cs.display_name, cs.phone_number)", precisa: ["ca", "cs"], opcoes: "numeros", uuid: true }),
    d("categoria_do_modelo", "Categoria do modelo", "texto", "b.escale_categoria_do_modelo"),
    d("contato", "Contato", "texto", "b.contact_id", { rotuloSql: "c.name", precisa: ["c"], uuid: true }),
    d("tag_do_contato", "Tag do contato", "texto", "tg.tag", { precisa: ["tg"], multivalorada: true, opcoes: "tags" }),
  ],
  tempos: [
    tempo(A, "enviado_em", "Data de envio", "b.sent_at", { padrao: true }),
    tempo(A, "campanha_iniciada_em", "Início da campanha", "ca.started_at", { precisa: ["ca"] }),
    tempo(A, "adicionado_em", "Data de inclusão", "b.created_at"),
    tempo(A, "respondido_em", "Data da resposta", "b.replied_at"),
  ],
  filtroDoPainel: { tags: { sql: "c.tags", precisa: ["c"] } },
  camposPersonalizados: { contato: { sql: "c.custom_fields", precisa: ["c"] } },
  colunasDoDetalhamento: [
    coluna("campanha", "Campanha", "ca.name", ["ca"]),
    coluna("contato", "Contato", "c.name", ["c"]),
    coluna("telefone", "Telefone", "b.recipient_address"),
    coluna("situacao", "Situação", "b.status"),
    coluna("motivo", "Motivo", "b.exclusion_reason"),
    coluna("enviado_em", "Enviado em", "b.sent_at"),
    coluna("lido_em", "Lido em", "b.read_at"),
    coluna("respondido_em", "Respondido em", "b.replied_at"),
  ],
};
