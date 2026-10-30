"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RuleEditor } from "@/app/app/webhooks/_components/RuleEditor";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import {
  useAcoesDasAutomacoes,
  useListaDeAutomacoes,
  useOrganizarAoCriar,
} from "@/hooks/escale/useAutomacoesDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { opcoesDaRegra, type AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import {
  contagensDoTrilho,
  filtrarAutomacoes,
  ordenarAutomacoes,
  paginar,
} from "@/lib/escale/automacoes/regras";
import { ROTA_DA_LISTA_DE_AUTOMACOES, rotaDoFluxoNovo } from "@/lib/escale/automacoes/rotas";
import type { AgenteDaLista, AutomacaoDaLista } from "@/lib/escale/automacoes/tipos";
import { POR_PAGINA } from "@/lib/escale/contatos/regras";

import { BarraDeFerramentas } from "./BarraDeFerramentas";
import { BarraDeLoteDasAutomacoes } from "./BarraDeLoteDasAutomacoes";
import { CabecalhoDasAutomacoes } from "./CabecalhoDasAutomacoes";
import { useEstadoDaLista } from "./estado-da-lista";
import { JanelaCriarAutomacao, type NovaAutomacao } from "./JanelaCriarAutomacao";
import { JanelaRenomearAutomacao } from "./JanelaRenomearAutomacao";
import { avisarResultadoDoLote } from "./resultado-do-lote";
import { TabelaDeAutomacoes } from "./TabelaDeAutomacoes";
import { TrilhoDePastas } from "./TrilhoDePastas";

type EditorAberto = { regra: AutomationRuleRow | null; nomeInicial?: string; pastaId: string | null };

/**
 * A LISTA DE AUTOMAÇÕES DA CASCA (fork Escale, Fase 5A; 07-001 a 07-010, 07-031, 07-032).
 * Lê tudo de uma vez e faz busca, filtros, ordem e página no navegador. O motor não muda.
 */
