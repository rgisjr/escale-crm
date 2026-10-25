/**
 * O RASCUNHO DA JANELA (Fase 1F): tudo o que a pessoa mexe nas subabas fica
 * aqui até o "Salvar" único (01-013). `pedidoDoSalvar` separa o que vai pelas
 * rotas da 1B (nome, grupo, padrão) do que vai pela rota de configurações, e
 * barra o salvar com o texto da Clint e a seção onde está o erro.
 */
import type { MudancaDeOrigem } from "@/hooks/escale/useOrigens";
import type { VisibilityMode } from "@/lib/auth/types";
import { type CamposOcultos, OCULTOS_VAZIOS } from "@/lib/escale/campos/ocultos";
import {
  distribuidosForaDaLista,
  erroDaDistribuicao,
  linhasDaTela,
  pedidoDaDistribuicao,
  textoDoBloqueio,
  type LinhaDaDistribuicao,
  type PedidoDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";
import { atribuicaoDaTela, patchDaAtribuicao, type AtribuicaoNaTela } from "@/lib/escale/ganho/regras";
import {
  erroDasNotificacoes,
  patchDasNotificacoes,
  type NotificacoesDaOrigem,
} from "@/lib/escale/notificacoes/regras";
import type { MoedaServida } from "@/lib/money";

import {
  MAXIMO_POR_UNIDADE,
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
  gerais: {
    nome: string;
    grupo: string | null;
    moeda: MoedaServida;
    tags: string[];
    /** A regra de quem vê os negócios (1J): a em vigor; salvar grava a escolhida. */
    visualizacao: VisibilityMode;
  };
  motivos: { selecionados: string[]; novos: string[] };
  regras: RegraDeCampo[];
  alerta: AlertaNaTela;
  /** Quem tem acesso à origem (1J); vazia = segue o grupo, ou sem restrição. */
  permissoes: { pessoas: string[] };
  /** Fase 1K (D13): as linhas da distribuição e o "Reiniciar a contagem de negócios ao salvar". */
  distribuicao: { linhas: LinhaDaDistribuicao[]; reiniciar: boolean };
  /** Fase 1K (D14): a caixa "só o admin dá ganho" e as regras do crédito do ganho. */
  atribuicao: AtribuicaoNaTela;
  /** Fase 1K (D15): quem é avisado do novo negócio e da mudança de status. */
  notificacoes: NotificacoesDaOrigem;
  /** Fase 2C (D4): a "Visualização de campos" (os desligados por objeto e "usar do grupo"). */
  camposOcultos: CamposOcultos;
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
      visualizacao: config.visualizacao,
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
    permissoes: { pessoas: [...config.fork.pessoas] },
    distribuicao: { linhas: linhasDaTela(config.distribuicao), reiniciar: false },
    atribuicao: atribuicaoDaTela(config.fork),
    notificacoes: {
      novoNegocio: [...config.fork.notificacoes.novoNegocio],
      mudancaDeStatus: {
        status: [...config.fork.notificacoes.mudancaDeStatus.status],
        pessoas: [...config.fork.notificacoes.mudancaDeStatus.pessoas],
      },
    },
    camposOcultos: {
      usar_do_grupo: (config.fork.camposOcultos ?? OCULTOS_VAZIOS).usar_do_grupo,
      contato: [...(config.fork.camposOcultos ?? OCULTOS_VAZIOS).contato],
      negocio: [...(config.fork.camposOcultos ?? OCULTOS_VAZIOS).negocio],
      empresa: [...(config.fork.camposOcultos ?? OCULTOS_VAZIOS).empresa],
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

/**
 * O erro de um limite como a pessoa o vê: texto que não é número cai no teto da
 * UNIDADE escolhida, e a regra geral vazia não fala de "exceção".
 */
function erroDoLimiteNaTela(l: LimiteDeTempo, ehGeral: boolean): string | null {
  for (const [valor, unidade] of [
    [l.atencao, l.atencao_unidade],
    [l.critico, l.critico_unidade],
  ] as const) {
    if (valor !== null && Number.isNaN(valor)) {
      return `Informe um valor entre 1 e ${MAXIMO_POR_UNIDADE[unidade]}.`;
    }
  }
  if (ehGeral && l.atencao === null && l.critico === null) {
    return "Preencha pelo menos um limite da regra geral ou remova-a antes de salvar.";
  }
  return erroDoLimite(l);
}

export function alertaDaTela(
  a: AlertaNaTela,
): { ok: true; alerta: AlertaDeTempo } | { ok: false; erro: string; etapa: string | null } {
  const geral = a.geral ? limiteDaTela(a.geral) : null;
  if (geral) {
    const erro = erroDoLimiteNaTela(geral, true);
    if (erro) return { ok: false, erro, etapa: null };
  }
  const etapas: Record<string, LimiteDeTempo> = {};
  for (const x of a.excecoes) {
    const l = limiteDaTela(x.limite);
    const erro = erroDoLimiteNaTela(l, false);
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
  | {
      ok: true;
      mudancaDaOrigem: MudancaDeOrigem;
      patch: PatchDasConfiguracoes | null;
      distribuicao: PedidoDaDistribuicao | null;
    }
  | { ok: false; erro: string; secao: SecaoDasConfiguracoes; etapa?: string; usuarios?: string[] } {
  const inicial = rascunhoInicial(config);
  if (r.gerais.nome.trim() === "")
    return { ok: false, erro: "Nome é um campo obrigatório!", secao: "gerais" };

  const mudancaDaOrigem: MudancaDeOrigem = {};
  if (r.gerais.nome.trim() !== config.pipeline.name) mudancaDaOrigem.name = r.gerais.nome;
  if (r.gerais.grupo && r.gerais.grupo !== config.pipeline.group_id)
    mudancaDaOrigem.groupId = r.gerais.grupo;

  const patch: PatchDasConfiguracoes = {};
  if (
    r.gerais.moeda !== inicial.gerais.moeda ||
    !igual(r.gerais.tags, inicial.gerais.tags) ||
    r.gerais.visualizacao !== inicial.gerais.visualizacao
  ) {
    patch.gerais = {
      moeda: r.gerais.moeda === config.moedaDaOrganizacao ? null : r.gerais.moeda,
      tags_padrao: r.gerais.tags,
      // Só vai quando a pessoa mexeu: igual à da organização = volta a segui-la (null).
      ...(r.gerais.visualizacao !== inicial.gerais.visualizacao
        ? {
            visualizacao:
              r.gerais.visualizacao === config.visualizacaoDaOrganizacao ? null : r.gerais.visualizacao,
          }
        : {}),
    };
  }
  if (!igual(r.motivos, inicial.motivos)) {
    if (r.motivos.selecionados.length === 0) {
      return {
        ok: false,
        erro: "Para continuar selecione ao menos um motivo de perda.",
        secao: "motivos",
      };
    }
    patch.motivos = { selecionados: r.motivos.selecionados, novos: r.motivos.novos };
  }
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
  if (!igual(r.camposOcultos, inicial.camposOcultos)) {
    patch.campos_visiveis = r.camposOcultos;
  }
  if (!igual(r.alerta, inicial.alerta)) {
    const lido = alertaDaTela(r.alerta);
    if (!lido.ok) {
      // `etapa` só vale com mais de uma exceção: é como a tela diz QUAL falhou.
      const etapa = lido.etapa && r.alerta.excecoes.length > 1 ? lido.etapa : undefined;
      return { ok: false, erro: lido.erro, secao: "alerta", ...(etapa ? { etapa } : {}) };
    }
    patch.alerta = lido.alerta;
  }
  if (!igual(r.permissoes, inicial.permissoes)) {
    patch.permissoes = { pessoas: r.permissoes.pessoas };
  }
  if (!igual(r.atribuicao, inicial.atribuicao)) {
    const lido = patchDaAtribuicao(r.atribuicao);
    if (!lido.ok) return { ok: false, erro: lido.erro, secao: "atribuicao" };
    patch.atribuicao = lido.patch;
  }
  if (!igual(r.notificacoes, inicial.notificacoes)) {
    const erro = erroDasNotificacoes(r.notificacoes);
    if (erro) return { ok: false, erro, secao: "notificacoes" };
    patch.notificacoes = patchDasNotificacoes(r.notificacoes);
  }
  let distribuicao: PedidoDaDistribuicao | null = null;
  if (!igual(r.distribuicao.linhas, inicial.distribuicao.linhas)) {
    const erro = erroDaDistribuicao(r.distribuicao.linhas);
    if (erro) return { ok: false, erro, secao: "distribuicao" };
    distribuicao = pedidoDaDistribuicao(r.distribuicao.linhas, r.distribuicao.reiniciar);
  }
  // Q9 da 1J: a lista de pessoas não pode deixar de fora quem recebe por distribuição.
  if (!igual(r.permissoes, inicial.permissoes) || distribuicao) {
    const fora = distribuidosForaDaLista({
      linhas: r.distribuicao.linhas,
      pessoas: r.permissoes.pessoas,
      pessoasDoGrupo: config.pessoasDoGrupo,
    });
    if (fora.length > 0) {
      return {
        ok: false,
        erro: textoDoBloqueio(fora.length, r.permissoes.pessoas.length === 0),
        secao: "permissoes",
        usuarios: fora,
      };
    }
  }
  return {
    ok: true,
    mudancaDaOrigem,
    patch: Object.keys(patch).length > 0 ? patch : null,
    distribuicao,
  };
}

export function algoMudou(r: RascunhoDaOrigem, config: ConfiguracoesDaOrigem): boolean {
  return !igual(r, rascunhoInicial(config));
}
