import type { CampaignConfig, SearchInput } from "@/lib/prospecting/schema";

import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "./tipos";

/**
 * O ASSISTENTE DE PROSPECÇÃO (fork Escale, Fase 8D; D9). O rascunho vive na
 * tela; o motor só recebe a busca (passo 2) e a configuração (ao iniciar), com
 * os limites do `lib/prospecting/schema.ts`. Os campos numéricos ficam como
 * texto enquanto a pessoa digita ("1,5"), e viram número ao sair.
 */
export const PASSOS_DA_PROSPECCAO = [
  "Configure a sua prospecção",
  "Encontre empresas",
  "Configure a abordagem",
  "Confirme e inicie",
] as const;
export type PassoDaProspeccao = 0 | 1 | 2 | 3;
export type ModoDoAgente = "conversa" | "existente";

export interface RascunhoDaProspeccao {
  nome: string;
  numeroId: string | null;
  modo: ModoDoAgente;
  agenteId: string | null;
  nicho: string;
  local: string;
  limite: string;
  orcamento: string;
  enriquecer: boolean;
  funilId: string;
  etapaId: string;
  etapaQualificadaId: string;
  instrucao: string;
  qualificacao: string;
  limiteDiario: string;
  intervaloMinutos: string;
  entrada: "on_send" | "on_start";
  baseLegal: string;
}

/** Os padrões do original (`emptyConfig`, `searchSchema`): 20 empresas, US$ 1, 10 por dia, 15 min, só no envio. */
export const RASCUNHO_VAZIO: RascunhoDaProspeccao = {
  nome: "",
  numeroId: null,
  modo: "conversa",
  agenteId: null,
  nicho: "",
  local: "",
  limite: "20",
  orcamento: "1",
  enriquecer: true,
  funilId: "",
  etapaId: "",
  etapaQualificadaId: "",
  instrucao: "",
  qualificacao: "",
  limiteDiario: "10",
  intervaloMinutos: "15",
  entrada: "on_send",
  baseLegal: "",
};

/** O nome da Clint (3 a 80, B2), dentro do que o motor aceita (2 a 120). */
export const NOME_MIN = 3;
export const NOME_MAX = 80;

export function inteiroDoTexto(v: string): number | null {
  const s = v.trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}

export function decimalDoTexto(v: string): number | null {
  const s = v.trim();
  return /^\d+([.,]\d+)?$/.test(s) ? Number(s.replace(",", ".")) : null;
}

const entre = (n: number, min: number, max: number) => n >= min && n <= max;
const textoDoDecimal = (n: number) => String(n).replace(".", ",");

export interface ContextoDoPasso {
  buscaConcluida: boolean;
  marcadas: number;
}

/** Os erros que impedem "Próximo" (ou "Iniciar", no passo 4). Textos para `t()`. */
export function errosDoPasso(
  passo: PassoDaProspeccao,
  r: RascunhoDaProspeccao,
  ctx: ContextoDoPasso,
): string[] {
  const erros: string[] = [];
  if (passo === 0) {
    if (!entre(r.nome.trim().length, NOME_MIN, NOME_MAX))
      erros.push("O nome precisa ter de 3 a 80 caracteres.");
    if (!r.numeroId) erros.push("Escolha o número que vai abordar as empresas.");
    if (r.modo === "existente" && !r.agenteId) erros.push("Escolha um agente publicado.");
  } else if (passo === 1) {
    if (!ctx.buscaConcluida) erros.push("Busque as empresas e espere a busca terminar.");
    else if (ctx.marcadas === 0) erros.push("Marque pelo menos uma empresa para abordar.");
  } else if (passo === 2) {
    if (!r.agenteId)
      erros.push(
        r.modo === "conversa"
          ? "Termine a conversa e publique o agente antes de seguir."
          : "Escolha um agente publicado.",
      );
    if (!r.funilId || !r.etapaId || !r.etapaQualificadaId || r.etapaId === r.etapaQualificadaId)
      erros.push(
        "Escolha duas etapas abertas e diferentes do mesmo funil: entrada e qualificados.",
      );
    if (!entre(r.instrucao.trim().length, 10, 2000))
      erros.push("Descreva o que a IA deve oferecer (de 10 a 2.000 caracteres).");
    if (!entre(r.qualificacao.trim().length, 10, 2000))
      erros.push("Descreva quando o cliente está qualificado (de 10 a 2.000 caracteres).");
    const diario = inteiroDoTexto(r.limiteDiario);
    if (diario === null || !entre(diario, 1, 50)) erros.push("O máximo em 24 horas vai de 1 a 50.");
    const intervalo = inteiroDoTexto(r.intervaloMinutos);
    if (intervalo === null || !entre(intervalo, 5, 1440))
      erros.push("O intervalo mínimo vai de 5 a 1.440 minutos.");
  } else if (!entre(r.baseLegal.trim().length, 3, 500)) {
    erros.push("Informe a referência da avaliação de legítimo interesse (de 3 a 500 caracteres).");
  }
  return erros;
}

