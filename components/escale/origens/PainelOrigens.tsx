"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { guardarPreferenciaDeOrigens } from "@/lib/escale/origens/guardar-preferencia";
import {
  JanelasDaVisualizacao,
  type JanelaDaVisualizacao,
} from "@/components/escale/visualizacoes/JanelasDaVisualizacao";
import { RodapeDaSelecao } from "@/components/escale/visualizacoes/RodapeDaSelecao";
import {
  SecaoVisualizacoes,
  type AcaoDaVisualizacao,
} from "@/components/escale/visualizacoes/SecaoVisualizacoes";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAtualizarVisualizacao } from "@/hooks/escale/useVisualizacoes";
import { useT } from "@/hooks/i18n/useT";
import { useAoAbrirConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/abrir";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import {
  filtrarArvore,
  funilDoCaminho,
  montarOrigens,
  type Origens,
} from "@/lib/escale/origens/regras";
import {
  alternarNaSelecao,
  filtrarVisualizacoes,
  ordenarNaArvore,
  origensVivasDaVisualizacao,
  visualizacaoDoCaminho,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FolderPlus,
  LayoutPanelLeft,
  Plus,
  Search,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ArquivadosDoPainel } from "./ArquivadosDoPainel";
import { CabecalhoDaSecao } from "./CabecalhoDaSecao";
import { BOLINHA_DO_PAINEL, BOTAO_DE_ICONE, SO_NO_HOVER } from "./estilos-do-painel";
import { JanelasDeOrigens, type Janela } from "./JanelasDeOrigens";
import {
  LinhaDaOrigem,
  LinhaDoGrupo,
  type AcaoDaOrigem,
  type AcaoDoGrupo,
  type SelecaoNoPainel,
} from "./LinhasDoPainel";
import { ConteudoDoMenu, ItemDoMenu } from "./MenuDoPainel";
import { SecaoRecentes } from "./SecaoRecentes";
import { textoDoErro } from "./texto-do-erro";

const JANELA_DO_GRUPO: Record<
  Exclude<AcaoDoGrupo, "ocultar" | "selecionar">,
  "config-grupo" | "customizar" | "arquivar-grupo" | "excluir-grupo"
> = {
  configurar: "config-grupo",
  customizar: "customizar",
  arquivar: "arquivar-grupo",
  excluir: "excluir-grupo",
};
const JANELA_DA_ORIGEM: Record<
  Exclude<AcaoDaOrigem, "selecionar">,
  "config-origem" | "arquivar-origem" | "excluir-origem"
> = {
  configurar: "config-origem",
  arquivar: "arquivar-origem",
  excluir: "excluir-origem",
};

/**
 * O modo seleção (Fase 1C): caixinhas nas origens e o rodapé "Rascunho".
 * `editando` é a visualização cujas origens estão sendo trocadas; `null` é uma
 * visualização nova.
 */
interface Selecao {
  editando: string | null;
  marcadas: ReadonlySet<string>;
}

/**
 * O PAINEL ORIGENS (fork Escale, Fases 1A, 1B e 1C; visual da Clint na casca V3).
 *
 * É a coluna da esquerda de Negócios na casca nova, igual à Clint (01-010): 250px,
 * branca, do topo ao fundo da tela, com a borda direita #E8E4F5. Peças:
 * - a bolinha "<" fica centrada na borda e recolhe o painel;
 * - 78px abaixo do topo vêm as seções: ORIGENS (lupa, ^ e o "+" de adicionar,
 *   que só aparece no hover) e VISUALIZAÇÕES;
 * - a seta abre o grupo, o "+" do grupo cria uma origem dentro dele, e os ⋮
 *   levam às janelas (`JanelasDeOrigens`);
 * - o "+" das visualizações e o "Selecionar" dos ⋮ entram no modo seleção.
 *
 * RECENTES (Fase 1E) é a terceira seção: fixados e abertos por último, recolhida por padrão.
 *
 * Só md+: no celular o quadro segue como sempre.
 *
 * Origens e visualizações vêm do servidor (`ComOrigens`) e são trocadas pelo que
 * cada mutação devolve. Quando o servidor manda novidade, o ajuste acontece
 * durante o render (padrão de `app/app/kanban/_client.tsx`). As preferências
 * (painel, lista, visualizações, ocultos) também vêm do servidor, de cookie, e
 * cada mudança é gravada por `fetch` num Route Handler (Server Action re-renderizaria a página); nenhum `useState` lê o navegador.
 */
