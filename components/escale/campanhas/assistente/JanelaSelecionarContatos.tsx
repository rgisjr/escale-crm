"use client";

import { useState } from "react";

import { PainelDeFiltros } from "@/components/escale/contatos/filtros/PainelDeFiltros";
import { SeletorDeFiltros } from "@/components/escale/contatos/filtros/SeletorDeFiltros";
import { FotoDaPessoa } from "@/components/escale/conversas/configuracoes/FotoDaPessoa";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  useExcluirFiltroDaLista,
  useFiltrosDaLista,
  useMudarFiltroDaLista,
} from "@/hooks/escale/useFiltrosDaLista";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { SelecaoDoPublico } from "@/lib/escale/campanhas/assistente";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  filtrosDaUrl,
  filtrosParaUrl,
  type FiltrosDeContatos,
  type SecaoDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { POR_PAGINA, formatarTelefone, type VisaoDeContatos } from "@/lib/escale/contatos/regras";
import {
  SEM_SELECAO,
  SELECIONAR_TODOS,
  alternarLinha,
  alvoDaSelecao,
  estadoDaPagina,
  linhaMarcada,
  totalSelecionado,
  type Selecao,
} from "@/lib/escale/contatos/selecao";
import { Funnel, MessageCircle, Search, TriangleAlert } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "../molde/estilos";

/** A seleção guardada volta como estado da tela (ids, ou o filtro com os desmarcados). */
function estadoDaSelecaoInicial(s: SelecaoDoPublico | null) {
  if (!s)
    return {
      q: "",
      v: "todos" as VisaoDeContatos,
      f: {} as FiltrosDeContatos,
      selecao: SEM_SELECAO as Selecao,
    };
  if (s.tipo === "ids")
    return {
      q: "",
      v: "todos" as VisaoDeContatos,
      f: {} as FiltrosDeContatos,
      selecao: { tipo: "ids", ids: s.ids } as Selecao,
    };
  return {
    q: s.q ?? "",
    v: s.v,
    f: filtrosDaUrl(s.f ?? null),
    selecao: { tipo: "todos", quantidade: s.quantidade, excluidos: s.excluidos } as Selecao,
  };
}

/**
 * "SELECIONAR CONTATOS" (fork Escale, Fase 8B; 09-031 a 09-034; N8). A lista,
 * a busca, as visões, os filtros e os filtros salvos de Contatos (2A/2B), com o
 * modelo de seleção da 2B: marcar um a um = ids; "Selecionar todos" = o filtro
 * (e os desmarcados), que o banco resolve na hora de preparar.
 */
