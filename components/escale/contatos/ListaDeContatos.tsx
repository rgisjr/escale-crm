"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover } from "@/components/ui/popover";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useColunasDaLista, useSalvarColunasDaLista } from "@/hooks/escale/useColunasDaLista";
import { useAcompanharAcoes } from "@/hooks/escale/useAcompanharAcoes";
import { useContatoAberto } from "@/hooks/escale/useContatoAberto";
import { useEstadoDaListaDeContatos } from "@/hooks/escale/useEstadoDaListaDeContatos";
import {
  useCriarFiltroDaLista,
  useExcluirFiltroDaLista,
  useFiltrosDaLista,
  useMudarFiltroDaLista,
} from "@/hooks/escale/useFiltrosDaLista";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useSelecaoDaLista } from "@/hooks/escale/useSelecaoDaLista";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK, type Role } from "@/lib/auth/types";
import {
  chipsDosFiltros,
  filtrosParaUrl,
  mesmosFiltros,
  temFiltros,
  type SecaoDoFiltro,
} from "@/lib/escale/contatos/filtros";
import { OPCOES_VAZIAS, type OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  CHAVE_DO_POR_PAGINA,
  COLUNAS_NATIVAS,
  COLUNAS_PADRAO,
  POR_PAGINA,
  POR_PAGINA_PADRAO,
  ROTULO_DA_COLUNA,
  camposDeColuna,
} from "@/lib/escale/contatos/regras";
import { alvoDaSelecao } from "@/lib/escale/contatos/selecao";
import { Bookmark, RefreshCw, Search } from "@/lib/ui/icons-da-casca";

import type { OrigemParaCriar } from "./CamposDaOportunidade";
import { BalaoDoFiltro } from "./filtros/BalaoDoFiltro";
import { ControleDosFiltros } from "./filtros/ControleDosFiltros";
import { FaixaDeFiltros } from "./filtros/FaixaDeFiltros";
import { PainelDeFiltros } from "./filtros/PainelDeFiltros";
import { SeletorDeFiltros } from "./filtros/SeletorDeFiltros";
import { JanelaDoContato, type ContatoParaNegocio } from "./ficha/JanelaDoContato";
import { JanelaNovoNegocio } from "./JanelaNovoNegocio";
import { MenuNovoContato } from "./MenuNovoContato";
import { PainelDeColunas } from "./PainelDeColunas";
import { AcoesEmMassa } from "./massa/AcoesEmMassa";
import { FaixaDaSelecao } from "./massa/FaixaDaSelecao";
import { MenuDaSelecao } from "./massa/MenuDaSelecao";
import { PainelDeExportacoes } from "./massa/PainelDeExportacoes";
import { SeloDeMescla } from "./SeloDeMescla";
import { TabelaDeContatos } from "./TabelaDeContatos";

const CHAVE_DA_FAIXA = "escale:contatos:faixa-de-filtros";

function lerPorPagina(): number {
  try {
    const n = Number(window.localStorage.getItem(CHAVE_DO_POR_PAGINA));
    return (POR_PAGINA as readonly number[]).includes(n) ? n : POR_PAGINA_PADRAO;
  } catch {
    return POR_PAGINA_PADRAO;
  }
}

/** A faixa nasce recolhida, como na Clint (`contacts-list:filter-bar-collapsed`). */
function lerFaixaAberta(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_DA_FAIXA) === "aberta";
  } catch {
    return false;
  }
}

const mensagemDoErro = (e: unknown, padrao: string) =>
  e instanceof Error && e.message ? e.message : padrao;

/**
 * A LISTA DE CONTATOS DA CASCA (fork Escale, Fases 2A e 2B; capturas 03-001,
 * 03-002 e os prints 2b-01 a 2b-26): cabeçalho, barra (busca, filtros prontos e
 * salvos, "Filtros" + ⇕), a faixa de chips, a tabela e o rodapé. Com a faixa
 * aberta, o "Filtros" + ⇕ sai da barra, como na Clint. Busca, visão, página,
 * filtro e filtro salvo na URL; o "N por página" e a faixa no navegador.
 */
