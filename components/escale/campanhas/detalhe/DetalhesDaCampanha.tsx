"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { FaixaDaSelecao } from "@/components/escale/contatos/massa/FaixaDaSelecao";
import {
  JanelaCriarNegocios,
  type NovoNegocioEmMassa,
} from "@/components/escale/contatos/massa/JanelaCriarNegocios";
import { avisoNaFila } from "@/components/escale/contatos/massa/textosDasAcoes";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import {
  useDestinatariosDaCampanha,
  useMassaDaCampanha,
} from "@/hooks/escale/useDetalheDaCampanha";
import { useSelecaoDaLista } from "@/hooks/escale/useSelecaoDaLista";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  CHAVE_DAS_COLUNAS,
  POR_PAGINA_DOS_DESTINATARIOS,
  POR_PAGINA_PADRAO_DOS_DESTINATARIOS,
  colunasDoTexto,
  podeTirarDaLista,
  textoDoIntervalo,
  textoDoTotal,
  type ColunaDosDestinatarios,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_SITUACAO,
  temFiltroDeDestinatarios,
  textoDosFiltrosDeDestinatarios,
  type FiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import {
  alvoDaSelecaoDaCampanha,
  type PedidoDaCampanha,
  type RespostaDaMassa,
} from "@/lib/escale/campanhas/detalhe/massa";
import { textoDoMotivo } from "@/lib/escale/campanhas/detalhe/motivos";
import type {
  InfoDaCampanha,
  MotivoDoErro,
  SumarioDaCampanha,
} from "@/lib/escale/campanhas/detalhe/tipos";
import { ESPERA_DA_BUSCA_MS } from "@/lib/escale/campanhas/filtros";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import { Search, X } from "@/lib/ui/icons-da-casca";

import { BarraDaSelecaoDaCampanha } from "./BarraDaSelecaoDaCampanha";
import { PainelDeColunasDosDestinatarios } from "./PainelDeColunasDosDestinatarios";
import { PainelDeFiltrosDosDestinatarios } from "./PainelDeFiltrosDosDestinatarios";
import { TabelaDeDestinatarios } from "./TabelaDeDestinatarios";

function lerColunas(): ColunaDosDestinatarios[] {
  try {
    return colunasDoTexto(window.localStorage.getItem(CHAVE_DAS_COLUNAS));
  } catch {
    return colunasDoTexto(null);
  }
}

function gravarColunas(colunas: readonly ColunaDosDestinatarios[]): void {
  try {
    window.localStorage.setItem(CHAVE_DAS_COLUNAS, JSON.stringify(colunas));
  } catch {
    // Sem armazenamento (janela privada): a escolha vale só nesta visita.
  }
}

/**
 * A ABA DETALHES (012, 013; C11, C12): a busca (500 ms), os filtros e os chips,
 * a contagem e as colunas; a tabela com a seleção da 2B; a barra das ações em
 * massa; o rodapé "1 a 20 de 30 contatos" com a paginação de 20.
 */
