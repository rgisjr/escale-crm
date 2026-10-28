import { coluna, dimensao, juntarPerfil, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "contato";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

export const CONTATO: Assunto = {
  id: A,
  nome: "Contato",
  categoria: "negocios",
  umaLinhaPor: "Uma linha por contato.",
  perguntas: ["Quantos contatos novos tenho esse mês?", "De qual fonte vêm mais contatos?"],
  base: { tabela: "public.contacts", alias: "b", condicaoFixa: "b.is_merged_into is null" },
  joins: {
    ln: {
      sql: "left join lateral (select count(*) as n, count(*) filter (where l.status = 'won') as ganhos from public.crm_leads l where l.contact_id = b.id and l.organization_id = b.organization_id) ln on true",
    },
    cn: {
      sql: "left join lateral (select count(*) as n from public.conversations v where v.contact_id = b.id and v.organization_id = b.organization_id) cn on true",
    },
    tg: { sql: "left join lateral unnest(b.tags) tg(tag) on true" },
    cr: { sql: juntarPerfil("cr", "b.created_by_user_id") },
  },
  medidas: [
    m("criados", "Contatos criados", "contagem", "count(*)", "Contatos cadastrados no período.", {
      apelidos: ["novos contatos", "cadastros"],
      perguntas: ["Quantos contatos novos tenho esse mês?", "Quem mais cadastra contatos?"],
    }),
    m("com_negocio", "Com negócio", "contagem", "count(*) filter (where ln.n > 0)", "Contatos que têm ao menos um negócio.", {
      apelidos: ["viraram negócio"],
      perguntas: ["Quantos contatos viraram negócio?", "Qual fonte gera mais negócios?"],
      precisa: ["ln"],
    }),
    m("sem_negocio", "Sem negócio", "contagem", "count(*) filter (where coalesce(ln.n, 0) = 0)", "Contatos sem nenhum negócio.", {
      apelidos: ["sem oportunidade"],
      perguntas: ["Quantos contatos estão sem negócio?", "De qual fonte vêm os contatos sem negócio?"],
      precisa: ["ln"],
    }),
    m("com_negocio_ganho", "Com negócio ganho", "contagem", "count(*) filter (where ln.ganhos > 0)", "Contatos que já compraram.", {
      apelidos: ["clientes", "compradores"],
      perguntas: ["Quantos contatos viraram clientes?", "Qual fonte traz mais clientes?"],
      precisa: ["ln"],
    }),
    m("com_conversa", "Com conversa", "contagem", "count(*) filter (where cn.n > 0)", "Contatos que já conversaram com a empresa.", {
      apelidos: ["que conversaram"],
      perguntas: ["Quantos contatos já tiveram conversa?", "Quantos contatos nunca foram atendidos?"],
      precisa: ["cn"],
    }),
    m("bloqueados", "Bloqueados", "contagem", "count(*) filter (where b.is_blocked)", "Contatos bloqueados.", {
      apelidos: ["bloqueio"],
      perguntas: ["Quantos contatos estão bloqueados?", "Quem mais bloqueia contatos?"],
    }),
    m("com_email", "Com e-mail", "contagem", "count(*) filter (where nullif(trim(b.email), '') is not null)", "Contatos com e-mail preenchido.", {
      apelidos: ["email preenchido"],
      perguntas: ["Quantos contatos têm e-mail?", "Qual fonte traz contatos com e-mail?"],
    }),
    m("com_telefone", "Com telefone", "contagem", "count(*) filter (where nullif(trim(b.phone_number), '') is not null)", "Contatos com telefone preenchido.", {
      apelidos: ["telefone preenchido"],
      perguntas: ["Quantos contatos têm telefone?", "Qual fonte traz contatos com telefone?"],
    }),
  ],
  dimensoes: [
    d("fonte", "Fonte", "texto", "b.source", { opcoes: "fontes" }),
    d("tag", "Tag", "texto", "tg.tag", { precisa: ["tg"], multivalorada: true, opcoes: "tags" }),
    d("tipo", "Tipo", "texto", "b.kind"),
    d("bloqueado", "Bloqueado", "booleano", "b.is_blocked"),
    d("criado_por", "Criado por", "texto", "b.created_by_user_id", { rotuloSql: "cr.full_name", precisa: ["cr"], opcoes: "usuarios", uuid: true }),
    d("tem_negocio", "Tem negócio", "booleano", "(coalesce(ln.n, 0) > 0)", { precisa: ["ln"] }),
  ],
  tempos: [
    tempo(A, "criado_em", "Data de criação", "b.created_at", { padrao: true }),
    tempo(A, "ultima_atividade_em", "Última atividade", "b.last_activity_at"),
  ],
  filtroDoPainel: { tags: { sql: "b.tags" } },
  camposPersonalizados: { contato: { sql: "b.custom_fields" } },
  colunasDoDetalhamento: [
    coluna("nome", "Nome", "b.name"),
    coluna("email", "E-mail", "b.email"),
    coluna("telefone", "Telefone", "b.phone_number"),
    coluna("fonte", "Fonte", "b.source"),
    coluna("tags", "Tags", "array_to_string(b.tags, ', ')"),
    coluna("negocios", "Negócios", "ln.n", ["ln"]),
    coluna("criado_em", "Criado em", "b.created_at"),
  ],
};
