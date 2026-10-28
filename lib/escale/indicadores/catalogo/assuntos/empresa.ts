import { coluna, dimensao, medida, tempo } from "../construtores";
import type { Assunto } from "../tipos";

const A = "empresa";
const m = (...a: Parameters<typeof medida> extends [string, ...infer R] ? R : never) => medida(A, ...a);
const d = (...a: Parameters<typeof dimensao> extends [string, ...infer R] ? R : never) => dimensao(A, ...a);

export const EMPRESA: Assunto = {
  id: A,
  nome: "Empresa",
  categoria: "negocios",
  umaLinhaPor: "Uma linha por empresa.",
  perguntas: ["Quantas empresas cadastrei esse mês?", "Em quais cidades estão minhas empresas?"],
  base: { tabela: "public.companies", alias: "b" },
  joins: {
    cp: { sql: "left join lateral (select count(*) as n from public.company_people x where x.company_id = b.id) cp on true" },
  },
  medidas: [
    m("criadas", "Empresas criadas", "contagem", "count(*)", "Empresas cadastradas no período.", {
      apelidos: ["novas empresas", "cadastros"],
      perguntas: ["Quantas empresas cadastrei?", "Em qual estado há mais empresas?"],
    }),
    m("enriquecidas", "Enriquecidas", "contagem", "count(*) filter (where b.enrichment_status = 'completed')", "Empresas com dados completados pelo enriquecimento.", {
      apelidos: ["completas"],
      perguntas: ["Quantas empresas foram enriquecidas?", "Qual porte tem mais empresas enriquecidas?"],
    }),
    m("com_cnpj", "Com CNPJ", "contagem", "count(*) filter (where b.normalized_cnpj is not null)", "Empresas com CNPJ válido.", {
      apelidos: ["cnpj preenchido"],
      perguntas: ["Quantas empresas têm CNPJ?", "Quantas empresas estão sem CNPJ?"],
    }),
    m("com_contatos", "Com contatos", "contagem", "count(*) filter (where cp.n > 0)", "Empresas ligadas a pelo menos um contato.", {
      apelidos: ["com pessoas"],
      perguntas: ["Quantas empresas têm contatos?", "Quantas empresas estão sem ninguém ligado?"],
      precisa: ["cp"],
    }),
    m("capital_social_medio", "Capital social médio", "valor", "avg(b.share_capital)", "Capital social médio das empresas.", {
      apelidos: ["capital médio"],
      perguntas: ["Qual o capital social médio?", "Qual porte tem maior capital social?"],
    }),
  ],
  dimensoes: [
    d("cidade", "Cidade", "texto", "b.city"),
    d("estado", "Estado", "texto", "b.state"),
    d("porte", "Porte", "texto", "b.company_size"),
    d("situacao_cadastral", "Situação cadastral", "texto", "b.registration_status"),
    d("cnae", "Atividade principal (CNAE)", "texto", "b.main_cnae_description"),
    d("status_do_enriquecimento", "Status do enriquecimento", "texto", "b.enrichment_status"),
  ],
  tempos: [
    tempo(A, "criada_em", "Data de criação", "b.created_at", { padrao: true }),
    tempo(A, "aberta_em", "Data de abertura", "b.opened_at::timestamptz"),
  ],
  filtroDoPainel: {},
  camposPersonalizados: { empresa: { sql: "b.custom_fields" } },
  colunasDoDetalhamento: [
    coluna("razao_social", "Razão social", "b.legal_name"),
    coluna("nome_fantasia", "Nome fantasia", "b.trade_name"),
    coluna("cnpj", "CNPJ", "b.normalized_cnpj"),
    coluna("cidade", "Cidade", "b.city"),
    coluna("estado", "Estado", "b.state"),
    coluna("porte", "Porte", "b.company_size"),
    coluna("criada_em", "Criada em", "b.created_at"),
  ],
};
