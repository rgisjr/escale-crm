/**
 * O RASCUNHO DA JANELA (Fase 1F): tudo o que a pessoa mexe nas subabas fica
 * aqui até o "Salvar" único (01-013). `pedidoDoSalvar` separa o que vai pelas
 * rotas da 1B (nome, grupo, padrão) do que vai pela rota de configurações, e
 * barra o salvar com o texto da Clint e a seção onde está o erro.
 */
import type { MudancaDeOrigem } from "@/hooks/escale/useOrigens";
import type { MoedaServida } from "@/lib/money";

import {
  erroDoLimite,
  type AlertaDeTempo,
  type LimiteDeTempo,
  type UnidadeDeTempo,
} from "./alerta";
import { errosDasRegras, type RegraDeCampo } from "./campos";
import type { PatchDasConfiguracoes, SecaoDasConfiguracoes } from "./gravar";
import type { ConfiguracoesDaOrigem } from "./montar";

export interface LimiteNaTela {
  atencao: string;
  atencao_unidade: UnidadeDeTempo;
  critico: string;
  critico_unidade: UnidadeDeTempo;
}
export interface AlertaNaTela {
  geral: LimiteNaTela | null;
  excecoes: Array<{ etapa: string; limite: LimiteNaTela }>;
}
export interface RascunhoDaOrigem {
  /** Sem "tornar padrão" (F12): a origem padrão deixa de existir na tela. */
  gerais: { nome: string; grupo: string | null; moeda: MoedaServida; tags: string[] };
  motivos: { selecionados: string[]; novos: string[] };
  regras: RegraDeCampo[];
  alerta: AlertaNaTela;
}

/** O exemplo da Clint (01-029): atenção em 4 horas, crítico em 8 horas. */
export const LIMITE_NOVO: LimiteNaTela = {
  atencao: "4",
  atencao_unidade: "horas",
  critico: "8",
  critico_unidade: "horas",
};

const naTela = (l: LimiteDeTempo): LimiteNaTela => ({
  atencao: l.atencao === null ? "" : String(l.atencao),
  atencao_unidade: l.atencao_unidade,
  critico: l.critico === null ? "" : String(l.critico),
  critico_unidade: l.critico_unidade,
});

export function rascunhoInicial(config: ConfiguracoesDaOrigem): RascunhoDaOrigem {
  return {
    gerais: {
      nome: config.pipeline.name,
      grupo: config.pipeline.group_id,
      moeda: config.fork.moeda ?? config.moedaDaOrganizacao,
      tags: [...config.fork.tagsPadrao],
    },
    motivos: {
      selecionados: config.motivos.filter((m) => m.selecionado).map((m) => m.rotulo),
      novos: [],
    },
    regras: config.regras.map((r) => ({ ...r, etapas: [...r.etapas], status: [...r.status] })),
    alerta: {
      geral: config.fork.alerta.geral ? naTela(config.fork.alerta.geral) : null,
      excecoes: Object.entries(config.fork.alerta.etapas).map(([etapa, l]) => ({
        etapa,
        limite: naTela(l),
      })),
    },
  };
}

function numero(texto: string): number | null {
  const limpo = texto.trim();
  if (limpo === "") return null;
  const n = Number(limpo.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : Number.NaN;
}

function limiteDaTela(l: LimiteNaTela): LimiteDeTempo {
  return {
    atencao: numero(l.atencao),
    atencao_unidade: l.atencao_unidade,
    critico: numero(l.critico),
    critico_unidade: l.critico_unidade,
  };
}

export function alertaDaTela(
  a: AlertaNaTela,
): { ok: true; alerta: AlertaDeTempo } | { ok: false; erro: string; etapa: string | null } {
  const geral = a.geral ? limiteDaTela(a.geral) : null;
  if (geral) {
    const erro =
      erroDoLimite(geral) ??
      (Number.isNaN(geral.atencao) || Number.isNaN(geral.critico)
        ? "Informe um valor entre 1 e 8760."
        : null);
    if (erro) return { ok: false, erro, etapa: null };
  }
  const etapas: Record<string, LimiteDeTempo> = {};
  for (const x of a.excecoes) {
    const l = limiteDaTela(x.limite);
    const erro =
      erroDoLimite(l) ??
      (Number.isNaN(l.atencao) || Number.isNaN(l.critico)
        ? "Informe um valor entre 1 e 8760."
        : null);
    if (erro) return { ok: false, erro, etapa: x.etapa };
    etapas[x.etapa] = l;
  }
  return { ok: true, alerta: { geral, etapas } };
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function pedidoDoSalvar(
  r: RascunhoDaOrigem,
  config: ConfiguracoesDaOrigem,
):
  | { ok: true; mudancaDaOrigem: MudancaDeOrigem; patch: PatchDasConfiguracoes | null }
  | { ok: false; erro: string; secao: SecaoDasConfiguracoes } {
  const inicial = rascunhoInicial(config);
  if (r.gerais.nome.trim() === "")
    return { ok: false, erro: "Nome é um campo obrigatório!", secao: "gerais" };

  const mudancaDaOrigem: MudancaDeOrigem = {};
  if (r.gerais.nome.trim() !== config.pipeline.name) mudancaDaOrigem.name = r.gerais.nome;
  if (r.gerais.grupo && r.gerais.grupo !== config.pipeline.group_id)
    mudancaDaOrigem.groupId = r.gerais.grupo;

  const patch: PatchDasConfiguracoes = {};
  if (r.gerais.moeda !== inicial.gerais.moeda || !igual(r.gerais.tags, inicial.gerais.tags)) {
    patch.gerais = {
      moeda: r.gerais.moeda === config.moedaDaOrganizacao ? null : r.gerais.moeda,
      tags_padrao: r.gerais.tags,
    };
  }
  if (!igual(r.motivos, inicial.motivos))
    patch.motivos = { selecionados: r.motivos.selecionados, novos: r.motivos.novos };
  if (!igual(r.regras, inicial.regras)) {
    if (Object.keys(errosDasRegras(r.regras)).length > 0) {
      return {
        ok: false,
        erro: "Selecione ao menos uma etapa ou status para cada campo.",
        secao: "campos",
      };
    }
    patch.campos = { regras: r.regras };
  }
  if (!igual(r.alerta, inicial.alerta)) {
    const lido = alertaDaTela(r.alerta);
    if (!lido.ok) return { ok: false, erro: lido.erro, secao: "alerta" };
    patch.alerta = lido.alerta;
  }
  return { ok: true, mudancaDaOrigem, patch: Object.keys(patch).length > 0 ? patch : null };
}

export function algoMudou(r: RascunhoDaOrigem, config: ConfiguracoesDaOrigem): boolean {
  return !igual(r, rascunhoInicial(config));
}