export function DetalhesDaCampanha({
  campanha,
  sumario,
  motivos,
  filtros,
  aoMudarFiltros,
  origens,
  fuso,
}: {
  campanha: InfoDaCampanha;
  sumario: SumarioDaCampanha;
  motivos: readonly MotivoDoErro[];
  filtros: FiltrosDeDestinatarios;
  aoMudarFiltros: (f: FiltrosDeDestinatarios) => void;
  origens: OrigemParaCriar[];
  fuso?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busca, setBusca] = useState(filtros.busca ?? "");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO_DOS_DESTINATARIOS);
  const [colunas, setColunas] = useState<ColunaDosDestinatarios[]>(lerColunas);
  const [criandoNegocio, setCriandoNegocio] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const andando = campanha.status === "running" || campanha.status === "preparing";
  const consulta = useDestinatariosDaCampanha(
    campanha.id,
    filtros,
    pagina,
    porPagina,
    true,
    andando,
  );
  const massa = useMassaDaCampanha(campanha.id);
  const linhas = consulta.data?.linhas ?? [];
  const total = consulta.data?.total ?? 0;
  const chaveDaConsulta = textoDosFiltrosDeDestinatarios(filtros);
  const selecao = useSelecaoDaLista({
    linhas,
    total,
    primeiro: (pagina - 1) * porPagina,
    chaveDaConsulta,
  });

  // A busca espera a pessoa parar de digitar (8A: 500 ms) e volta à página 1.
  useEffect(() => {
    const termo = busca.trim();
    if (termo === (filtros.busca ?? "")) return;
    const espera = setTimeout(() => {
      const { busca: _antiga, ...resto } = filtros;
      aoMudarFiltros(termo ? { ...resto, busca: termo } : resto);
      setPagina(1);
    }, ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [busca, filtros, aoMudarFiltros]);

  const mudarColunas = (c: ColunaDosDestinatarios[]) => {
    setColunas(c);
    gravarColunas(c);
  };

  async function pedir(pedido: PedidoDaCampanha): Promise<RespostaDaMassa | null> {
    try {
      return await massa.mutateAsync(pedido);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : t("Não consegui completar essa ação. Tente de novo."),
      );
      return null;
    }
  }

  const alvo = () => alvoDaSelecaoDaCampanha(selecao.selecao, filtros);

  async function aplicarTag(acao: "incluir_tag" | "remover_tag", tag: string): Promise<boolean> {
    const r = await pedir({ acao, alvo: alvo(), parametros: { tag } });
    if (r?.tipo !== "acao_em_massa") return false;
    const aviso = avisoNaFila(t, acao, r.total, r.status as never);
    if (aviso) toast.success(aviso);
    selecao.limpar();
    return true;
  }

  async function criarNegocios(novo: NovoNegocioEmMassa) {
    const r = await pedir({ acao: "criar_negocios", alvo: alvo(), parametros: novo });
    if (r?.tipo !== "acao_em_massa") return;
    const aviso = avisoNaFila(t, "criar_negocios", r.total, r.status as never);
    if (aviso) toast.success(aviso);
    setCriandoNegocio(false);
    selecao.limpar();
  }

  async function criarCampanha() {
    const r = await pedir({ acao: "nova_campanha", alvo: alvo() });
    if (r?.tipo !== "campanha") return;
    toast.success(t("A campanha foi criada como rascunho."));
    router.push(rotaDoRascunho(r.id));
  }

  async function tirarDaLista() {
    const r = await pedir({ acao: "tirar_da_lista", alvo: alvo() });
    setConfirmandoExclusao(false);
    if (r?.tipo !== "lista") return;
    toast.success(t("{n} contatos tirados da lista.").replace("{n}", numeroBr(r.tirados)));
    selecao.limpar();
  }

  const chips = [
    ...(filtros.situacoes ?? []).map((s) => ({
      chave: `s:${s}`,
      rotulo: t(ROTULO_DO_FILTRO_DE_SITUACAO[s]),
      tirar: () => {
        const situacoes = (filtros.situacoes ?? []).filter((x) => x !== s);
        const { situacoes: _s, ...resto } = filtros;
        aoMudarFiltros(situacoes.length ? { ...resto, situacoes } : resto);
      },
    })),
    ...(filtros.motivos ?? []).map((m) => ({
      chave: `m:${m}`,
      rotulo: textoDoMotivo(m, t),
      tirar: () => {
        const restantes = (filtros.motivos ?? []).filter((x) => x !== m);
        const { motivos: _m, ...resto } = filtros;
        aoMudarFiltros(restantes.length ? { ...resto, motivos: restantes } : resto);
      },
    })),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-8 py-4">
        <label className="relative w-[240px]">
          <span className="sr-only">{t("Buscar contato")}</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar contato")}
            className="h-8 w-full rounded-casca-gatilho border-0 bg-casca-busca pr-8 pl-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-2 right-2.5 text-casca-suave"
          />
        </label>
        <PainelDeFiltrosDosDestinatarios
          filtros={filtros}
          motivos={motivos}
          aoAplicar={(f) => {
            aoMudarFiltros(f);
            setPagina(1);
          }}
        />
        {chips.map((c) => (
          <span
            key={c.chave}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-casca-marca-suave pr-1 pl-2.5 text-[12px] text-casca-marca"
          >
            <span className="max-w-[200px] truncate">{c.rotulo}</span>
            <button
              type="button"
              aria-label={`${t("Remover filtro")} ${c.rotulo}`}
              onClick={c.tirar}
              className="grid size-5 place-items-center rounded-full hover:bg-surface"
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          <span className="text-[13px] text-casca-texto">{textoDoTotal(total, t)}</span>
          <PainelDeColunasDosDestinatarios visiveis={colunas} aoMudar={mudarColunas} />
        </span>
      </div>
      <FaixaDaSelecao
        modo={selecao.modoDaFaixa}
        naPagina={linhas.length}
        total={total}
        aoSelecionarTodos={selecao.selecionarTodos}
        aoLimpar={selecao.limpar}
        rotuloDeTodos={t("Selecionar todos os {total} contatos filtrados").replace(
          "{total}",
          numeroBr(total),
        )}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-8">
        <TabelaDeDestinatarios
          linhas={linhas}
          colunas={colunas}
          carregando={consulta.isLoading}
          erro={consulta.isError}
          filtrando={temFiltroDeDestinatarios(filtros)}
          aguardando={campanha.status === "draft" || campanha.status === "preparing"}
          estadoDaPagina={selecao.estado}
          marcada={selecao.marcada}
          aoAlternar={selecao.alternar}
          aoMarcarPagina={selecao.marcarPagina}
          fuso={fuso}
          aoLimparFiltros={() => {
            setBusca("");
            aoMudarFiltros({});
            setPagina(1);
          }}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      </div>
      <footer className="shrink-0 border-t border-casca-divisoria px-8">
        <PaginacaoDaCasca
          pagina={pagina}
          total={total}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA_DOS_DESTINATARIOS}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={(n) => {
            setPorPagina(n);
            setPagina(1);
          }}
          legenda={textoDoIntervalo(pagina, porPagina, total, t)}
        />
      </footer>
      {selecao.quantidade > 0 ? (
        <BarraDaSelecaoDaCampanha
          quantidade={selecao.quantidade}
          podeTirar={podeTirarDaLista(campanha.status, sumario.enviados)}
          ocupado={massa.isPending}
          aoAplicarTag={aplicarTag}
          aoCriarNegocio={() => setCriandoNegocio(true)}
          aoCriarCampanha={() => void criarCampanha()}
          aoExcluir={() => setConfirmandoExclusao(true)}
          aoLimpar={selecao.limpar}
        />
      ) : null}
      <JanelaCriarNegocios
        aberta={criandoNegocio}
        quantidade={selecao.quantidade}
        origens={origens}
        enviando={massa.isPending}
        aoFechar={() => setCriandoNegocio(false)}
        aoConfirmar={(novo) => void criarNegocios(novo)}
      />
      <JanelaDeConfirmacao
        aberta={confirmandoExclusao}
        aoFechar={() => setConfirmandoExclusao(false)}
        titulo={t("Excluir selecionados")}
        rotuloDoConfirmar={t("Tirar da lista")}
        perigo
        ocupado={massa.isPending}
        aoConfirmar={() => void tirarDaLista()}
      >
        {t(
          "Os contatos selecionados saem desta campanha e não recebem a mensagem. Deseja continuar?",
        )}
      </JanelaDeConfirmacao>
    </div>
  );
}
