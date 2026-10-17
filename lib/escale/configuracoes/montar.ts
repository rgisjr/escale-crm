/**
 * O QUE A JANELA "CONFIGURAÇÕES DA ORIGEM" RECEBE (Fase 1F). Quem decide
 * `podeAdministrar` e `visualizacao` é a rota (sessão de quem pede).
 */
import type { VisibilityMode } from "@/lib/auth/types";
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
  /** A regra de quem vê os negócios que vale hoje (da organização; por origem chega na 1J). */
  visualizacao: VisibilityMode;
  podeAdministrar: boolean;
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
  visualizacao: VisibilityMode;
  podeAdministrar: boolean;
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
    visualizacao: entrada.visualizacao,
    podeAdministrar: entrada.podeAdministrar,
  };
}
