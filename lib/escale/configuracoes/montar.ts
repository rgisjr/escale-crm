/**
 * O QUE A JANELA "CONFIGURAÇÕES DA ORIGEM" RECEBE (Fase 1F). Quem decide
 * `podeAdministrar` e `visualizacao` é a rota (sessão de quem pede).
 */
import type { VisibilityMode } from "@/lib/auth/types";
import { pessoasDaOrigem, regraEmVigor } from "@/lib/escale/acesso/regras";
import type { PessoaNaDistribuicao } from "@/lib/escale/distribuicao/regras";
import type { MoedaServida } from "@/lib/money";

import { camposDaOrigem, regrasDaOrigem, type CampoDaOrigem, type RegraDeCampo } from "./campos";
import { catalogoDeMotivos, type MotivoDoCatalogo } from "./motivos";
import { lerConfiguracoesDoFork, type ConfiguracoesDoFork } from "./tipos";

export interface EtapaDaOrigem {
  id: string;
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface ConfiguracoesDaOrigem {
  pipeline: { id: string; name: string; group_id: string | null; is_default: boolean };
  /** As etapas vivas, em ordem (as de ganho e perda incluídas). */
  etapas: EtapaDaOrigem[];
  fork: ConfiguracoesDoFork;
  motivos: MotivoDoCatalogo[];
  campos: CampoDaOrigem[];
  regras: RegraDeCampo[];
  moedaDaOrganizacao: MoedaServida;
  /** A regra EM VIGOR nesta origem (1J): a da origem; sem ela, a da organização. */
  visualizacao: VisibilityMode;
  /** A regra da organização (`organizations.settings.visibility_mode`). */
  visualizacaoDaOrganizacao: VisibilityMode;
  /** A lista do grupo da origem (1J, Q6): se a origem não tem lista, é esta que vale. */
  pessoasDoGrupo: string[];
  podeAdministrar: boolean;
  /** Fase 1K (D13): quem recebe os negócios sem dono, na ordem em que entrou. Vazia para quem não é gerente. */
  distribuicao: PessoaNaDistribuicao[];
  /** A última alteração da distribuição (o botão do relógio). */
  distribuicaoAtualizada: { em: string; autorId: string | null } | null;
}

export function montarConfiguracoes(entrada: {
  pipeline: {
    id: string;
    name: string;
    group_id: string | null;
    is_default: boolean;
    settings: unknown;
  };
  etapas: readonly EtapaDaOrigem[];
  /** O `settings` de todas as origens da organização (o catálogo de motivos). */
  catalogo: readonly unknown[];
  moedaDaOrganizacao: MoedaServida;
  visualizacaoDaOrganizacao: VisibilityMode;
  /** O grupo da origem (a RLS decide se a sessão o vê). */
  grupo: { settings: unknown } | null;
  podeAdministrar: boolean;
  distribuicao: readonly PessoaNaDistribuicao[];
  distribuicaoAtualizada: { em: string; autorId: string | null } | null;
}): ConfiguracoesDaOrigem {
  const { pipeline } = entrada;
  const etapas = [...entrada.etapas].sort((a, b) => a.position - b.position);
  const abertas = etapas.filter((e) => !e.is_won && !e.is_lost).map((e) => e.id);
  return {
    pipeline: {
      id: pipeline.id,
      name: pipeline.name,
      group_id: pipeline.group_id,
      is_default: pipeline.is_default,
    },
    etapas,
    fork: lerConfiguracoesDoFork(pipeline.settings),
    motivos: catalogoDeMotivos(pipeline.settings, entrada.catalogo),
    campos: camposDaOrigem(pipeline.settings),
    regras: regrasDaOrigem(pipeline.settings, abertas),
    moedaDaOrganizacao: entrada.moedaDaOrganizacao,
    visualizacao: regraEmVigor(pipeline.settings, entrada.visualizacaoDaOrganizacao),
    visualizacaoDaOrganizacao: entrada.visualizacaoDaOrganizacao,
    pessoasDoGrupo: pessoasDaOrigem(entrada.grupo?.settings),
    podeAdministrar: entrada.podeAdministrar,
    distribuicao: [...entrada.distribuicao],
    distribuicaoAtualizada: entrada.distribuicaoAtualizada,
  };
}