export function PainelOrigens({
  origens: doServidor,
  visualizacoes: visualizacoesDoServidor,
  podeGerenciar,
  preferencias,
  ultimoFunil = null,
  chaveDeRecentes,
}: {
  origens: Origens;
  visualizacoes: Visualizacao[];
  podeGerenciar: boolean;
  preferencias: PreferenciasDoPainel;
  /** O funil que o cookie `escale_ultimo_funil` já guarda: igual ao aberto, não regrava. */
  ultimoFunil?: string | null;
  /** Fase 1E: onde moram os Recentes desta pessoa nesta organização. Ausente = sem a seção. */
  chaveDeRecentes?: string;
}) {
  const t = useT();
  const router = useRouter();
  const caminho = usePathname() ?? "";
  const ativo = funilDoCaminho(caminho);
  const visualizacaoAtiva = visualizacaoDoCaminho(caminho);

  const [origens, setOrigens] = useState<Origens>(doServidor);
  const [ultimoDoServidor, setUltimoDoServidor] = useState<Origens>(doServidor);
  if (doServidor !== ultimoDoServidor) {
    setUltimoDoServidor(doServidor);
    setOrigens(doServidor);
  }
  const [visualizacoes, setVisualizacoes] = useState<Visualizacao[]>(visualizacoesDoServidor);
  const [ultimasDoServidor, setUltimasDoServidor] =
    useState<Visualizacao[]>(visualizacoesDoServidor);
  if (visualizacoesDoServidor !== ultimasDoServidor) {
    setUltimasDoServidor(visualizacoesDoServidor);
    setVisualizacoes(visualizacoesDoServidor);
  }

  const [painelAberto, setPainelAberto] = useState(preferencias.painelAberto);
  const [listaAberta, setListaAberta] = useState(preferencias.listaAberta);
  const [visualizacoesAbertas, setVisualizacoesAbertas] = useState(
    preferencias.visualizacoesAbertas,
  );
  const [recentesAbertos, setRecentesAbertos] = useState(preferencias.recentesAbertos);
  const [ocultos, setOcultos] = useState<string[]>(preferencias.ocultos);
  const [verOcultos, setVerOcultos] = useState(false);
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => {
    const grupoDoAtivo = doServidor.funis.find((f) => f.id === ativo)?.group_id;
    return new Set(grupoDoAtivo ? [grupoDoAtivo] : []);
  });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [janela, setJanela] = useState<Janela | null>(null);
  // Fase 1F (F20): a engrenagem do quadro abre a mesma janela do ⋮ "Configurações".
  useAoAbrirConfiguracoesDaOrigem((id, aba) => setJanela({ tipo: "config-origem", id, aba }));
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [erroDaSelecao, setErroDaSelecao] = useState<string | null>(null);
  const [janelaDaVisualizacao, setJanelaDaVisualizacao] = useState<JanelaDaVisualizacao | null>(
    null,
  );
  const atualizarVisualizacao = useAtualizarVisualizacao();

  // O "Negócios" do menu do topo abre o último funil aberto (`/app/escale/negocios`).
  // Só grava quando muda: o valor do cookie veio do servidor (`ultimoFunil`).
  const funilGravado = useRef(ultimoFunil);
  useEffect(() => {
    if (!ativo || ativo === funilGravado.current) return;
    funilGravado.current = ativo;
    guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: ativo });
  }, [ativo]);

  const arvore = useMemo(() => montarOrigens(origens), [origens]);
  const buscando = busca.trim().length > 0;
  const filtrada = buscando ? filtrarArvore(arvore, busca) : arvore;
  const visiveis = verOcultos
    ? filtrada.grupos
    : filtrada.grupos.filter((g) => !ocultos.includes(g.id));
  const quantosOcultos = arvore.grupos.filter((g) => ocultos.includes(g.id)).length;
  const nadaAchado = buscando && visiveis.length === 0 && filtrada.semGrupo.length === 0;
  const visualizacoesVisiveis = filtrarVisualizacoes(visualizacoes, busca);

  const noModoSelecao: SelecaoNoPainel | undefined = selecao
    ? {
        marcadas: selecao.marcadas,
        onAlternar: (ids, marcar) =>
          setSelecao(
            (atual) =>
              atual && { ...atual, marcadas: alternarNaSelecao(atual.marcadas, ids, marcar) },
          ),
      }
    : undefined;

  function alternarPainel() {
    const proximo = !painelAberto;
    setPainelAberto(proximo);
    guardarPreferenciaDeOrigens({ nome: "painel", valor: proximo ? "aberto" : "fechado" });
  }

  function alternarLista() {
    const proximo = !listaAberta;
    setListaAberta(proximo);
    guardarPreferenciaDeOrigens({ nome: "lista", valor: proximo ? "aberta" : "fechada" });
  }

  function alternarVisualizacoes() {
    const proximo = !visualizacoesAbertas;
    setVisualizacoesAbertas(proximo);
    guardarPreferenciaDeOrigens({
      nome: "visualizacoes",
      valor: proximo ? "aberta" : "fechada",
    });
  }

  function alternarRecentes() {
    const proximo = !recentesAbertos;
    setRecentesAbertos(proximo);
    guardarPreferenciaDeOrigens({ nome: "recentes", valor: proximo ? "aberta" : "fechada" });
  }

  function alternarGrupo(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  /** Entra no modo seleção já com `ids` marcadas, abrindo os grupos delas. */
  function selecionar(ids: string[], editando: string | null) {
    setErroDaSelecao(null);
    setSelecao({ editando, marcadas: new Set(ids) });
    // Sem a lista aberta o modo seleção seria invisível; não grava a preferência.
    setListaAberta(true);
    const grupos = origens.funis
      .filter((f) => ids.includes(f.id))
      .flatMap((f) => (f.group_id ? [f.group_id] : []));
    setAbertos((atual) => new Set([...atual, ...grupos]));
  }

  function acaoDoGrupo(id: string, acao: AcaoDoGrupo) {
    if (acao === "ocultar") {
      const proximo = ocultos.includes(id) ? ocultos.filter((o) => o !== id) : [...ocultos, id];
      setOcultos(proximo);
      guardarPreferenciaDeOrigens({ nome: "ocultos", valor: proximo });
      return;
    }
    if (acao === "selecionar") {
      selecionar(arvore.grupos.find((g) => g.id === id)?.funis.map((f) => f.id) ?? [], null);
      setAbertos((atual) => new Set([...atual, id]));
      return;
    }
    setJanela({ tipo: JANELA_DO_GRUPO[acao], id });
  }

  function acaoDaOrigem(id: string, acao: AcaoDaOrigem) {
    if (acao === "selecionar") {
      selecionar([id], null);
      return;
    }
    setJanela({ tipo: JANELA_DA_ORIGEM[acao], id });
  }

  function acaoDaVisualizacao(id: string, acao: AcaoDaVisualizacao) {
    if (acao === "editar-origens") {
      const alvo = visualizacoes.find((v) => v.id === id);
      if (alvo)
        selecionar(
          origensVivasDaVisualizacao(alvo, origens).map((f) => f.id),
          id,
        );
      return;
    }
    setJanelaDaVisualizacao({ tipo: acao, id });
  }

  function abrirOrigem(id: string) {
    router.push(`/app/pipelines/${id}`);
  }

  function abrirVisualizacao(id: string) {
    router.push(`/app/pipelines/visualizacoes/${id}`);
  }

  function salvarSelecao() {
    if (!selecao) return;
    // A ordem das colunas é a ordem do painel, não a ordem dos cliques.
    const ids = ordenarNaArvore(selecao.marcadas, arvore);
    if (selecao.editando === null) {
      setJanelaDaVisualizacao({ tipo: "nova", origens: ids });
      return;
    }
    const id = selecao.editando;
    atualizarVisualizacao.mutate(
      { id, mudanca: { origens: ids } },
      {
        onSuccess: (lista) => {
          setVisualizacoes(lista);
          setSelecao(null);
          abrirVisualizacao(id);
        },
        onError: (err) => setErroDaSelecao(textoDoErro(err, t)),
      },
    );
  }

  // Recolhido: a Clint não mostra este estado (item 8 de "Prints que faltam").
  // Fica a mesma bolinha, no topo da borda esquerda, para reabrir.
  if (!painelAberto) {
    return (
      <div className="relative hidden w-0 shrink-0 md:block">
        <button
          type="button"
          aria-label={t("Abrir o painel de origens")}
          onClick={alternarPainel}
          className={cn(BOLINHA_DO_PAINEL, "left-2")}
        >
          <ChevronRight size={12} aria-hidden />
        </button>
        {/* A engrenagem do quadro abre a janela mesmo com o painel recolhido. */}
        {podeGerenciar && (
          <TooltipProvider delayDuration={300}>
            <JanelasDeOrigens
              janela={janela}
              origens={origens}
              onFechar={() => setJanela(null)}
              onOrigens={setOrigens}
              onAbrirOrigem={abrirOrigem}
            />
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label={t("Origens")}
        className="sticky top-0 hidden h-[calc(100dvh-2.75rem)] w-[250px] shrink-0 flex-col border-r border-casca-borda bg-surface md:flex"
      >
        <button
          type="button"
          aria-label={t("Recolher o painel de origens")}
          onClick={alternarPainel}
          className={cn(BOLINHA_DO_PAINEL, "-right-[10px]")}
        >
          <ChevronLeft size={12} aria-hidden />
        </button>

        <div data-rolagem-do-painel="" className="min-h-0 flex-1 overflow-y-auto pt-[78px]">
          <CabecalhoDaSecao
            icone={<LayoutPanelLeft size={16} className="-scale-x-100" />}
            titulo={t("Origens")}
          >
            {podeGerenciar && !selecao && (
              <span className={cn(SO_NO_HOVER, "group-hover/cabecalho:opacity-100")}>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={t("Adicionar")} className={BOTAO_DE_ICONE}>
                      <Plus size={16} aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <ConteudoDoMenu side="bottom" align="end">
                    <ItemDoMenu
                      icone={Plus}
                      onSelect={() => setJanela({ tipo: "adicionar-origem", grupoId: null })}
                    >
                      {t("Adicionar origem")}
                    </ItemDoMenu>
                    <ItemDoMenu
                      icone={FolderPlus}
                      onSelect={() => setJanela({ tipo: "adicionar-grupo" })}
                    >
                      {t("Adicionar grupo de origens")}
                    </ItemDoMenu>
                  </ConteudoDoMenu>
                </DropdownMenu>
              </span>
            )}
            <button
              type="button"
              aria-label={t("Buscar grupo ou funil")}
              aria-pressed={buscaAberta}
              onClick={() => {
                setBuscaAberta((v) => !v);
                setBusca("");
              }}
              className={cn(BOTAO_DE_ICONE, buscaAberta && "text-casca-marca")}
            >
              <Search size={16} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={
                listaAberta ? t("Recolher a lista de origens") : t("Abrir a lista de origens")
              }
              aria-expanded={listaAberta}
              onClick={alternarLista}
              className={cn(BOTAO_DE_ICONE, "text-casca-meta")}
            >
              {listaAberta ? (
                <ChevronUp size={16} aria-hidden />
              ) : (
                <ChevronDown size={16} aria-hidden />
              )}
            </button>
          </CabecalhoDaSecao>

          {buscaAberta && (
            <div className="border-b border-casca-borda px-4 py-2">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar origens, grupos, visualizações…")}
                aria-label={t("Buscar grupo ou funil")}
                className="h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-1 focus:ring-casca-marca"
              />
            </div>
          )}

          {listaAberta && (
            <div>
              <nav aria-label={t("Funis por grupo")}>
                <ul>
                  {visiveis.map((g) => (
                    <LinhaDoGrupo
                      key={g.id}
                      grupo={g}
                      aberto={buscando || abertos.has(g.id) || novoEm === g.id}
                      oculto={ocultos.includes(g.id)}
                      ativo={ativo}
                      podeGerenciar={podeGerenciar}
                      criandoAqui={novoEm === g.id}
                      selecao={noModoSelecao}
                      onAlternar={() => alternarGrupo(g.id)}
                      onNovaOrigem={() => setNovoEm(g.id)}
                      onAcao={(a) => acaoDoGrupo(g.id, a)}
                      onAcaoDaOrigem={acaoDaOrigem}
                      onCriada={(novas, id) => {
                        setOrigens(novas);
                        setNovoEm(null);
                        abrirOrigem(id);
                      }}
                      onCancelarCriacao={() => setNovoEm(null)}
                    />
                  ))}
                </ul>
                {filtrada.semGrupo.length > 0 && (
                  <div>
                    <p className="flex h-8 items-center px-4 text-[11px] font-semibold text-casca-suave uppercase">
                      {t("Sem grupo")}
                    </p>
                    <ul>
                      {filtrada.semGrupo.map((f) => (
                        <LinhaDaOrigem
                          key={f.id}
                          funil={f}
                          ativo={ativo}
                          podeGerenciar={podeGerenciar}
                          recuo={false}
                          selecao={noModoSelecao}
                          onAcao={(a) => acaoDaOrigem(f.id, a)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </nav>

              {nadaAchado && (
                <p className="flex h-[34px] items-center px-4 text-xs text-casca-suave">
                  {t("Nada encontrado.")}
                </p>
              )}

              {quantosOcultos > 0 && (
                <div className="flex h-8 items-center justify-between px-4 text-[11px] text-casca-suave uppercase">
                  <span>
                    {(quantosOcultos === 1
                      ? t("{n} grupo oculto")
                      : t("{n} grupos ocultos")
                    ).replace("{n}", String(quantosOcultos))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerOcultos((v) => !v)}
                    className="font-semibold hover:text-casca-texto"
                  >
                    {verOcultos ? t("Esconder") : t("Mostrar")}
                  </button>
                </div>
              )}

              {podeGerenciar && !selecao && (
                <ArquivadosDoPainel arvore={arvore} onOrigens={setOrigens} />
              )}
            </div>
          )}

          {!selecao && (
            <SecaoVisualizacoes
              visualizacoes={visualizacoesVisiveis}
              origens={origens}
              ativa={visualizacaoAtiva}
              aberta={visualizacoesAbertas}
              podeGerenciar={podeGerenciar}
              onAlternar={alternarVisualizacoes}
              onCriar={() => selecionar([], null)}
              onAcao={acaoDaVisualizacao}
            />
          )}

          {/* Fase 1E: RECENTES (01-010, terceira seção), recolhida por padrão como na Clint. */}
          {!selecao && chaveDeRecentes && (
            <SecaoRecentes
              chave={chaveDeRecentes}
              aberta={recentesAbertos}
              onAlternar={alternarRecentes}
            />
          )}
        </div>

        {selecao && (
          <RodapeDaSelecao
            quantas={selecao.marcadas.size}
            editando={selecao.editando !== null}
            salvando={atualizarVisualizacao.isPending}
            erro={erroDaSelecao}
            onCancelar={() => setSelecao(null)}
            onSalvar={salvarSelecao}
          />
        )}

        {podeGerenciar && (
          <JanelasDeOrigens
            janela={janela}
            origens={origens}
            onFechar={() => setJanela(null)}
            onOrigens={setOrigens}
            onAbrirOrigem={abrirOrigem}
          />
        )}
        {podeGerenciar && (
          <JanelasDaVisualizacao
            janela={janelaDaVisualizacao}
            visualizacoes={visualizacoes}
            onFechar={() => setJanelaDaVisualizacao(null)}
            onVisualizacoes={setVisualizacoes}
            onCriada={(id) => {
              setSelecao(null);
              abrirVisualizacao(id);
            }}
            onExcluida={(id) => {
              if (visualizacaoAtiva === id) router.push("/app/escale/negocios");
            }}
          />
        )}
      </aside>
    </TooltipProvider>
  );
}
