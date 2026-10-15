import { midpoint } from "@/lib/kanban/fractional-indexing";
import type { Lead } from "@/lib/types/leads";

import { numeroDoValor, type CampoFiltravel } from "./campos";
import { dadosDeFiltro } from "./dados-do-quadro";
import { PREFIXO_DE_CAMPO, type CriterioDeOrdem } from "./tipos";

/**
 * ORDENAR OS CARDS DO QUADRO (fork Escale, Fase 1D) — o "Ordenar por" da Clint:
 * um ou mais critérios, e a ordem das linhas define a prioridade. Com ordenação
 * ativa, a posição manual (`position_in_stage`) só desempata; arrastar dentro
 * da coluna deixa de fazer sentido e é desligado (ver `KanbanBoard`).
 *
 * Empresa (grupo da Clint) chega com o módulo Empresas, na Fase 2.
 */
export type GrupoDeOrdem = "contato" | "negocio" | "campos" | "atividades" | "atendimento";
export type TipoDeOrdem = "texto" | "numero" | "data" | "tempo";

export interface OpcaoDeOrdem {
  campo: string;
  /** Texto de interface nas fixas (passa por `t()`); nos campos personalizados, é dado. */
  rotulo: string;
  grupo: GrupoDeOrdem;
  tipo: TipoDeOrdem;
}

export const GRUPOS_DE_ORDEM: ReadonlyArray<{ grupo: GrupoDeOrdem; rotulo: string }> = [
  { grupo: "contato", rotulo: "Contato" },
  { grupo: "negocio", rotulo: "Negócio" },
  { grupo: "campos", rotulo: "Campos personalizados" },
  { grupo: "atividades", rotulo: "Atividades" },
  { grupo: "atendimento", rotulo: "Atendimento" },
];

const FIXAS: readonly OpcaoDeOrdem[] = [
  { campo: "contato.nome", rotulo: "Nome do contato", grupo: "contato", tipo: "texto" },
  { campo: "negocio.titulo", rotulo: "Título do negócio", grupo: "negocio", tipo: "texto" },
  { campo: "negocio.criado", rotulo: "Data de criação", grupo: "negocio", tipo: "data" },
  { campo: "negocio.atualizado", rotulo: "Última atualização", grupo: "negocio", tipo: "data" },
  { campo: "negocio.valor", rotulo: "Valor do negócio", grupo: "negocio", tipo: "numero" },
  { campo: "negocio.previsao", rotulo: "Previsão de fechamento", grupo: "negocio", tipo: "data" },
  { campo: "negocio.ganho", rotulo: "Data de ganho", grupo: "negocio", tipo: "data" },
  { campo: "negocio.perdido", rotulo: "Data de perdido", grupo: "negocio", tipo: "data" },
  { campo: "negocio.tempo_na_etapa", rotulo: "Tempo na etapa", grupo: "negocio", tipo: "tempo" },
  { campo: "atividades.concluidas", rotulo: "Atividades concluídas", grupo: "atividades", tipo: "numero" },
  { campo: "atividades.abertas", rotulo: "Atividades em aberto", grupo: "atividades", tipo: "numero" },
  { campo: "atendimento.ultima_mensagem", rotulo: "Última mensagem", grupo: "atendimento", tipo: "data" },
  { campo: "atendimento.nao_lidas", rotulo: "Mensagens não lidas", grupo: "atendimento", tipo: "numero" },
];

export function opcoesDeOrdem(campos: readonly CampoFiltravel[]): OpcaoDeOrdem[] {
  const personalizados = campos
    .filter((c) => c.alvo === "negocio" && c.tipo !== "opcoes")
    .map(
      (c): OpcaoDeOrdem => ({
        campo: `${PREFIXO_DE_CAMPO}${c.chave}`,
        rotulo: c.rotulo,
        grupo: "campos",
        tipo: c.tipo === "numero" ? "numero" : c.tipo === "data" ? "data" : "texto",
      }),
    );
  return [...FIXAS, ...personalizados];
}

