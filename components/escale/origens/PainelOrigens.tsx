"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import {
  JanelasDaVisualizacao,
  type JanelaDaVisualizacao,
} from "@/components/escale/visualizacoes/JanelasDaVisualizacao";
import { RodapeDaSelecao } from "@/components/escale/visualizacoes/RodapeDaSelecao";
import { SecaoVisualizacoes, type AcaoDaVisualizacao } from "@/components/escale/visualizacoes/SecaoVisualizacoes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAtualizarVisualizacao } from "@/hooks/escale/useVisualizacoes";
import { useT } from "@/hooks/i18n/useT";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { filtrarArvore, funilDoCaminho, montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import {
  alternarNaSelecao,
  filtrarVisualizacoes,
  ordenarNaArvore,
  origensVivasDaVisualizacao,
  visualizacaoDoCaminho,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";
import { CaretDown, CaretLeft, CaretRight, CaretUp, MagnifyingGlass, Plus, SquaresFour } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { ArquivadosDoPainel } from "./ArquivadosDoPainel";
import { CabecalhoDaSecao } from "./CabecalhoDaSecao";
import { JanelasDeOrigens, type Janela } from "./JanelasDeOrigens";
import {
  BOTAO_DE_ICONE,
  LinhaDaOrigem,
  LinhaDoGrupo,
  type AcaoDaOrigem,
  type AcaoDoGrupo,
  type SelecaoNoPainel,
} from "./LinhasDoPainel";
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
const JANELA_DA_ORIGEM: Record<Exclude<AcaoDaOrigem, "selecionar">, "config-origem" | "arquivar-origem" | "excluir-origem"> = {
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
 * O PAINEL ORIGENS (fork Escale, Fases 1A, 1B e 1C): a coluna da esquerda de
 * Negócios na casca nova, como na Clint. `<` recolhe o painel, `^` recolhe a
 * lista, a seta abre o grupo, o `+` de cima adiciona origem ou grupo, o `+` do
 * grupo cria uma origem dentro dele, e os ⋮ levam às janelas
 * (`JanelasDeOrigens`). Abaixo, a seção irmã Visualizações, com o mesmo
 * cabeçalho em destaque e o seu próprio `^`; o `+` dela e o "Selecionar" dos ⋮
 * entram no modo seleção. Só md+: no celular o quadro segue como sempre.
 *
 * Origens e visualizações vêm do servidor (`ComOrigens`) e são trocadas pelo que
 * cada mutação devolve; quando o servidor manda novidade, o ajuste acontece
 * durante o render (padrão de `app/app/kanban/_client.tsx`). As preferências
 * (painel, lista, visualizações, ocultos) também vêm do servidor, de cookie, e cada mudança é
 * gravada pela Server Action — nenhum `useState` lê o navegador.
 */
export function PainelOrigens({
  origens: doServidor,
  visualizacoes: visualizacoesDoServidor,
  podeGerenciar,
  preferencias,
}: {
  origens: Origens;
  visualizacoes: Visualizacao[];
  podeGerenciar: boolean;
  preferencias: PreferenciasDoPainel;
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
  const [ultimasDoServidor, setUltimasDoServidor] = useState<Visualizacao[]>(visualizacoesDoServidor);
  if (visualizacoesDoServidor !== ultimasDoServidor) {
    setUltimasDoServidor(visualizacoesDoServidor);
    setVisualizacoes(visualizacoesDoServidor);
  }

  const [painelAberto, setPainelAberto] = useState(preferencias.painelAberto);
  const [listaAberta, setListaAberta] = useState(preferencias.listaAberta);
  const [visualizacoesAbertas, setVisualizacoesAbertas] = useState(preferencias.visualizacoesAbertas);
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
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [erroDaSelecao, setErroDaSelecao] = useState<string | null>(null);
  const [janelaDaVisualizacao, setJanelaDaVisualizacao] = useState<JanelaDaVisualizacao | null>(null);
  const atualizarVisualizacao = useAtualizarVisualizacao();

  // O "Negócios" do menu do topo abre o último funil aberto (`/app/escale/negocios`).
  useEffect(() => {
    if (ativo) void guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: ativo });
  }, [ativo]);

  const arvore = useMemo(() => montarOrigens(origens), [origens]);
  const buscando = busca.trim().length > 0;
  const filtrada = buscando ? filtrarArvore(arvore, busca) : arvore;
  const visiveis = verOcultos ? filtrada.grupos : filtrada.grupos.filter((g) => !ocultos.includes(g.id));
  const quantosOcultos = arvore.grupos.filter((g) => ocultos.includes(g.id)).length;
  const nadaAchado = buscando && visiveis.length === 0 && filtrada.semGrupo.length === 0;
  const visualizacoesVisiveis = filtrarVisualizacoes(visualizacoes, busca);

  const noModoSelecao: SelecaoNoPainel | undefined = selecao
    ? {
        marcadas: selecao.marcadas,
        onAlternar: (ids, marcar) =>
          setSelecao((atual) => atual && { ...atual, marcadas: alternarNaSelecao(atual.marcadas, ids, marcar) }),
      }
    : undefined;

  function alternarPainel() {
    const proximo = !painelAberto;
    setPainelAberto(proximo);
    void guardarPreferenciaDeOrigens({ nome: "painel", valor: proximo ? "aberto" : "fechado" });
  }

  function alternarLista() {
    const proximo = !listaAberta;
    setListaAberta(proximo);
    void guardarPreferenciaDeOrigens({ nome: "lista", valor: proximo ? "aberta" : "fechada" });
  }

  function alternarVisualizacoes() {
    const proximo = !visualizacoesAbertas;
    setVisualizacoesAbertas(proximo);
    void guardarPreferenciaDeOrigens({ nome: "visualizacoes", valor: proximo ? "aberta" : "fechada" });
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
    const grupos = origens.funis.filter((f) => ids.includes(f.id)).flatMap((f) => (f.group_id ? [f.group_id] : []));
    setAbertos((atual) => new Set([...atual, ...grupos]));
  }

  function acaoDoGrupo(id: string, acao: AcaoDoGrupo) {
    if (acao === "ocultar") {
      const proximo = ocultos.includes(id) ? ocultos.filter((o) => o !== id) : [...ocultos, id];
      setOcultos(proximo);
      void guardarPreferenciaDeOrigens({ nome: "ocultos", valor: proximo });
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
      if (alvo) selecionar(origensVivasDaVisualizacao(alvo, origens).map((f) => f.id), id);
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

  if (!painelAberto) {
    return (
      <div className="relative hidden w-0 shrink-0 md:block">
        <button
          type="button"
          aria-label={t("Abrir o painel de origens")}
          onClick={alternarPainel}
          className="absolute left-0 top-1 z-10 grid size-6 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
        >
          <CaretRight size={12} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label={t("Origens")}
      className="sticky top-0 hidden max-h-[calc(100dvh-6.5rem)] w-64 shrink-0 flex-col rounded-lg border bg-card md:flex"
    >
      <button
        type="button"
        aria-label={t("Recolher o painel de origens")}
        onClick={alternarPainel}
        className="absolute -right-3 top-2 z-10 grid size-6 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
      >
        <CaretLeft size={12} aria-hidden />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn(!selecao && "border-b")}>
          <CabecalhoDaSecao icone={<SquaresFour size={18} />} titulo={t("Origens")}>
            {podeGerenciar && !selecao && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label={t("Adicionar")} className={BOTAO_DE_ICONE}>
                    <Plus size={15} aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setJanela({ tipo: "adicionar-origem", grupoId: null })}>
                    {t("Adicionar origem")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setJanela({ tipo: "adicionar-grupo" })}>
                    {t("Adicionar grupo de origens")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              type="button"
              aria-label={t("Buscar grupo ou funil")}
              aria-pressed={buscaAberta}
              onClick={() => {
                setBuscaAberta((v) => !v);
                setBusca("");
              }}
              className={BOTAO_DE_ICONE}
            >
              <MagnifyingGlass size={15} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={listaAberta ? t("Recolher a lista de origens") : t("Abrir a lista de origens")}
              aria-expanded={listaAberta}
              onClick={alternarLista}
              className={BOTAO_DE_ICONE}
            >
              {listaAberta ? <CaretUp size={14} aria-hidden /> : <CaretDown size={14} aria-hidden />}
            </button>
          </CabecalhoDaSecao>

          {buscaAberta && (
            <div className="px-3 pb-2">
              <Input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar grupo ou funil")}
                aria-label={t("Buscar grupo ou funil")}
                className="h-8"
              />
            </div>
          )}

          {listaAberta && (
            <div className="px-2 pb-2">
              <nav aria-label={t("Funis por grupo")}>
                <ul className="space-y-0.5">
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
                  <div className="mt-3 space-y-1">
                    <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("Sem grupo")}
                    </p>
                    <ul className="space-y-0.5">
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

              {nadaAchado && <p className="px-2 py-1 text-sm text-muted-foreground">{t("Nada encontrado.")}</p>}

              {quantosOcultos > 0 && (
                <div className="mt-3 flex items-center justify-between px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span>
                    {(quantosOcultos === 1 ? t("{n} grupo oculto") : t("{n} grupos ocultos")).replace(
                      "{n}",
                      String(quantosOcultos),
                    )}
                  </span>
                  <button type="button" onClick={() => setVerOcultos((v) => !v)} className="font-semibold hover:text-foreground">
                    {verOcultos ? t("Esconder") : t("Mostrar")}
                  </button>
                </div>
              )}

              {podeGerenciar && !selecao && <ArquivadosDoPainel arvore={arvore} onOrigens={setOrigens} />}
            </div>
          )}
        </div>

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
  );
}
