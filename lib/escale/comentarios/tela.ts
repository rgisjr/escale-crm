import {
  ID_DO_GATILHO,
  telaDoGatilho,
  type Desenho,
  type RegraGravada,
  type TelaDoGatilho,
} from "@/lib/automation/desenho-da-regra";
import {
  GATILHO_DE_MENSAGEM_ENVIADA,
  configInicialDaMensagemEnviada,
  lerConfigDaMensagemEnviada,
} from "@/lib/automation/mensagem-enviada";

import {
  GATILHO_DE_COMENTARIO,
  GATILHOS_DE_DIRECT,
  ID_DO_CAMINHO_UNICO,
  TEXTO_PADRAO_DE_QUEM_NAO_SEGUE,
  TEXTO_PADRAO_DO_LIBERAR,
  TITULO_PADRAO_DO_LIBERAR,
  type GatilhoDeDirect,
} from "./constantes";
import { lerFiltro } from "./filtro";
import {
  configDoComentarioSchema,
  configDoDirectSchema,
  type CaminhoDoGatilho,
  type ConfigDoComentario,
  type ConfigDoDirect,
  type FiltroDoCaminho,
  type ProximaDoComentario,
  type PublicacaoDoCaminho,
  type PublicoDoComentario,
} from "./schema";

/** FORK ESCALE · Fase 10B: as puras da casca para o gatilho de comentário. */
export function configInicialDoComentario(): ConfigDoComentario {
  return {
    channel_session_id: "",
    escopo: "todos",
    caminhos: [
      { id: ID_DO_CAMINHO_UNICO, publicacoes: [], filtro: { modo: "qualquer" }, resposta: null, ocultar_depois: false, curtir: false },
    ],
    publico: null,
    repeticao: { modo: "uma_vez" },
    proxima: null,
  };
}

/** FORK ESCALE · Fase 10D: a configuração de um gatilho de direct recém-escolhido. */
export function configInicialDoDirect(_evento: GatilhoDeDirect): ConfigDoDirect {
  return { channel_session_id: "", filtro: { modo: "qualquer" } };
}

const ehGatilhoDeDirect = (evento: string): evento is GatilhoDeDirect =>
  (GATILHOS_DE_DIRECT as readonly string[]).includes(evento);

/** D11: arma a "Próxima publicação" com as publicações que a conta já tem (as "conhecidas"). */
export function armarProxima(publicacoes: readonly { id: string }[], agora: Date): ProximaDoComentario {
  return { armada_em: agora.toISOString(), conhecidas: publicacoes.map((p) => p.id).slice(0, 50), resolvida: null };
}

/** D12/D13: o público que aparece na primeira escolha fora de "Todos". */
export function publicoPadrao(): PublicoDoComentario {
  return {
    quem: "seguidores",
    quando_nao_informado: "enviar",
    liberar: {
      texto: TEXTO_PADRAO_DO_LIBERAR,
      titulo: TITULO_PADRAO_DO_LIBERAR,
      texto_de_quem_nao_segue: TEXTO_PADRAO_DE_QUEM_NAO_SEGUE,
    },
  };
}

/** D3: a tela sempre salva o filtro no formato novo (`condicoes`); o comportamento não muda. */
export function filtroComCondicoes(filtro: FiltroDoCaminho): FiltroDoCaminho {
  const lido = lerFiltro(filtro);
  if (lido.modo === "qualquer") return { modo: "qualquer" };
  return { modo: "palavras", condicoes: lido.condicoes, combinar: lido.combinar };
}

/** A tela de um gatilho recém-escolhido: a padrão do motor e, no de comentário, a configuração inicial. */
export function telaInicialDoGatilho(evento: string): TelaDoGatilho {
  const base = telaDoGatilho(null);
  if (evento === GATILHO_DE_COMENTARIO) return { ...base, configPropria: configInicialDoComentario() };
  if (ehGatilhoDeDirect(evento)) return { ...base, configPropria: configInicialDoDirect(evento) };
  // FORK ESCALE · automações: "Equipe envia uma mensagem" monta a configuração inteira, como o direct.
  if (evento === GATILHO_DE_MENSAGEM_ENVIADA) return { ...base, configPropria: configInicialDaMensagemEnviada() };
  return base;
}

/** Ao abrir uma regra: põe o `trigger_config` gravado em `tela.configPropria` do nó do gatilho de comentário. */
export function comConfigPropria(desenho: Desenho, regra: RegraGravada | null): Desenho {
  if (!regra) return desenho;
  let config: Record<string, unknown>;
  if (regra.trigger_event === GATILHO_DE_COMENTARIO) {
    const lida = configDoComentarioSchema.safeParse(regra.trigger_config);
    config = lida.success ? lida.data : configInicialDoComentario();
  } else if (ehGatilhoDeDirect(regra.trigger_event)) {
    const lida = configDoDirectSchema.safeParse(regra.trigger_config);
    config = lida.success ? lida.data : configInicialDoDirect(regra.trigger_event);
  } else if (regra.trigger_event === GATILHO_DE_MENSAGEM_ENVIADA) {
    // A regra antiga (`palavra_chave`) abre convertida; salvar grava o formato novo, que o motor lê igual.
    config = lerConfigDaMensagemEnviada(regra.trigger_config) ?? configInicialDaMensagemEnviada();
  } else {
    return desenho;
  }
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
