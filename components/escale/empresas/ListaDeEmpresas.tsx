"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useColunasDaLista, useSalvarColunasDaLista } from "@/hooks/escale/useColunasDaLista";
import { useEstadoDaListaDeEmpresas } from "@/hooks/escale/useEstadoDaListaDeEmpresas";
import { useExcluirEmpresa, useListaDeEmpresas } from "@/hooks/escale/useListaDeEmpresas";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK, type Role } from "@/lib/auth/types";
import { camposDaEmpresaDoFiltro, contarNaSecao, temFiltros } from "@/lib/escale/contatos/filtros";
import { POR_PAGINA, POR_PAGINA_PADRAO, camposDeColuna } from "@/lib/escale/contatos/regras";
import type { LinhaDeEmpresa } from "@/lib/escale/empresas/banco";
import {
  CAMPOS_QUE_SAO_COLUNAS,
  COLUNAS_NATIVAS_DE_EMPRESAS,
  COLUNAS_PADRAO_DE_EMPRESAS,
  CONTAGEM_MAXIMA,
  ESCOPOS_DE_EMPRESAS,
  ROTULO_DA_COLUNA_DE_EMPRESA,
  ROTULO_DO_ESCOPO,
} from "@/lib/escale/empresas/regras";
import { Building2, Funnel, RefreshCw, Search } from "@/lib/ui/icons-da-casca";

import { PainelDeColunas } from "../contatos/PainelDeColunas";
import { SecaoCamposDoFiltro } from "../contatos/filtros/SecaoCamposDoFiltro";
import { JanelaNovaEmpresa } from "./JanelaNovaEmpresa";
import { TabelaDeEmpresas } from "./TabelaDeEmpresas";

const CHAVE_DO_POR_PAGINA = "escale:empresas:por-pagina";

function lerPorPagina(): number {
  try {
    const n = Number(window.localStorage.getItem(CHAVE_DO_POR_PAGINA));
    return (POR_PAGINA as readonly number[]).includes(n) ? n : POR_PAGINA_PADRAO;
  } catch {
    return POR_PAGINA_PADRAO;
  }
}

/**
 * A LISTA DE EMPRESAS DA CASCA (fork Escale, Fase 2D; captura 04-001): cabeçalho
 * com "Nova empresa", barra (busca, escopo, Filtros por campo, contagem, atualizar
 * e colunas), a tabela e o rodapé. Busca, escopo, página e filtro na URL; o
 * "N por página" no navegador.
 */
