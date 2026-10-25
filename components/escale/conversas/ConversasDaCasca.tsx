"use client";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { colunasDoCelular } from "@/components/inbox/InboxLayout";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useAcaoDaFila, useExecutarAcaoDaFila } from "@/hooks/escale/useAcoesEmMassaDaFila";
import { useFilaDeConversas } from "@/hooks/escale/useFilaDeConversas";
import { useModoEspiao } from "@/hooks/escale/useModoEspiao";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { usePreferenciasDeConversas } from "@/hooks/escale/usePreferenciasDeConversas";
import { useValorComAtraso } from "@/hooks/escale/useValorComAtraso";
import { useTemGruposNaFila } from "@/hooks/escale/useTemGruposNaFila";
import { useTotalDaFila } from "@/hooks/escale/useTotalDaFila";
import { useT } from "@/hooks/i18n/useT";
import { isNotFound, useConversation } from "@/hooks/inbox/useConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { recarregarListasDasConversas } from "@/hooks/inbox/recargaDasConversas";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import { OpenConversationProvider } from "@/hooks/notifications/OpenConversationContext";
import { ORDEM_PADRAO, PARAM_ORDEM, ordemDaUrl, type Ordem } from "@/lib/escale/conversas/ordem";
import { OPCOES_VAZIAS, type OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { SEM_SELECAO, totalSelecionado, type Selecao } from "@/lib/escale/contatos/selecao";
import {
  acaoRodando,
  alvoDaSelecaoDaFila,
  type PedidoDaFila,
} from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import {
  PARAM_DO_PAINEL,
  painelDaUrl,
  paramsDoPainel,
  temCriterios,
  type FiltrosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";
import { PARAM_PRESET } from "@/lib/escale/conversas/presets";
import type { AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { ehVisualizacaoPadrao } from "@/lib/escale/conversas/visualizacao";
import { buscaValeConsulta } from "@/lib/inbox/termo-de-busca";
import { useTelaExtraGrande } from "@/lib/escale/usa-tela-grande";
import { cn } from "@/lib/utils";

import { CentroVazio } from "./centro/CentroVazio";
import { ConversaAberta } from "./centro/ConversaAberta";
import { FaixaDoModoEspiao } from "./centro/FaixaDoModoEspiao";
import { NovaConversa } from "./centro/NovaConversa";
import { BarraDaFila } from "./fila/BarraDaFila";
import { ListaDaFila } from "./fila/ListaDaFila";
import { PainelPersonalizarVisualizacao } from "./fila/PainelPersonalizarVisualizacao";
import { BalaoSalvarFiltro } from "./filtros/BalaoSalvarFiltro";
import { PainelDeFiltrosDaFila } from "./filtros/PainelDeFiltrosDaFila";
import { CentroDeAcoesEmMassa, type AcaoEscolhida } from "./massa/CentroDeAcoesEmMassa";
import { JanelaDaAcaoEmMassa } from "./massa/JanelaDaAcaoEmMassa";
import { PainelDoContato } from "./painel/PainelDoContato";
import { TopoDasConversas } from "./TopoDasConversas";

/** "Concluída" não quer dizer "tudo certo": conversa arquivada ou revisão em conflito contam como falha (B1-3). */
function avisarFimDaAcao(total: number, falhas: number, t: (texto: string) => string): void {
  if (falhas <= 0) {
    toast.success(t("A ação em massa foi realizada com sucesso!"));
    return;
  }
  toast.warning(
    t("A ação em massa terminou, mas {n} de {total} conversas não foram alteradas.")
      .replace("{n}", String(falhas))
      .replace("{total}", String(total)),
  );
}

/** A recarga do tempo real troca só a 1ª página: uma conversa que subiu pode ainda estar numa página velha. */
function itensSemRepeticao(linhas: unknown[]): ConversationWithContact[] {
  const vistos = new Set<string>();
  return (linhas as ConversationWithContact[]).filter(
    (c) => !vistos.has(c.id) && !!vistos.add(c.id),
  );
}

export type ModoDoCentro = "conversa" | "vazio" | "nova";

/**
 * A TELA DE CONVERSAS DA CASCA (fork Escale, Fase 3A; A1–A13, A15, D1–D11).
 *
 * Três colunas fixas (320 | 1fr | 384, c01), a fila com os presets da Clint
 * sobre a rota do original, o centro (vazio, sem canal, nova conversa ou a
 * conversa aberta) e o painel direito. O preset (`?v=`) e a ordem (`?o=`)
 * vivem na URL; a conversa aberta em `?id=`, como no original; a busca e o
 * "Personalizar visualização" são estado da tela; o modo espião é da sessão.
 */
export function ConversasDaCasca({
  initialSelectedId = null,
  rascunho = null,
  origens = [],
  opcoesDoFiltro = OPCOES_VAZIAS,
  configuracao,
}: {
  initialSelectedId?: string | null;
  rascunho?: AvisoDeRascunho | null;
  origens?: OrigemParaCriar[];
  /** FORK ESCALE · Fase 3D: as origens, etapas e motivos do painel de filtros. */
  opcoesDoFiltro?: OpcoesDoFiltro;
  /** FORK ESCALE · Fase 3C: uma tela de configuração no lugar do centro e do painel (a fila fica). */
  configuracao?: ReactNode;
}) {
  const t = useT();
  const telaXl = useTelaExtraGrande();
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.orgId ?? null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const painel = useMemo(() => painelDaUrl(searchParams), [searchParams]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const ordem = ordemDaUrl(searchParams.get(PARAM_ORDEM));
  const idNaUrl = searchParams.get("id");
  const [busca, setBusca] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? idNaUrl);
  const [modo, setModo] = useState<Exclude<ModoDoCentro, "conversa">>("vazio");
  const [personalizando, setPersonalizando] = useState(false);
  const [fichaAberta, setFichaAberta] = useState(false);
  const [espiao, mudarEspiao] = useModoEspiao();
  const ultimoIdNaUrl = useRef(idNaUrl);

  // O histórico do navegador também troca a conversa, sem recarregar a página.
  useEffect(() => {
    if (ultimoIdNaUrl.current === idNaUrl) return;
    ultimoIdNaUrl.current = idNaUrl;
    setSelectedId(idNaUrl);
  }, [idNaUrl]);

  const mudarNaUrl = useCallback(
    (chave: string, valor: string | null, padrao: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor && valor !== padrao) params.set(chave, valor);
      else params.delete(chave);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const mudarPainel = useCallback(
    (f: FiltrosDoPainel) => {
      const { v, f: texto } = paramsDoPainel(f);
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set(PARAM_PRESET, v);
      else params.delete(PARAM_PRESET);
      if (texto) params.set(PARAM_DO_PAINEL, texto);
      else params.delete(PARAM_DO_PAINEL);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const mudarOrdem = useCallback(
    (o: Ordem) => mudarNaUrl(PARAM_ORDEM, o, ORDEM_PADRAO),
    [mudarNaUrl],
  );

  const buscaAtrasada = useValorComAtraso(busca);
  const consulta = useMemo(
    () => ({
      painel,
      ordem,
      ...(buscaValeConsulta(buscaAtrasada) ? { busca: buscaAtrasada } : {}),
    }),
    [painel, ordem, buscaAtrasada],
  );
  const fila = useFilaDeConversas(consulta, orgId);
  const temGrupos = useTemGruposNaFila(orgId).data === true;
  const permissoes = useMinhasPermissoes();
  const podeSelecionar = permissoes.CHAT_BULK_ACTIONS === true;
  const qc = useQueryClient();
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [acaoEscolhida, setAcaoEscolhida] = useState<AcaoEscolhida | null>(null);
  const [acaoAcompanhada, setAcaoAcompanhada] = useState<string | null>(null);
  const total = useTotalDaFila(consulta, selecao !== null).data ?? null;
  const executar = useExecutarAcaoDaFila();
  const acompanhada = useAcaoDaFila(acaoAcompanhada);

  // N15: o fim da ação em segundo plano avisa e atualiza a fila.
  useEffect(() => {
    const a = acompanhada.data;
    if (!a || acaoRodando(a.status)) return;
    setAcaoAcompanhada(null);
    recarregarListasDasConversas(qc);
    void qc.invalidateQueries({ queryKey: ["fila-total"] });
    if (a.status === "concluida") avisarFimDaAcao(a.total, a.falhas, t);
    else toast.error(t("Ocorreu um erro ao executar a ação em massa!"));
  }, [acompanhada.data, qc, t]);

  const sairDaSelecao = useCallback(() => {
    setSelecao(null);
    setAcaoEscolhida(null);
  }, []);

  function rodarAcao(parametros: Record<string, unknown>) {
    if (!selecao || !acaoEscolhida) return;
    const pedido = {
      acao: acaoEscolhida,
      alvo: alvoDaSelecaoDaFila(selecao, { painel, busca: consulta.busca }),
      parametros,
    } as PedidoDaFila;
    executar.mutate(pedido, {
      onSuccess: (r) => {
        recarregarListasDasConversas(qc);
        void qc.invalidateQueries({ queryKey: ["fila-total"] });
        if (r.status === "concluida") {
          avisarFimDaAcao(r.total, r.falhas ?? 0, t);
        } else {
          toast.info(
            t(
              "Essa ação em massa pode demorar alguns segundos para ser completada e refletir os resultados da pesquisa.",
            ),
          );
          setAcaoAcompanhada(r.id);
        }
        sairDaSelecao();
      },
      onError: (e) =>
        toast.error(
          e instanceof Error ? e.message : t("Ocorreu um erro ao executar a ação em massa!"),
        ),
    });
  }
  const itens = useMemo(
    () => itensSemRepeticao(fila.data?.pages.flatMap((p) => p.data) ?? []),
    [fila.data],
  );
  const naLista = useMemo(
    () => itens.find((c) => c.id === selectedId) ?? null,
    [itens, selectedId],
  );
  const precisaBuscar = !!selectedId && !naLista;
  const unica = useConversation(selectedId, precisaBuscar);
  const conversa: ConversationWithContact | null = naLista ?? unica.data ?? null;
  const naoEncontrada = precisaBuscar && !unica.isPending && !unica.data && isNotFound(unica.error);
  // A15: a conversa aberta que não casa com o filtro fica fixada no topo.
  const fixada = !fila.isLoading && !naLista && unica.data ? unica.data : null;

  const canais = useChannelSessions();
  const semCanal = !canais.isLoading && (canais.data ?? []).length === 0;
  const preferencias = usePreferenciasDeConversas();

  // A9: no modo espião, abrir a conversa não zera o contador.
  // FORK ESCALE · Fase 3B (N6): "Marcar como não lida" vale até trocar de conversa.
  const [naoLidaManual, setNaoLidaManual] = useState<string | null>(null);
  useMarkAsRead(
    espiao || naoLidaManual === conversa?.id ? null : (conversa?.id ?? null),
    conversa?.unread_count_for_assignee ?? 0,
  );

  const selecionar = useCallback(
    (id: string | null) => {
      if (configuracao && id) {
        router.push(`/app/inbox?id=${id}`);
        return;
      }
      setSelectedId(id);
      setNaoLidaManual(null);
      if (id) setModo("vazio");
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      params.delete("rascunho");
      const query = params.toString();
      window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams, configuracao, router],
  );
  const abrirNova = useCallback(() => {
    setPersonalizando(false);
    setModo("nova");
    selecionar(null);
  }, [selecionar]);

  const modoDoCentro: ModoDoCentro = conversa ? "conversa" : modo;
  const colunas = colunasDoCelular(Boolean(selectedId));

  return (
    <OpenConversationProvider conversationId={selectedId}>
      {/* As dicas do "?" (AjudaDaCasca) no painel, na Nova conversa e nas
          Configurações pedem um TooltipProvider acima; a página não tem outro. */}
      <TooltipProvider delayDuration={150}>
        <div
          className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] w-full flex-col"
          data-realtime-status={fila.realtimeStatus}
        >
          <TopoDasConversas aoNovaConversa={abrirNova} novaAberta={modoDoCentro === "nova"} />
          <div
            className={cn(
              "grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]",
              !configuracao && "xl:grid-cols-[320px_minmax(0,1fr)_384px]",
            )}
          >
            <div
              className={cn(
                "h-full min-h-0 flex-col border-r border-casca-borda md:flex",
                configuracao ? "hidden" : colunas.lista,
              )}
            >
              <BarraDaFila
                busca={busca}
                aoBuscar={setBusca}
                painel={painel}
                aoMudarPainel={mudarPainel}
                filtrosAbertos={filtrosAbertos}
                aoAlternarFiltros={() => {
                  setPersonalizando(false);
                  setFiltrosAbertos((v) => !v);
                }}
                aoCriarFiltro={() => {
                  setPersonalizando(false);
                  setFiltrosAbertos(true);
                }}
                temGrupos={temGrupos}
                ordem={ordem}
                aoMudarOrdem={mudarOrdem}
                espiao={espiao}
                aoMudarEspiao={mudarEspiao}
                personalizando={personalizando}
                aoPersonalizar={() => {
                  setFiltrosAbertos(false);
                  setPersonalizando((v) => !v);
                }}
                visualizacaoForaDoPadrao={
                  preferencias.data.visualizacao !== undefined &&
                  !ehVisualizacaoPadrao(preferencias.data.visualizacao)
                }
                podeSelecionar={podeSelecionar}
                aoSelecionar={() => {
                  setFiltrosAbertos(false);
                  setPersonalizando(false);
                  setSelecao(SEM_SELECAO);
                }}
              />
              <div className="min-h-0 flex-1 overflow-hidden">
                <ListaDaFila
                  fila={fila}
                  itens={itens}
                  fixada={fixada}
                  selectedId={selectedId}
                  aoSelecionar={selecionar}
                  aoSoltarFixada={() => selecionar(null)}
                  temFiltro={temCriterios(painel) || buscaValeConsulta(busca)}
                  aoIniciar={abrirNova}
                  visualizacao={preferencias.data.visualizacao}
                  selecao={selecao}
                  aoMudarSelecao={setSelecao}
                  total={total}
                  aoSairDaSelecao={sairDaSelecao}
                />
              </div>
            </div>

            {configuracao ? (
              <div className="h-full min-h-0 min-w-0" data-testid="area-de-configuracao">
                {configuracao}
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "relative h-full min-h-0 min-w-0 flex-col md:flex",
                    colunas.conversa,
                  )}
                >
                  {espiao ? <FaixaDoModoEspiao aoDesativar={() => mudarEspiao(false)} /> : null}
                  {personalizando ? (
                    <PainelPersonalizarVisualizacao
                      visualizacao={preferencias.data.visualizacao}
                      aoFechar={() => setPersonalizando(false)}
                    />
                  ) : null}
                  {filtrosAbertos ? (
                    <PainelDeFiltrosDaFila
                      painel={painel}
                      aoMudar={mudarPainel}
                      aoFechar={() => setFiltrosAbertos(false)}
                      opcoes={opcoesDoFiltro}
                      temGrupos={temGrupos}
                      cabecalho={<BalaoSalvarFiltro painel={painel} />}
                    />
                  ) : null}
                  <div className="min-h-0 flex-1">
                    {selecao ? (
                      <CentroDeAcoesEmMassa
                        selecionadas={totalSelecionado(selecao, total ?? itens.length)}
                        aoEscolher={setAcaoEscolhida}
                        aoSair={sairDaSelecao}
                      />
                    ) : modoDoCentro === "conversa" && conversa ? (
                      <ConversaAberta
                        conversa={conversa}
                        rascunho={rascunho}
                        aoAbrirConversa={selecionar}
                        aoIniciarConversa={abrirNova}
                        aoAbrirFicha={() => setFichaAberta(true)}
                        aoMudarNaoLida={setNaoLidaManual}
                      />
                    ) : modoDoCentro === "nova" ? (
                      <NovaConversa
                        aoAbrirConversa={selecionar}
                        aoCancelar={() => setModo("vazio")}
                        origens={origens}
                      />
                    ) : naoEncontrada ? (
                      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-casca-suave">
                        {t("Conversa não encontrada ou fora do seu acesso.")}
                      </div>
                    ) : (
                      <CentroVazio semCanal={semCanal} aoIniciar={abrirNova} />
                    )}
                  </div>
                </div>

                <JanelaDaAcaoEmMassa
                  acao={acaoEscolhida}
                  aoFechar={() => setAcaoEscolhida(null)}
                  aoExecutar={rodarAcao}
                  executando={executar.isPending}
                />

                {/* Uma instância só da ficha: montar a coluna E o Sheet (G1-4) dobrava as consultas abaixo de 1280 px. */}
                {telaXl ? (
                  <div className="h-full min-h-0 border-l border-casca-borda">
                    <PainelDoContato
                      conversa={conversa}
                      aoAbrirConversa={selecionar}
                      origens={origens}
                    />
                  </div>
                ) : (
                  <Sheet open={fichaAberta} onOpenChange={setFichaAberta}>
                    <SheetContent side="right" className="w-[min(24rem,90vw)] overflow-y-auto p-0">
                      <SheetTitle className="sr-only">{t("Ficha do contato")}</SheetTitle>
                      <PainelDoContato
                        conversa={conversa}
                        aoAbrirConversa={selecionar}
                        origens={origens}
                      />
                    </SheetContent>
                  </Sheet>
                )}
              </>
            )}
          </div>
        </div>
      </TooltipProvider>
    </OpenConversationProvider>
  );
}
