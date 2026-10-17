"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useColunasDaLista, useSalvarColunasDaLista } from "@/hooks/escale/useColunasDaLista";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK, type Role } from "@/lib/auth/types";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import {
  CHAVE_DO_POR_PAGINA,
  POR_PAGINA,
  POR_PAGINA_PADRAO,
  ROTULO_DA_VISAO,
  VISOES_DE_CONTATOS,
  type VisaoDeContatos,
} from "@/lib/escale/contatos/regras";
import { ChevronDown, ChevronsUpDown, Funnel, RefreshCw, Search, Users } from "@/lib/ui/icons-da-casca";

import type { OrigemParaCriar } from "./CamposDaOportunidade";
import { JanelaNovoNegocio } from "./JanelaNovoNegocio";
import { MenuNovoContato } from "./MenuNovoContato";
import { PainelDeColunas } from "./PainelDeColunas";
import { SeloDeMescla } from "./SeloDeMescla";
import { TabelaDeContatos } from "./TabelaDeContatos";

function lerPorPagina(): number {
  try {
    const n = Number(window.localStorage.getItem(CHAVE_DO_POR_PAGINA));
    return (POR_PAGINA as readonly number[]).includes(n) ? n : POR_PAGINA_PADRAO;
  } catch {
    return POR_PAGINA_PADRAO;
  }
}

/**
 * A LISTA DE CONTATOS DA CASCA (fork Escale, Fase 2A; capturas 03-001 e
 * 03-002): cabeçalho, barra, tabela e rodapé. Busca, visão e página na URL
 * (`q`, `v`, `p`); o "N por página" no navegador.
 */
export function ListaDeContatos({ origens, papel }: { origens: OrigemParaCriar[]; papel: Role }) {
  const t = useT();
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const visao = (VISOES_DE_CONTATOS as readonly string[]).includes(params.get("v") ?? "")
    ? (params.get("v") as VisaoDeContatos)
    : "todos";
  const pagina = Math.max(1, Number(params.get("p")) || 1);
  const buscaDaUrl = params.get("q") ?? "";
  const [busca, setBusca] = useState(buscaDaUrl);
  const [porPagina, setPorPagina] = useState(POR_PAGINA_PADRAO);
  const [novoNegocio, setNovoNegocio] = useState<LinhaDeContato | null>(null);
  const [girando, setGirando] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- o navegador só é lido depois de montar (SSR)
  useEffect(() => setPorPagina(lerPorPagina()), []);

  const irPara = (mudar: Record<string, string | null>) => {
    const novo = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v === null || v === "") novo.delete(k);
      else novo.set(k, v);
    }
    router.replace(`${caminho}?${novo.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== buscaDaUrl) irPara({ q: busca.trim() || null, p: null });
    }, 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a busca digitada dispara
  }, [busca]);

  const consulta = useListaDeContatos({ q: buscaDaUrl, v: visao, p: pagina, n: porPagina });
  const colunas = useColunasDaLista("contatos");
  const salvarColunas = useSalvarColunasDaLista("contatos");
  const dados = consulta.data;

  useEffect(() => {
    if (dados && dados.linhas.length === 0 && pagina > 1) irPara({ p: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volta à primeira quando a página esvazia (Clint)
  }, [dados, pagina]);

  const podeCriar = ROLE_RANK[papel] >= ROLE_RANK.agent;
  const podeExcluir = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const podeMesclar = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const total = dados?.total ?? 0;

  const mudarPorPagina = (n: number) => {
    setPorPagina(n);
    try {
      window.localStorage.setItem(CHAVE_DO_POR_PAGINA, String(n));
    } catch {
      // o navegador pode recusar; o tamanho vale só nesta visita
    }
    irPara({ p: null });
  };

  const desligado =
    "flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-meta";

  return (
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col bg-surface md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      <header className="flex h-[50px] shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
        <h1 className="text-[16px] font-medium text-casca-texto">{t("Contatos")}</h1>
        <div className="flex items-center gap-4">
          {podeMesclar && <SeloDeMescla />}
          <MenuNovoContato origens={origens} podeCriar={podeCriar} />
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
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia">
            <Users size={15} aria-hidden className="text-casca-marca" />
            {t(ROTULO_DA_VISAO[visao])}
            <ChevronDown size={14} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={CONTEUDO_DO_MENU}>
            {VISOES_DE_CONTATOS.map((v) => (
              <DropdownMenuItem
                key={v}
                className={ITEM_DO_MENU}
                onSelect={() => irPara({ v: v === "todos" ? null : v, p: null })}
              >
                {t(ROTULO_DA_VISAO[v])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="flex">
          <button type="button" disabled title={t("Em breve")} className={`${desligado} rounded-r-none`}>
            <Funnel size={15} aria-hidden />
            {t("Filtros")}
          </button>
          <button
            type="button"
            disabled
            title={t("Em breve")}
            aria-label={t("Ordenar filtros")}
            className={`${desligado} rounded-l-none border-l-0 px-2`}
          >
            <ChevronsUpDown size={14} aria-hidden />
          </button>
        </span>
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
          <PainelDeColunas itens={colunas.itens} aoMudar={(itens) => salvarColunas.mutate(itens)} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6">
        <TabelaDeContatos
          linhas={dados?.linhas ?? []}
          colunas={colunas.itens}
          carregando={consulta.isLoading}
          erro={consulta.isError}
          aoTentarDeNovo={() => void consulta.refetch()}
          podeVerNegocios={podeCriar}
          podeExcluir={podeExcluir}
          aoAdicionarNegocio={setNovoNegocio}
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

      <JanelaNovoNegocio contato={novoNegocio} aoFechar={() => setNovoNegocio(null)} origens={origens} />
    </div>
  );
}
