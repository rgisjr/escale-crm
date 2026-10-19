"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { colunasDoCelular } from "@/components/inbox/InboxLayout";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useFilaDeConversas } from "@/hooks/escale/useFilaDeConversas";
import { useModoEspiao } from "@/hooks/escale/useModoEspiao";
import { usePreferenciasDeConversas } from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import { isNotFound, useConversation } from "@/hooks/inbox/useConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import { OpenConversationProvider } from "@/hooks/notifications/OpenConversationContext";
import { ORDEM_PADRAO, PARAM_ORDEM, ordemDaUrl, type Ordem } from "@/lib/escale/conversas/ordem";
import {
  PARAM_PRESET,
  PRESET_PADRAO,
  filtrosDoPreset,
  presetDaUrl,
  type FiltrosDaFila,
  type Preset,
} from "@/lib/escale/conversas/presets";
import type { AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { ehVisualizacaoPadrao } from "@/lib/escale/conversas/visualizacao";
import { buscaValeConsulta } from "@/lib/inbox/termo-de-busca";
import { cn } from "@/lib/utils";

import { CentroVazio } from "./centro/CentroVazio";
import { ConversaAberta } from "./centro/ConversaAberta";
import { FaixaDoModoEspiao } from "./centro/FaixaDoModoEspiao";
import { NovaConversa } from "./centro/NovaConversa";
import { BarraDaFila } from "./fila/BarraDaFila";
import { ListaDaFila } from "./fila/ListaDaFila";
import { PainelPersonalizarVisualizacao } from "./fila/PainelPersonalizarVisualizacao";
import { PainelDoContato } from "./painel/PainelDoContato";
import { TopoDasConversas } from "./TopoDasConversas";

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
  configuracao,
}: {
  initialSelectedId?: string | null;
  rascunho?: AvisoDeRascunho | null;
  origens?: OrigemParaCriar[];
  /** FORK ESCALE · Fase 3C: uma tela de configuração no lugar do centro e do painel (a fila fica). */
  configuracao?: ReactNode;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.orgId ?? null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const preset = presetDaUrl(searchParams.get(PARAM_PRESET));
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
  const mudarPreset = useCallback(
    (p: Preset) => mudarNaUrl(PARAM_PRESET, p, PRESET_PADRAO),
    [mudarNaUrl],
  );
  const mudarOrdem = useCallback(
    (o: Ordem) => mudarNaUrl(PARAM_ORDEM, o, ORDEM_PADRAO),
    [mudarNaUrl],
  );

  const filtros: FiltrosDaFila = useMemo(
    () => ({
      ...filtrosDoPreset(preset),
      ...(ordem === "espera" ? { ordem } : {}),
      ...(buscaValeConsulta(busca) ? { search: busca } : {}),
    }),
    [preset, ordem, busca],
  );

  const fila = useFilaDeConversas(filtros, orgId);
  const itens = useMemo(
    () => (fila.data?.pages.flatMap((p) => p.data) ?? []) as ConversationWithContact[],
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
              preset={preset}
              aoMudarPreset={mudarPreset}
              ordem={ordem}
              aoMudarOrdem={mudarOrdem}
              espiao={espiao}
              aoMudarEspiao={mudarEspiao}
              personalizando={personalizando}
              aoPersonalizar={() => setPersonalizando((v) => !v)}
              visualizacaoForaDoPadrao={
                preferencias.data.visualizacao !== undefined &&
                !ehVisualizacaoPadrao(preferencias.data.visualizacao)
              }
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <ListaDaFila
                fila={fila}
                itens={itens}
                fixada={fixada}
                selectedId={selectedId}
                aoSelecionar={selecionar}
                aoSoltarFixada={() => selecionar(null)}
                temFiltro={preset !== PRESET_PADRAO || buscaValeConsulta(busca)}
                aoIniciar={abrirNova}
                visualizacao={preferencias.data.visualizacao}
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
                className={cn("relative h-full min-h-0 min-w-0 flex-col md:flex", colunas.conversa)}
              >
                {espiao ? <FaixaDoModoEspiao aoDesativar={() => mudarEspiao(false)} /> : null}
                {personalizando ? (
                  <PainelPersonalizarVisualizacao
                    visualizacao={preferencias.data.visualizacao}
                    aoFechar={() => setPersonalizando(false)}
                  />
                ) : null}
                <div className="min-h-0 flex-1">
                  {modoDoCentro === "conversa" && conversa ? (
                    <ConversaAberta
                      conversa={conversa}
                      rascunho={rascunho}
                      aoAbrirConversa={selecionar}
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

              <div className="hidden h-full min-h-0 border-l border-casca-borda xl:block">
                <PainelDoContato
                  conversa={conversa}
                  aoAbrirConversa={selecionar}
                  origens={origens}
                />
              </div>
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
            </>
          )}
        </div>
      </div>
    </OpenConversationProvider>
  );
}
