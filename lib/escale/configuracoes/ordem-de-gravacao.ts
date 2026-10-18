/**
 * A ORDEM DO "SALVAR" DA JANELA (fork Escale, Fase 1K, revisão). As configurações
 * (lista de pessoas) e a distribuição de dono vão por duas rotas, e cada uma
 * confere a sua metade da Q9 da 1J contra o que a OUTRA já gravou:
 *
 * - a rota de configurações recusa uma lista que deixe de fora quem ainda está
 *   na distribuição gravada;
 * - a rota da distribuição recusa quem não está na lista gravada.
 *
 * Então a ordem depende da direção da mudança na distribuição:
 *
 * - SÓ SAI gente (tirou a pessoa da lista e da distribuição): a distribuição
 *   grava primeiro; senão a lista ainda "deixaria de fora" quem está gravado.
 * - SÓ ENTRA gente, ou só mudou percentual: a configuração grava primeiro; senão
 *   a distribuição pediria quem ainda não está na lista.
 * - SAI um e ENTRA outro: nenhuma ordem das duas funciona sozinha (e a
 *   distribuição não pode gravar "só a saída": os percentuais somam 100). A
 *   configuração vai primeiro levando `distribuicao_pendente`, a lista de quem
 *   ficará, e a rota confere contra ela.
 */
import type { PedidoDaDistribuicao } from "@/lib/escale/distribuicao/regras";

import type { PatchDasConfiguracoes } from "./gravar";

export type PassoDoSalvar = "configuracoes" | "distribuicao";

export interface PlanoDeGravacao {
  ordem: readonly PassoDoSalvar[];
  patch: PatchDasConfiguracoes | null;
}

export function planoDeGravacao({
  patch,
  distribuicao,
  distribuidosHoje,
}: {
  patch: PatchDasConfiguracoes | null;
  distribuicao: PedidoDaDistribuicao | null;
  /** Quem está na distribuição gravada. */
  distribuidosHoje: readonly string[];
}): PlanoDeGravacao {
  // Passo sem pedido é no-op nas ações da tela; só a lista de pessoas + a distribuição cruzam.
  if (!patch?.permissoes || !distribuicao) {
    return { ordem: ["configuracoes", "distribuicao"], patch };
  }
  const hoje = new Set(distribuidosHoje.map((u) => u.toLowerCase()));
  const depois = new Set(distribuicao.pessoas.map((p) => p.user_id.toLowerCase()));
  const sairam = [...hoje].some((u) => !depois.has(u));
  const entraram = [...depois].some((u) => !hoje.has(u));
  if (sairam && !entraram) {
    return { ordem: ["distribuicao", "configuracoes"], patch };
  }
  if (sairam && entraram) {
    return {
      ordem: ["configuracoes", "distribuicao"],
      patch: { ...patch, distribuicao_pendente: [...depois] },
    };
  }
  return { ordem: ["configuracoes", "distribuicao"], patch };
}

/** Roda os passos na ordem; um passo que devolve `false` já tratou o erro e para os seguintes. */
export async function gravarNaOrdem(
  ordem: readonly PassoDoSalvar[],
  acoes: Record<PassoDoSalvar, () => Promise<boolean | void>>,
): Promise<boolean> {
  for (const passo of ordem) {
    if ((await acoes[passo]()) === false) return false;
  }
  return true;
}