/** Os erros do formulário de busca (passo 2, antes de "Buscar empresas"). */
export function errosDaBusca(r: RascunhoDaProspeccao): string[] {
  const erros: string[] = [];
  if (!entre(r.nicho.trim().length, 2, 120))
    erros.push("Informe o público ou segmento (de 2 a 120 caracteres).");
  if (!entre(r.local.trim().length, 2, 160))
    erros.push("Informe a cidade ou região (de 2 a 160 caracteres).");
  const limite = inteiroDoTexto(r.limite);
  if (limite === null || !entre(limite, 1, 100)) erros.push("Até quantas empresas: de 1 a 100.");
  const orcamento = decimalDoTexto(r.orcamento);
  if (orcamento === null || !entre(orcamento, 0.5, 10))
    erros.push("O teto da busca vai de US$ 0,50 a US$ 10,00.");
  return erros;
}

/** A busca que vai ao motor. Só chame com `errosDaBusca(r)` vazio. */
export function buscaDoRascunho(r: RascunhoDaProspeccao): SearchInput {
  return {
    name: r.nome.trim(),
    niche: r.nicho.trim(),
    location: r.local.trim(),
    limit: inteiroDoTexto(r.limite) ?? 20,
    budget_usd: decimalDoTexto(r.orcamento) ?? 1,
    enrich: r.enriquecer,
  };
}

/** A mesma busca repetida reaproveita o `request_id` (o motor é idempotente por ele). */
export const impressaoDaBusca = (r: RascunhoDaProspeccao): string =>
  JSON.stringify(buscaDoRascunho(r));

/** A configuração que vai ao motor no "Iniciar". */
export function configDoRascunho(r: RascunhoDaProspeccao): CampaignConfig {
  return {
    agent_id: r.agenteId ?? "",
    channel_session_id: r.numeroId ?? "",
    pipeline_id: r.funilId,
    stage_id: r.etapaId,
    qualified_stage_id: r.etapaQualificadaId,
    instruction: r.instrucao.trim(),
    qualification: r.qualificacao.trim(),
    daily_limit: inteiroDoTexto(r.limiteDiario) ?? 10,
    interval_minutes: inteiroDoTexto(r.intervaloMinutos) ?? 15,
    legal_basis_ref: r.baseLegal.trim(),
    funnel_entry: r.entrada,
  };
}

function camposDaBusca(b: SearchInput): Partial<RascunhoDaProspeccao> {
  return {
    nome: b.name,
    nicho: b.niche,
    local: b.location,
    limite: String(b.limit),
    orcamento: textoDoDecimal(b.budget_usd),
    enriquecer: b.enrich,
  };
}

function camposDaConfig(c: CampaignConfig): Partial<RascunhoDaProspeccao> {
  return {
    modo: "existente",
    numeroId: c.channel_session_id,
    agenteId: c.agent_id,
    funilId: c.pipeline_id,
    etapaId: c.stage_id,
    etapaQualificadaId: c.qualified_stage_id,
    instrucao: c.instruction,
    qualificacao: c.qualification,
    limiteDiario: String(c.daily_limit),
    intervaloMinutos: String(c.interval_minutes),
    entrada: c.funnel_entry,
    baseLegal: c.legal_basis_ref,
  };
}

