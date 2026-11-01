import {
  ID_DO_GATILHO,
  telaDoGatilho,
  type Desenho,
  type RegraGravada,
  type TelaDoGatilho,
} from "@/lib/automation/desenho-da-regra";

import { GATILHO_DE_COMENTARIO, ID_DO_CAMINHO_UNICO } from "./constantes";
import {
  configDoComentarioSchema,
  type CaminhoDoGatilho,
  type ConfigDoComentario,
  type PublicacaoDoCaminho,
} from "./schema";

/** FORK ESCALE · Fase 10B: as puras da casca para o gatilho de comentário. */
export function configInicialDoComentario(): ConfigDoComentario {
  return {
    channel_session_id: "",
    escopo: "todos",
    caminhos: [{ id: ID_DO_CAMINHO_UNICO, publicacoes: [], filtro: { modo: "qualquer" }, resposta: null }],
  };
}

/** A tela de um gatilho recém-escolhido: a padrão do motor e, no de comentário, a configuração inicial. */
export function telaInicialDoGatilho(evento: string): TelaDoGatilho {
  const base = telaDoGatilho(null);
  return evento === GATILHO_DE_COMENTARIO ? { ...base, configPropria: configInicialDoComentario() } : base;
}

/** Ao abrir uma regra: põe o `trigger_config` gravado em `tela.configPropria` do nó do gatilho de comentário. */
export function comConfigPropria(desenho: Desenho, regra: RegraGravada | null): Desenho {
  if (regra?.trigger_event !== GATILHO_DE_COMENTARIO) return desenho;
  const lida = configDoComentarioSchema.safeParse(regra.trigger_config);
  const config = lida.success ? lida.data : configInicialDoComentario();
  return {
    ...desenho,
    caixas: desenho.caixas.map((caixa) =>
      caixa.id === ID_DO_GATILHO && caixa.data.kind === "gatilho"
        ? { ...caixa, data: { ...caixa.data, tela: { ...caixa.data.tela, configPropria: config } } }
        : caixa,
    ),
  };
}

/** "{n} publicações · {m} caminhos no fluxo" (D2), para o resumo do painel. */
export function resumoDosCaminhos(config: ConfigDoComentario): { publicacoes: number; caminhos: number } {
  return {
    publicacoes: config.caminhos.reduce((total, c) => total + c.publicacoes.length, 0),
    caminhos: config.caminhos.length,
  };
}

/** Um caminho novo por publicação, ou um só com todas (agrupar). Ids `caminho-1`, `caminho-2`… sem repetir os que existem. */
export function caminhosDasPublicacoes(
  existentes: readonly CaminhoDoGatilho[],
  novas: readonly PublicacaoDoCaminho[],
  agrupar: boolean,
): CaminhoDoGatilho[] {
  const usados = new Set(existentes.map((c) => c.id));
  let proximo = 1;
  const novoId = (): string => {
    while (usados.has(`caminho-${proximo}`)) proximo += 1;
    const id = `caminho-${proximo}`;
    usados.add(id);
    return id;
  };
  const caminho = (publicacoes: PublicacaoDoCaminho[]): CaminhoDoGatilho => ({
    id: novoId(),
    publicacoes,
    filtro: { modo: "qualquer" },
    resposta: null,
  });
  if (novas.length === 0) return [...existentes];
  const criados = agrupar ? [caminho([...novas])] : novas.map((p) => caminho([p]));
  return [...existentes, ...criados];
}