export function ListaDeContatos({
  origens,
  papel,
  opcoesDoFiltro = OPCOES_VAZIAS,
}: {
  origens: OrigemParaCriar[];
  papel: Role;
  opcoesDoFiltro?: OpcoesDoFiltro;
}) {
  const t = useT();
  const { catalogo: catalogoDoContato } = useCatalogoDeCampos("contato");
  const camposDoContato = useMemo(() => camposDeColuna(catalogoDoContato), [catalogoDoContato]);
  const {
    visao,
    pagina,
    busca: buscaDaUrl,
    filtros,
    f,
    filtroSalvoId,
    irPara,
    mudarFiltros,
  } = useEstadoDaListaDeContatos();
  const [busca, setBusca] = useState(buscaDaUrl);
  const [porPagina, setPorPagina] = useState(POR_PAGINA_PADRAO);
  const [faixaAberta, setFaixaAberta] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [foco, setFoco] = useState<SecaoDoFiltro | null>(null);
  const [novoNegocio, setNovoNegocio] = useState<ContatoParaNegocio | null>(null);
  // FORK ESCALE · Fase 2E: o contato aberto por cima da lista e a mescla (Task 10).
  const contatoAberto = useContatoAberto();
  const [mescla, setMescla] = useState<{ aberta: boolean; contatoInicial?: string }>({ aberta: false });
  const [girando, setGirando] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o navegador só é lido depois de montar (SSR)
    setPorPagina(lerPorPagina());
    setFaixaAberta(lerFaixaAberta());
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== buscaDaUrl) irPara({ q: busca.trim() || null, p: null });
    }, 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a busca digitada dispara
  }, [busca]);

  const consulta = useListaDeContatos({ q: buscaDaUrl, v: visao, p: pagina, n: porPagina, f });
  const colunas = useColunasDaLista("contatos");
  const salvarColunas = useSalvarColunasDaLista("contatos");
  const salvos = useFiltrosDaLista("contatos");
  const criarFiltro = useCriarFiltroDaLista("contatos");
  const mudarFiltro = useMudarFiltroDaLista("contatos");
  const excluirFiltro = useExcluirFiltroDaLista("contatos");
  const dados = consulta.data;

  useEffect(() => {
    if (dados && dados.linhas.length === 0 && pagina > 1) irPara({ p: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volta à primeira quando a página esvazia (Clint)
  }, [dados, pagina]);

  const podeCriar = ROLE_RANK[papel] >= ROLE_RANK.agent;
  const podeExcluir = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const podeMesclar = ROLE_RANK[papel] >= ROLE_RANK.manager;
  // FORK ESCALE · Fase 2B: selecionar e agir em massa é de gerente ou acima (PRD §5).
  const podeSelecionar = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const total = dados?.total ?? 0;
  const comFiltro = temFiltros(filtros);
  const salvoAtivo = (salvos.data ?? []).find((s) => s.id === filtroSalvoId) ?? null;
  const batendoComSalvo = salvoAtivo !== null && mesmosFiltros(salvoAtivo.criterios, filtros);
  const quantos = chipsDosFiltros(filtros).length;
  const falhou = t("Não consegui completar essa ação. Tente de novo.");
  const linhas = dados?.linhas ?? [];
  const sel = useSelecaoDaLista({
    linhas,
    total,
    primeiro: (pagina - 1) * porPagina,
    chaveDaConsulta: JSON.stringify([buscaDaUrl, visao, f]),
  });
  const acompanhamento = useAcompanharAcoes();

  const mudarPorPagina = (n: number) => {
    setPorPagina(n);
    try {
      window.localStorage.setItem(CHAVE_DO_POR_PAGINA, String(n));
    } catch {
      // o navegador pode recusar; o tamanho vale só nesta visita
    }
    irPara({ p: null });
  };

  const alternarFaixa = () => {
    const nova = !faixaAberta;
    setFaixaAberta(nova);
    try {
      window.localStorage.setItem(CHAVE_DA_FAIXA, nova ? "aberta" : "recolhida");
    } catch {
      // o navegador pode recusar; a faixa vale só nesta visita
    }
  };

  const abrirPainel = (s: SecaoDoFiltro | null) => {
    setFoco(s);
    setPainelAberto(true);
  };
  const resetar = () => irPara({ f: null, fs: null, v: null, p: null });

  async function salvarFiltro(nome: string, compartilhado: boolean): Promise<string | null> {
    try {
      const r = await criarFiltro.mutateAsync({ nome, compartilhado, criterios: filtros });
      irPara({ fs: r.id });
      return null;
    } catch (e) {
      return mensagemDoErro(e, falhou);
    }
  }

  const rodapeDoPainel = (
    <div className="flex h-[44px] shrink-0 items-center justify-end gap-2 border-t border-casca-borda px-4">
      {comFiltro && !batendoComSalvo ? (
        <BalaoDoFiltro
          aoSalvar={salvarFiltro}
          gatilho={
            <BotaoDaCasca type="button" variante="texto" tamanho="sm">
              <Bookmark size={14} aria-hidden />
              {t("Salvar filtro")}
            </BotaoDaCasca>
          }
        />
      ) : null}
      {comFiltro ? (
        <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={resetar}>
          {t("Resetar")}
        </BotaoDaCasca>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col bg-surface md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      <header className="flex h-[50px] shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
        <h1 className="text-[16px] font-medium text-casca-texto">{t("Contatos")}</h1>
        <div className="flex items-center gap-4">
          {podeMesclar && <SeloDeMescla />}
          {/* FORK ESCALE · Fase 2B (Q4): minhas exportações e, para o admin, os pedidos para aprovar. */}
          {podeSelecionar && <PainelDeExportacoes ehAdmin={papel === "admin"} />}
          <MenuNovoContato origens={origens} podeCriar={podeCriar} podeImportar={ROLE_RANK[papel] >= ROLE_RANK.manager} />
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-3 border-b border-casca-borda px-6 py-3">
        <label className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por contato ou Empresa")}
            aria-label={t("Buscar por contato ou Empresa")}
            className="w-full bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={15} aria-hidden className="shrink-0 text-casca-suave" />
        </label>
        <SeletorDeFiltros
          visao={visao}
          filtros={filtros}
          filtroSalvoId={filtroSalvoId}
          salvos={salvos.data ?? []}
          aoEscolherVisao={(v) =>
            irPara({ v: v === "todos" ? null : v, f: null, fs: null, p: null })
          }
          aoAplicarSalvo={(s) =>
            irPara({ f: filtrosParaUrl(s.criterios), fs: s.id, v: null, p: null })
          }
          aoCriarFiltro={() => abrirPainel(null)}
          aoRenomear={async (id, nome) => {
            try {
              await mudarFiltro.mutateAsync({ id, nome });
              return null;
            } catch (e) {
              return mensagemDoErro(e, falhou);
            }
          }}
          aoCompartilhar={(id, compartilhado) =>
            mudarFiltro.mutate(
              { id, compartilhado },
              { onError: (e) => toast.error(mensagemDoErro(e, falhou)) },
            )
          }
          aoExcluir={(id) =>
            excluirFiltro.mutate(id, {
              onSuccess: () => {
                if (id === filtroSalvoId) irPara({ fs: null });
              },
              onError: (e) => toast.error(mensagemDoErro(e, falhou)),
            })
          }
        />
        <Popover
          open={painelAberto}
          onOpenChange={(aberto) => {
            setPainelAberto(aberto);
            if (!aberto) setFoco(null);
          }}
        >
          {/* Faixa recolhida: "Filtros" (gatilho) + ⇕. Aberta: só a âncora do painel (prints 2b-24 a 2b-26). */}
          <ControleDosFiltros
            faixaAberta={faixaAberta}
            quantos={quantos}
            aoAlternarFaixa={alternarFaixa}
          />
          <PainelSuspenso align="start" sideOffset={8} className="w-auto p-0">
            <PainelDeFiltros
              filtros={filtros}
              aoMudar={(novos) => mudarFiltros(novos, filtroSalvoId)}
              opcoes={opcoesDoFiltro}
              foco={foco}
              aoMudarFoco={setFoco}
              rodape={rodapeDoPainel}
            />
          </PainelSuspenso>
        </Popover>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[14px] text-casca-suave">
            <span className="mr-1 font-semibold text-casca-texto">{total}</span>
            {total === 1 ? t("contato") : t("contatos")}
          </span>
          <button
            type="button"
            title={t("Atualizar")}
            aria-label={t("Atualizar")}
            onClick={() => {
              setGirando(true);
              void consulta.refetch().finally(() => setGirando(false));
            }}
            className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          >
            <RefreshCw size={17} aria-hidden className={girando ? "animate-spin" : ""} />
          </button>
          <PainelDeColunas
            itens={colunas.itens}
            aoMudar={(itens) => salvarColunas.mutate(itens)}
            nativas={COLUNAS_NATIVAS.map((c) => ({ chave: c, rotulo: ROTULO_DA_COLUNA[c] }))}
            campos={camposDoContato}
            tituloDosCampos={t("Campos do contato")}
            padrao={COLUNAS_PADRAO}
          />
        </div>
      </div>

      {faixaAberta ? (
        <FaixaDeFiltros
          filtros={filtros}
          opcoes={opcoesDoFiltro}
          aoMudar={(novos) => mudarFiltros(novos, filtroSalvoId)}
          aoAbrir={abrirPainel}
          podeResetar={comFiltro || visao !== "todos"}
          aoResetar={resetar}
          aoRecolher={alternarFaixa}
        />
      ) : null}

      <FaixaDaSelecao
        modo={sel.modoDaFaixa}
        naPagina={linhas.length}
        total={total}
        aoSelecionarTodos={sel.selecionarTodos}
        aoLimpar={sel.limpar}
      />

      <div className="min-h-0 flex-1 overflow-auto px-6">
        <TabelaDeContatos
          linhas={linhas}
          colunas={colunas.itens}
          camposDoContato={camposDoContato}
          carregando={consulta.isLoading}
          erro={consulta.isError}
          aoTentarDeNovo={() => void consulta.refetch()}
          podeVerNegocios={podeCriar}
          podeExcluir={podeExcluir}
          aoAdicionarNegocio={setNovoNegocio}
          aoAbrirContato={contatoAberto.abrir}
          cabecalhoDaSelecao={
            <MenuDaSelecao
              estado={sel.estado}
              podeSelecionar={podeSelecionar}
              total={total}
              naPagina={linhas.length}
              aoMarcarPagina={sel.marcarPagina}
              aoSelecionarTodos={sel.selecionarTodos}
              aoSelecionarQuantidade={sel.selecionarQuantidade}
            />
          }
          selecao={{ podeSelecionar, marcada: sel.marcada, aoAlternar: sel.alternar }}
        />
      </div>

      <footer className="shrink-0 border-t border-casca-borda px-6">
        <PaginacaoDaCasca
          pagina={pagina}
          total={total}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA}
          aoMudarPagina={(p) => irPara({ p: p === 1 ? null : String(p) })}
          aoMudarPorPagina={mudarPorPagina}
        />
      </footer>

      {podeSelecionar && sel.quantidade > 0 ? (
        <AcoesEmMassa
          quantidade={sel.quantidade}
          alvo={alvoDaSelecao(sel.selecao, { q: buscaDaUrl, v: visao, f })}
          origens={origens}
          camposDoContato={camposDoContato}
          aoLimpar={sel.limpar}
          aoPedir={acompanhamento.acompanhar}
        />
      ) : null}
      {contatoAberto.contatoId ? (
        <JanelaDoContato
          contatoId={contatoAberto.contatoId}
          aba={contatoAberto.aba}
          aoMudarAba={contatoAberto.mudarAba}
          aoTrocarContato={contatoAberto.trocar}
          aoFechar={contatoAberto.fechar}
          podeCriarNegocio={podeCriar}
          podeMesclar={podeMesclar}
          aoAdicionarNegocio={(c) => {
            contatoAberto.fechar();
            setNovoNegocio(c);
          }}
          aoRevisarDuplicado={(id) => setMescla({ aberta: true, contatoInicial: id })}
        />
      ) : null}
      <JanelaNovoNegocio
        contato={novoNegocio}
        aoFechar={() => setNovoNegocio(null)}
        origens={origens}
      />
    </div>
  );
}
