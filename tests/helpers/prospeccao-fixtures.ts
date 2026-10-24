import type {
  ContagemDaProspeccao,
  DetalheDaProspeccao,
  EmpresaDaProspeccao,
  LinhaDeProspeccao,
  OpcoesDaProspeccao,
} from "@/lib/escale/prospeccao/tipos";
import type { CampaignConfig, SearchInput } from "@/lib/prospecting/schema";

/** Os dados de exemplo da Prospecção na casca (Fase 8D). */
export const ORG = "22222222-2222-4222-8222-222222222222";
export const ID = "11111111-1111-4111-8111-111111111111";
export const NUMERO = "33333333-3333-4333-8333-333333333333";
export const AGENTE = "44444444-4444-4444-8444-444444444444";
export const FUNIL = "55555555-5555-4555-8555-555555555555";
export const ETAPA_ENTRADA = "66666666-6666-4666-8666-666666666666";
export const ETAPA_QUALIFICADOS = "77777777-7777-4777-8777-777777777777";

export const BUSCA: SearchInput = {
  name: "Clínicas Campinas",
  niche: "clínicas de estética",
  location: "Campinas, SP",
  limit: 20,
  budget_usd: 1.5,
  enrich: true,
};

export const CONFIG: CampaignConfig = {
  agent_id: AGENTE,
  channel_session_id: NUMERO,
  pipeline_id: FUNIL,
  stage_id: ETAPA_ENTRADA,
  qualified_stage_id: ETAPA_QUALIFICADOS,
  instruction: "Apresente a clínica com educação.",
  qualification: "Tem interesse em agendar avaliação.",
  daily_limit: 10,
  interval_minutes: 15,
  legal_basis_ref: "LIA 2026/01",
  funnel_entry: "on_send",
};

export function contagem(o: Partial<ContagemDaProspeccao> = {}): ContagemDaProspeccao {
  return {
    encontradas: 0,
    naFila: 0,
    abordadas: 0,
    responderam: 0,
    qualificadas: 0,
    falhas: 0,
    naoAbordadas: 0,
    ...o,
  };
}

export function linha(o: Partial<LinhaDeProspeccao> = {}): LinhaDeProspeccao {
  return {
    id: ID,
    nome: "Clínicas Campinas",
    situacao: "em_progresso",
    numeroId: NUMERO,
    criadaEm: "2026-10-10T12:00:00.000Z",
    primeiraAbordagem: "2026-10-10T15:39:00.000Z",
    ...contagem({
      encontradas: 20,
      naFila: 6,
      abordadas: 10,
      responderam: 4,
      qualificadas: 1,
      falhas: 2,
      naoAbordadas: 2,
    }),
    ...o,
  };
}

export function empresa(o: Partial<EmpresaDaProspeccao> = {}): EmpresaDaProspeccao {
  return {
    id: "e1",
    dados: {
      key: "place-1",
      name: "Clínica Bela",
      phone: "+5519999990000",
      website: "https://bela.com.br",
      category: "Clínica de estética",
      address: "Rua A, 1, Campinas",
      maps_url: null,
      rating: 4.5,
      reviews: 120,
      emails: [],
      socials: [],
    },
    status: "sent",
    selecionada: true,
    erro: null,
    negocioId: "l1",
    conversaId: "v1",
    abordadaEm: "2026-10-10T15:39:00.000Z",
    statusDaMensagem: "delivered",
    progresso: "replied",
    ...o,
  };
}

export function detalhe(o: Partial<DetalheDaProspeccao> = {}): DetalheDaProspeccao {
  return {
    linha: linha(),
    status: "running",
    statusDaBusca: "succeeded",
    busca: BUSCA,
    config: CONFIG,
    custoUsd: 0.4512,
    repetidas: 3,
    erro: null,
    empresas: [empresa()],
    ...o,
  };
}

export const OPCOES: OpcoesDaProspeccao = {
  configurada: true,
  agentes: [{ id: AGENTE, nome: "Sofia" }],
  numeros: [{ id: NUMERO, nome: "Comercial", telefone: "+5519988887777", status: "WORKING" }],
  etapas: [
    { id: ETAPA_ENTRADA, nome: "Abordado", funilId: FUNIL, funilNome: "Prospecção ativa" },
    { id: ETAPA_QUALIFICADOS, nome: "Qualificado", funilId: FUNIL, funilNome: "Prospecção ativa" },
  ],
};