const DIRECOES: Record<TipoDeOrdem, { asc: string; desc: string }> = {
  texto: { asc: "Alfabético de A a Z", desc: "Alfabético de Z a A" },
  tempo: { asc: "Menor tempo na etapa", desc: "Maior tempo na etapa" },
  numero: { asc: "Crescente", desc: "Decrescente" },
  data: { asc: "Crescente", desc: "Decrescente" },
};

export const rotulosDaDirecao = (tipo: TipoDeOrdem) => DIRECOES[tipo];

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const n = Date.parse(iso);
  return Number.isNaN(n) ? null : n;
}

function valorDeOrdem(lead: Lead, campo: string, agora: number, numericos: ReadonlySet<string>): string | number | null {
  switch (campo) {
    case "contato.nome":
      return dadosDeFiltro(lead)?.contato_nome ?? null;
    case "negocio.titulo":
      return lead.title?.trim() || null;
    case "negocio.criado":
      return ms(lead.created_at);
    case "negocio.atualizado":
      return ms(lead.updated_at);
    case "negocio.valor":
      return lead.value_cents ?? null;
    case "negocio.previsao":
      return ms(lead.expected_close_date);
    case "negocio.ganho":
      return lead.status === "won" ? ms(lead.closed_at) : null;
    case "negocio.perdido":
      return lead.status === "lost" ? ms(lead.closed_at) : null;
    case "negocio.tempo_na_etapa": {
      const desde = ms(lead.stage_changed_at) ?? ms(lead.created_at);
      return desde === null ? null : agora - desde;
    }
    case "atividades.concluidas":
      return dadosDeFiltro(lead)?.atividades_concluidas ?? 0;
    case "atividades.abertas":
      return lead.tarefas?.abertas ?? 0;
    case "atendimento.ultima_mensagem":
      return ms(lead.conversa?.last_message_at);
    case "atendimento.nao_lidas":
      return lead.conversa?.unread ?? 0;
  }
  if (!campo.startsWith(PREFIXO_DE_CAMPO)) return null;
  const chave = campo.slice(PREFIXO_DE_CAMPO.length);
  const bruto = lead.custom_fields?.[chave];
  if (bruto === null || bruto === undefined || bruto === "") return null;
  if (numericos.has(chave)) return numeroDoValor(bruto);
  if (typeof bruto === "number") return bruto;
  if (typeof bruto === "boolean") return bruto ? 1 : 0;
  return String(bruto);
}

export function comparadorDaOrdem(
  ordem: readonly CriterioDeOrdem[] | undefined,
  campos: readonly CampoFiltravel[] = [],
  agora: Date = new Date(),
): ((a: Lead, b: Lead) => number) | undefined {
  if (!ordem || ordem.length === 0) return undefined;
  const numericos = new Set(campos.filter((c) => c.alvo === "negocio" && c.tipo === "numero").map((c) => c.chave));
  const instante = agora.getTime();
  return (a, b) => {
    for (const { campo, direcao } of ordem) {
      const va = valorDeOrdem(a, campo, instante, numericos);
      const vb = valorDeOrdem(b, campo, instante, numericos);
      if (va === vb) continue;
      // Vazio fica no fim nas DUAS direções: "sem valor" não é o menor valor.
      if (va === null) return 1;
      if (vb === null) return -1;
      const r =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base", numeric: true });
      if (r !== 0) return direcao === "asc" ? r : -r;
    }
    return a.position_in_stage - b.position_in_stage;
  };
}

/**
 * Com ordenação ativa, soltar o card em outra etapa o põe DEPOIS do último card
 * da etapa INTEIRA (sem filtro), como na Clint: o lugar na coluna é o da
 * ordenação, não o do ponteiro.
 */
export function posicaoNoFimDaEtapa(
  leads: ReadonlyArray<Pick<Lead, "id" | "stage_id" | "position_in_stage">>,
  stageId: string,
  ignorarId: string,
): number {
  let maior: number | null = null;
  for (const l of leads) {
    if (l.stage_id !== stageId || l.id === ignorarId) continue;
    if (maior === null || l.position_in_stage > maior) maior = l.position_in_stage;
  }
  return midpoint(maior, null);
}