export function JanelaSelecionarContatos({
  aberta,
  aoFechar,
  inicial,
  opcoesDoFiltro,
  aoAdicionar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  inicial: SelecaoDoPublico | null;
  opcoesDoFiltro: OpcoesDoFiltro;
  aoAdicionar: (s: SelecaoDoPublico) => void;
}) {
  const t = useT();
  const comeco = estadoDaSelecaoInicial(inicial);
  const [busca, setBusca] = useState(comeco.q);
  const [visao, setVisao] = useState<VisaoDeContatos>(comeco.v);
  const [filtros, setFiltros] = useState<FiltrosDeContatos>(comeco.f);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(10);
  const [selecao, setSelecao] = useState<Selecao>(comeco.selecao);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [foco, setFoco] = useState<SecaoDoFiltro | null>(null);
  const salvos = useFiltrosDaLista("contatos");
  const mudarFiltro = useMudarFiltroDaLista("contatos");
  const excluirFiltro = useExcluirFiltroDaLista("contatos");

  const f = filtrosParaUrl(filtros);
  const lista = useListaDeContatos({
    q: busca.trim() || undefined,
    v: visao,
    p: pagina,
    n: porPagina,
    f,
  });
  const linhas = lista.data?.linhas ?? [];
  const total = lista.data?.total ?? 0;
  const primeiro = (pagina - 1) * porPagina;
  const quantos = totalSelecionado(selecao, total);
  const mudouConsulta = () => {
    setPagina(1);
    setSelecao(SEM_SELECAO);
  };

  return (
    <JanelaDaCasca
      aberta={aberta}
      onFechar={aoFechar}
      className="w-[min(896px,calc(100vw-2rem))] max-w-none gap-0 rounded-[12px] p-0"
    >
      <div className="flex h-14 items-center border-b border-casca-divisoria px-5">
        <DialogTitle className="text-[15px] font-medium text-casca-texto">
          {t("Selecionar contatos")}
        </DialogTitle>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-6 pt-4 pb-3">
        <label className="relative w-[260px]">
          <span className="sr-only">{t("Buscar por contato ou Empresa")}</span>
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              mudouConsulta();
            }}
            placeholder={t("Buscar por contato ou Empresa")}
            className="h-8 w-full rounded-[6px] bg-casca-busca pr-8 pl-3 text-[13px] placeholder:text-casca-meta focus-visible:outline-casca-marca"
          />
          <Search className="absolute top-2 right-2 size-4 text-casca-suave" aria-hidden />
        </label>
        <SeletorDeFiltros
          visao={visao}
          filtros={filtros}
          filtroSalvoId={salvoId}
          salvos={salvos.data ?? []}
          aoEscolherVisao={(v) => {
            setVisao(v);
            setSalvoId(null);
            mudouConsulta();
          }}
          aoAplicarSalvo={(s) => {
            setFiltros(s.criterios);
            setSalvoId(s.id);
            mudouConsulta();
          }}
          aoCriarFiltro={() => setFiltrosAbertos(true)}
          aoRenomear={async (id, nome) => {
            try {
              await mudarFiltro.mutateAsync({ id, nome });
              return null;
            } catch (e) {
              return (e as Error).message;
            }
          }}
          aoCompartilhar={(id, compartilhado) => mudarFiltro.mutate({ id, compartilhado })}
          aoExcluir={(id) => excluirFiltro.mutate(id)}
        />
        <Popover open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(BOTAO_CONTORNADO, "gap-1.5")}>
              <Funnel className="size-3.5" aria-hidden />
              {t("Filtros")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso sideOffset={8} className="w-[360px]">
            <PainelDeFiltros
              filtros={filtros}
              aoMudar={(novo) => {
                setFiltros(novo);
                setSalvoId(null);
                mudouConsulta();
              }}
              opcoes={opcoesDoFiltro}
              foco={foco}
              aoMudarFoco={setFoco}
            />
          </PainelSuspenso>
        </Popover>
      </div>
      <div className="mx-6 flex items-center justify-between border-y border-casca-divisoria py-3">
        <CaixaDaCasca
          marcada={
            selecao.tipo === "todos" && selecao.quantidade === null
              ? selecao.excluidos.length
                ? "indeterminada"
                : true
              : estadoDaPagina(selecao, linhas, primeiro)
          }
          aoMudar={(marcar) => setSelecao(marcar ? SELECIONAR_TODOS : SEM_SELECAO)}
          rotulo={t("Selecionar todos")}
        />
        <span className="flex items-center gap-1.5 text-[12px] text-(--escale-prazo-atencao-texto)">
          <TriangleAlert className="size-3.5" aria-hidden />
          {t("Contatos duplicados não poderão ser selecionados")}
        </span>
      </div>
      <div className="h-[260px] overflow-y-auto px-3">
        {lista.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13px] font-medium text-casca-texto">
              {t("Não foi possível carregar os contatos.")}
            </p>
            <button type="button" onClick={() => void lista.refetch()} className={BOTAO_CONTORNADO}>
              {t("Tentar novamente")}
            </button>
          </div>
        ) : !lista.isLoading && linhas.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[13px] font-medium text-casca-texto">
              {t("Não foram encontrados contatos.")}
            </p>
            <p className="text-[12px] text-casca-suave">
              {t("Tente ajustar a busca ou os filtros.")}
            </p>
          </div>
        ) : (
          linhas.map((l, i) => {
            const semTelefone = !l.telefone;
            const nome = nomeDoContato({ name: l.nome, display_name: l.display_name }) ?? "";
            return (
              <div
                key={l.id}
                className={cn(
                  "flex h-14 items-center gap-3 rounded-[8px] px-3",
                  linhaMarcada(selecao, l.id, primeiro + i) && "bg-casca-busca",
                )}
              >
                <CaixaDaCasca
                  marcada={!semTelefone && linhaMarcada(selecao, l.id, primeiro + i)}
                  aoMudar={(marcar) =>
                    setSelecao(alternarLinha(selecao, l.id, primeiro + i, marcar))
                  }
                  aria-label={nome}
                  desabilitada={semTelefone}
                />
                <FotoDaPessoa id={l.id} nome={nome} tamanho={32} />
                <span className="truncate text-[13px] font-medium text-casca-texto">{nome}</span>
                <span className="flex min-w-0 gap-1 overflow-hidden">
                  {l.tags.slice(0, 3).map((tag) => (
                    <ChipDaTag key={tag} tag={tag} />
                  ))}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[13px] text-casca-texto-2">
                  {semTelefone ? (
                    <span className="text-casca-meta">{t("Sem telefone")}</span>
                  ) : (
                    <>
                      <MessageCircle className="size-3.5 text-casca-marca" aria-hidden />
                      {formatarTelefone(l.telefone)}
                    </>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
      {total > 0 && (
        <div className="px-6 py-3">
          <PaginacaoDaCasca
            pagina={pagina}
            total={total}
            porPagina={porPagina}
            opcoesPorPagina={POR_PAGINA}
            aoMudarPagina={setPagina}
            aoMudarPorPagina={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
          />
        </div>
      )}
      <div className="flex h-16 items-center gap-3 border-t border-casca-divisoria px-6">
        {quantos === 0 ? (
          <span className="text-[13px] text-casca-texto-2">{t("Nenhum contato selecionado")}</span>
        ) : (
          <>
            <span className="text-[13px] text-casca-texto-2">
              {(quantos === 1 ? t("{n} selecionado") : t("{n} selecionados")).replace(
                "{n}",
                numeroBr(quantos),
              )}
            </span>
            <button
              type="button"
              onClick={() => setSelecao(SEM_SELECAO)}
              className="text-[13px] font-medium text-casca-marca"
            >
              {t("Limpar")}
            </button>
          </>
        )}
        {selecao.tipo === "todos" && (
          <span className="text-[12px] text-casca-meta">
            {t("A quantidade de contatos pode variar até o momento do envio.")}
          </span>
        )}
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_CONTORNADO}>
            {t("Cancelar")}
          </button>
          <button
            type="button"
            disabled={quantos === 0}
            onClick={() => {
              aoAdicionar(alvoDaSelecao(selecao, { q: busca, v: visao, f }) as SelecaoDoPublico);
              aoFechar();
            }}
            className={BOTAO_DA_MARCA}
          >
            {t("Adicionar")}
          </button>
        </span>
      </div>
    </JanelaDaCasca>
  );
}