/** Continuar um rascunho: a busca gravada; a configuração, se a preparação já começou (A4). */
export function rascunhoDaCampanha(d: DetalheDaProspeccao): RascunhoDaProspeccao {
  return {
    ...RASCUNHO_VAZIO,
    ...camposDaBusca(d.busca),
    ...(d.config ? camposDaConfig(d.config) : {}),
  };
}

/** Duplicar (D8): tudo preenchido, o nome com o sufixo; a campanha nova nasce na próxima busca. */
export function rascunhoDaCopia(d: DetalheDaProspeccao, sufixo: string): RascunhoDaProspeccao {
  return { ...rascunhoDaCampanha(d), nome: `${d.busca.name}${sufixo}`.slice(0, NOME_MAX) };
}

/** Rascunho com a preparação começada vai direto à confirmação; o resto começa do passo 1. */
export const passoDaCampanha = (d: DetalheDaProspeccao): PassoDaProspeccao => (d.config ? 3 : 0);

export interface InicioDoAssistente {
  rascunho: RascunhoDaProspeccao;
  passo: PassoDaProspeccao;
  campanhaId: string | null;
}

export function inicioDoAssistente(
  d: DetalheDaProspeccao | null,
  modo: "nova" | "continuar" | "copiar",
  sufixo: string,
): InicioDoAssistente {
  if (!d || modo === "nova") return { rascunho: RASCUNHO_VAZIO, passo: 0, campanhaId: null };
  if (modo === "copiar")
    return { rascunho: rascunhoDaCopia(d, sufixo), passo: 0, campanhaId: null };
  return { rascunho: rascunhoDaCampanha(d), passo: passoDaCampanha(d), campanhaId: d.linha.id };
}

/** O que o construtor por conversa devolve (o `setup` do `onCreated` do original). */
export type SetupDoAgente = Pick<
  CampaignConfig,
  | "channel_session_id"
  | "pipeline_id"
  | "stage_id"
  | "qualified_stage_id"
  | "instruction"
  | "qualification"
>;

/** `agente` é o `result.agent` do `onCreated` do original (`CreatedProspectingAgent`). */
export function aplicarAgenteCriado(
  agente: { id: string; name: string },
  setup: SetupDoAgente,
): Partial<RascunhoDaProspeccao> {
  return {
    agenteId: agente.id,
    numeroId: setup.channel_session_id,
    funilId: setup.pipeline_id,
    etapaId: setup.stage_id,
    etapaQualificadaId: setup.qualified_stage_id,
    instrucao: setup.instruction,
    qualificacao: setup.qualification,
  };
}

/** As opções no formato que o `ProspectingAgentBuilder` do original recebe. */
export const canaisDoConstrutor = (o: OpcoesDaProspeccao) =>
  o.numeros.map((n) => ({
    id: n.id,
    display_name: n.nome,
    phone_number: n.telefone,
    status: n.status,
  }));

export const etapasDoConstrutor = (o: OpcoesDaProspeccao) =>
  o.etapas.map((e) => ({
    id: e.id,
    name: e.nome,
    pipeline_id: e.funilId,
    pipeline_name: e.funilNome,
  }));

/** Os números do `SeletorDeNumero` (8B): só os conectados, no grupo "Não oficial". */
export const numerosDoSeletor = (o: OpcoesDaProspeccao, grupo: string) =>
  o.numeros
    .filter((n) => n.status === "WORKING")
    .map((n) => ({ id: n.id, nome: n.nome, telefone: n.telefone, conectado: true, grupo }));

export function funisDasEtapas(o: OpcoesDaProspeccao): { valor: string; rotulo: string }[] {
  return [...new Map(o.etapas.map((e) => [e.funilId, e.funilNome])).entries()].map(
    ([valor, rotulo]) => ({
      valor,
      rotulo,
    }),
  );
}