export function ListaDeEmpresas({ papel, moedaPadrao }: { papel: Role; moedaPadrao: string }) {
  const t = useT();
  const {
    escopo,
    pagina,
    busca: buscaDaUrl,
    novaNaUrl,
    filtros,
    f,
    irPara,
    mudarFiltros,
  } = useEstadoDaListaDeEmpresas();
  const [busca, setBusca] = useState(buscaDaUrl);
  const [porPagina, setPorPagina] = useState(POR_PAGINA_PADRAO);
  const [novaAberta, setNovaAberta] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [girando, setGirando] = useState(false);
  const { catalogo } = useCatalogoDeCampos("empresa");
  // "Campos da empresa" do painel de colunas: o catálogo, menos o nome e o segmento (já são colunas).
  const camposDaEmpresa = useMemo(
    () =>
      camposDeColuna({
        ...catalogo,
        campos: catalogo.campos.filter((c) => !CAMPOS_QUE_SAO_COLUNAS.has(c.chave)),
      }).filter((c) => c.chave !== "nascimento" && !c.chave.startsWith("link_")),
    [catalogo],
  );
  const camposDoFiltro = useMemo(() => camposDaEmpresaDoFiltro(catalogo), [catalogo]);
  const colunas = useColunasDaLista("empresas");
  const salvarColunas = useSalvarColunasDaLista("empresas");
  const excluir = useExcluirEmpresa();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o navegador só é lido depois de montar (SSR)
    setPorPagina(lerPorPagina());
  }, []);

  useEffect(() => {
    if (!novaNaUrl) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- abre uma vez a janela pedida pelo "Novo +" do topo
    setNovaAberta(true);
    irPara({ nova: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só o parâmetro da URL dispara
  }, [novaNaUrl]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== buscaDaUrl) irPara({ q: busca.trim() || null, p: null });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a busca digitada dispara
  }, [busca]);

  const consulta = useListaDeEmpresas({ q: buscaDaUrl, e: escopo, p: pagina, n: porPagina, f });
  const dados = consulta.data;
  const total = dados?.total ?? 0;
  const linhas = dados?.linhas ?? [];

  useEffect(() => {
    if (dados && dados.linhas.length === 0 && pagina > 1) irPara({ p: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volta à primeira quando a página esvazia (Clint)
  }, [dados, pagina]);

  const podeCriar = ROLE_RANK[papel] >= ROLE_RANK.agent;
  const podeExcluir = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const quantos = contarNaSecao(filtros, "campos");
  const contagem = Math.min(total, CONTAGEM_MAXIMA);

  const mudarPorPagina = (n: number) => {
    setPorPagina(n);
    try {
      window.localStorage.setItem(CHAVE_DO_POR_PAGINA, String(n));
    } catch {
      // o navegador pode recusar; o tamanho vale só nesta visita
    }
    irPara({ p: null });
  };

  async function excluirEmpresa(linha: LinhaDeEmpresa) {
    try {
      await excluir.mutateAsync(linha.id);
      toast.success(t('Empresa "{name}" removida.').replace("{name}", linha.nome));
    } catch {
      toast.error(t("Não foi possível excluir a empresa. Tente novamente."));
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col bg-surface md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 px-[30px]">
        <h1 className="text-[20px] font-medium text-casca-texto">{t("Empresas")}</h1>
        {podeCriar ? (
          <BotaoDaCasca type="button" variante="marca" onClick={() => setNovaAberta(true)}>
            {t("Nova empresa")}
          </BotaoDaCasca>
        ) : null}
      </header>

      <div className="flex shrink-0 items-center gap-3 border-b border-casca-borda px-[30px] pt-1 pb-4">
        <label className="flex h-10 w-[300px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por empresa ou CNPJ")}
            aria-label={t("Buscar por empresa ou CNPJ")}
            className="w-full bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={15} aria-hidden className="shrink-0 text-casca-suave" />
        </label>
        <div className="flex h-10 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda px-2">
          <Building2 size={16} aria-hidden className="text-casca-suave" />
          <SeletorDaCasca
            valor={escopo}
            opcoes={ESCOPOS_DE_EMPRESAS.map((e) => ({ valor: e, rotulo: t(ROTULO_DO_ESCOPO[e]) }))}
            aoMudar={(v) => irPara({ e: v === "com_nome" ? null : v, p: null })}
            aria-label={t("Escopo")}
          />
        </div>
        <Popover open={filtroAberto} onOpenChange={setFiltroAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              <Funnel size={15} aria-hidden />
              {t("Filtros")}
              {quantos > 0 ? (
                <span className="grid size-[18px] place-items-center rounded-full bg-casca-marca text-[10px] font-semibold text-white">
                  {quantos}
                </span>
              ) : null}
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" sideOffset={8} className="w-[356px] p-3">
            <SecaoCamposDoFiltro
              filtros={filtros}
              aoMudar={mudarFiltros}
              camposDoNegocio={[]}
              camposDoContato={[]}
              camposDaEmpresa={camposDoFiltro}
              gruposDoSeletor={["empresa"]}
            />
            {temFiltros(filtros) ? (
              <div className="mt-2 flex justify-end">
                <BotaoDaCasca
                  type="button"
                  variante="texto"
                  tamanho="sm"
                  onClick={() => irPara({ f: null, p: null })}
                >
                  {t("Resetar")}
                </BotaoDaCasca>
              </div>
            ) : null}
          </PainelSuspenso>
        </Popover>
        <div className="ml-auto flex items-center gap-3">
          {total > CONTAGEM_MAXIMA ? (
            <span className="text-[12px] text-casca-suave">
              {t("Refine a busca para ver além das primeiras {max}.").replace(
                "{max}",
                CONTAGEM_MAXIMA.toLocaleString("pt-BR"),
              )}
            </span>
          ) : null}
          <span className="text-[15px] text-casca-suave">
            <span className="mr-1 font-semibold text-casca-texto">{contagem.toLocaleString("pt-BR")}</span>
            {total === 1 ? t("empresa") : t("empresas")}
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
            nativas={COLUNAS_NATIVAS_DE_EMPRESAS.map((c) => ({
              chave: c,
              rotulo: ROTULO_DA_COLUNA_DE_EMPRESA[c],
            }))}
            campos={camposDaEmpresa}
            tituloDosCampos={t("Campos da empresa")}
            padrao={COLUNAS_PADRAO_DE_EMPRESAS}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-[30px]">
        <TabelaDeEmpresas
          linhas={linhas}
          colunas={colunas.itens}
          camposDaEmpresa={camposDaEmpresa}
          moeda={dados?.moeda ?? moedaPadrao}
          carregando={consulta.isLoading}
          erro={consulta.isError}
          busca={buscaDaUrl}
          podeExcluir={podeExcluir}
          aoTentarDeNovo={() => void consulta.refetch()}
          aoLimparBusca={() => {
            setBusca("");
            irPara({ q: null, p: null });
          }}
          aoNovaEmpresa={() => setNovaAberta(true)}
          aoExcluir={excluirEmpresa}
        />
      </div>

      <footer className="shrink-0 border-t border-casca-borda px-[30px]">
        <PaginacaoDaCasca
          pagina={pagina}
          total={contagem}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA}
          aoMudarPagina={(p) => irPara({ p: p === 1 ? null : String(p) })}
          aoMudarPorPagina={mudarPorPagina}
        />
      </footer>
      <JanelaNovaEmpresa aberta={novaAberta} aoFechar={() => setNovaAberta(false)} />
    </div>
  );
}