export function AutomacoesDaCasca({ fuso, editorAberto }: { fuso: string; editorAberto: string | null }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const consulta = useListaDeAutomacoes();
  const acoes = useAcoesDasAutomacoes();
  const organizarAoCriar = useOrganizarAoCriar();
  const lista = consulta.data;
  const pastas = useMemo(() => lista?.pastas ?? [], [lista]);
  const automacoes = useMemo(() => lista?.automacoes ?? [], [lista]);
  const agentesDaOrg = useMemo(() => lista?.agentes ?? [], [lista]);
  const agentesPorId = useMemo(() => new Map<string, AgenteDaLista>(agentesDaOrg.map((a) => [a.id, a])), [agentesDaOrg]);
  const estado = useEstadoDaLista(useMemo(() => pastas.map((p) => p.id), [pastas]));

  const [criando, setCriando] = useState(false);
  const [renomeando, setRenomeando] = useState<AutomacaoDaLista | null>(null);
  const [editor, setEditor] = useState<EditorAberto | null>(null);

  const filtros = { visao: estado.visao, busca: estado.busca, status: estado.status, agentes: estado.agentes };
  const filtradas = useMemo(
    () => filtrarAutomacoes(automacoes, filtros),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filtros` é remontado a cada render; os campos dele são as dependências
    [automacoes, estado.visao, estado.busca, estado.status, estado.agentes],
  );
  const ordenadas = useMemo(() => ordenarAutomacoes(filtradas, estado.ordem), [filtradas, estado.ordem]);
  const { itens, pagina } = paginar(ordenadas, estado.pagina, estado.porPagina);
  const contagens = useMemo(() => contagensDoTrilho(automacoes, pastas), [automacoes, pastas]);
  const vazioPorFiltro =
    filtradas.length === 0 &&
    (estado.status.length > 0 || estado.agentes.length > 0) &&
    filtrarAutomacoes(automacoes, { ...filtros, status: [], agentes: [] }).length > 0;

  // O editor abre da versão do banco, nunca da cópia da lista (como a aba antiga).
  const abrirEditor = useCallback(
    async (id: string) => {
      try {
        const fresca = await qc.fetchQuery(opcoesDaRegra(id));
        setEditor({ regra: fresca.data, pastaId: null });
      } catch (err) {
        showApiError(err);
        if (editorAberto) router.replace(ROTA_DA_LISTA_DE_AUTOMACOES);
      }
    },
    [qc, router, editorAberto],
  );

  const tratado = useRef<string | null>(null);
  useEffect(() => {
    if (editorAberto && tratado.current !== editorAberto) {
      tratado.current = editorAberto;
      void abrirEditor(editorAberto);
    }
  }, [editorAberto, abrirEditor]);

  function fecharEditor() {
    setEditor(null);
    if (editorAberto) router.replace(ROTA_DA_LISTA_DE_AUTOMACOES);
  }

  function criar(nova: NovaAutomacao) {
    setCriando(false);
    if (nova.forma === "fluxo") {
      router.push(rotaDoFluxoNovo({ nome: nova.nome, pastaId: nova.pastaId }));
      return;
    }
    setEditor({ regra: null, nomeInicial: nova.nome, pastaId: nova.pastaId });
  }

  function moverSelecionadas(pastaId: string | null) {
    acoes.moverEmLote.mutate(
      { ids: [...estado.selecionadas], pasta_id: pastaId },
      {
        onSuccess: (r) => {
          avisarResultadoDoLote(t, "movida", r.movidas.length, r.falhas.length);
          estado.limparSelecao();
        },
      },
    );
  }

  function excluirSelecionadas() {
    acoes.excluirEmLote.mutate([...estado.selecionadas], {
      onSuccess: (r) => {
        avisarResultadoDoLote(t, "excluida", r.excluidas.length, r.falhas.length);
        estado.limparSelecao();
      },
    });
  }

  const pastaAberta = estado.visao.tipo === "pasta" ? estado.visao.id : null;
  return (
    <div data-escale-automacoes className="flex h-full min-h-0 flex-col bg-surface">
      <CabecalhoDasAutomacoes aoCriar={() => setCriando(true)} />
      <div className="flex min-h-0 flex-1">
        <TrilhoDePastas
          pastas={pastas}
          contagens={contagens}
          visao={estado.visao}
          carregando={consulta.isLoading}
          aoMudarVisao={estado.setVisao}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <BarraDeFerramentas
            visao={estado.visao}
            pastas={pastas}
            busca={estado.busca}
            aoBuscar={estado.setBusca}
            status={estado.status}
            aoMudarStatus={estado.setStatus}
            agentesDaOrg={agentesDaOrg}
            agentes={estado.agentes}
            aoMudarAgentes={estado.setAgentes}
            total={filtradas.length}
            aoVoltarParaTodas={() => estado.setVisao({ tipo: "todas" })}
          />
          <TabelaDeAutomacoes
            itens={itens}
            carregando={consulta.isLoading}
            erro={consulta.isError}
            vazioPorFiltro={vazioPorFiltro}
            ordem={estado.ordem}
            aoOrdenar={estado.alternarOrdem}
            selecionadas={estado.selecionadas}
            aoSelecionar={estado.alternarSelecao}
            aoSelecionarPagina={estado.selecionarPagina}
            pastas={pastas}
            agentes={agentesPorId}
            fuso={fuso}
            aoEditar={(id) => void abrirEditor(id)}
            aoRenomear={setRenomeando}
            aoCriar={() => setCriando(true)}
            aoLimparFiltros={() => {
              estado.setStatus([]);
              estado.setAgentes([]);
            }}
            aoTentarDeNovo={() => void consulta.refetch()}
          />
          <div className="shrink-0 border-t border-casca-divisoria px-6">
            <PaginacaoDaCasca
              pagina={pagina}
              total={filtradas.length}
              porPagina={estado.porPagina}
              opcoesPorPagina={POR_PAGINA}
              aoMudarPagina={estado.setPagina}
              aoMudarPorPagina={estado.setPorPagina}
            />
          </div>
        </div>
      </div>
      {estado.selecionadas.size > 0 && (
        <BarraDeLoteDasAutomacoes
          quantidade={estado.selecionadas.size}
          pastas={pastas}
          aoLimpar={estado.limparSelecao}
          aoMover={moverSelecionadas}
          aoExcluir={excluirSelecionadas}
          ocupado={acoes.moverEmLote.isPending || acoes.excluirEmLote.isPending}
        />
      )}
      <JanelaCriarAutomacao
        aberta={criando}
        aoFechar={() => setCriando(false)}
        pastas={pastas}
        pastaInicial={pastaAberta}
        aoCriar={criar}
      />
      <JanelaRenomearAutomacao automacao={renomeando} aoFechar={() => setRenomeando(null)} />
      <RuleEditor
        open={editor !== null}
        onOpenChange={(aberto) => {
          if (!aberto) fecharEditor();
        }}
        rule={editor?.regra ?? null}
        nomeInicial={editor?.nomeInicial}
        aoCriar={(regra) => organizarAoCriar(regra.id, { pasta_id: editor?.pastaId ?? null, forma: "editor" })}
        daCasca
      />
    </div>
  );
}
