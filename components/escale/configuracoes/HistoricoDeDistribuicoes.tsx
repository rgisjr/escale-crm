"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  CabecaDaJanela,
  CampoDeTexto,
  JanelaDaCasca,
} from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import {
  useDistribuicoesFeitas,
  type FiltrosDasDistribuicoes,
} from "@/hooks/escale/useDistribuicao";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { POR_PAGINA_DAS_DISTRIBUICOES, dataBr, horaBr } from "@/lib/escale/distribuicao/regras";
import { SearchX } from "@/lib/ui/icons-da-casca";

import { membrosAtivosDaEquipe } from "./ListaDePessoas";

const GRADE = "grid grid-cols-[2fr_1.1fr_1.4fr_128px] items-center gap-3";
const ESPERA_DA_BUSCA_MS = 400;

/**
 * A JANELA "HISTÓRICO DE DISTRIBUIÇÕES" (fork Escale, Fase 1K; aberta pelo
 * contador, código da Clint, sem print). Filtros: busca no título do negócio
 * (N14), pessoa e período; 6 por página. Quem saiu da distribuição aparece com
 * o selo "Removido".
 */
export function HistoricoDeDistribuicoes({
  aberta,
  aoFechar,
  pipelineId,
  origem,
  usuarioInicial,
  naDistribuicao,
}: {
  aberta: boolean;
  aoFechar: () => void;
  pipelineId: string;
  origem: string;
  usuarioInicial: string;
  naDistribuicao: readonly string[];
}) {
  const t = useT();
  const [filtros, setFiltros] = useState<FiltrosDasDistribuicoes>({
    usuario: usuarioInicial,
    busca: "",
    periodo: "",
    pagina: 1,
  });
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const espera = setTimeout(
      () => setFiltros((f) => (f.busca === busca ? f : { ...f, busca, pagina: 1 })),
      ESPERA_DA_BUSCA_MS,
    );
    return () => clearTimeout(espera);
  }, [busca]);

  const consulta = useDistribuicoesFeitas(pipelineId, filtros, aberta);
  const equipe = useTeamMembers();
  const membros = useMemo(
    () => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")),
    [equipe.data, t],
  );
  const nomeDe = (id: string | null) =>
    (id && membros.find((m) => m.id === id)?.nome) || t("Usuário desconhecido");
  const itens = consulta.data?.itens ?? [];
  const total = consulta.data?.total ?? 0;
  const de = total === 0 ? 0 : (filtros.pagina - 1) * POR_PAGINA_DAS_DISTRIBUICOES + 1;
  const ate = Math.min(total, filtros.pagina * POR_PAGINA_DAS_DISTRIBUICOES);
  const limpar = () => {
    setBusca("");
    setFiltros({ usuario: "", busca: "", periodo: "", pagina: 1 });
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(760px,calc(100vw-2rem))]">
      <CabecaDaJanela
        titulo={t("Histórico de distribuições")}
        descricao={t("Origem: {origem}").split("{origem}").join(origem)}
      />
      <div className="grid grid-cols-[1fr_200px_180px] gap-3">
        <CampoDeTexto
          type="search"
          aria-label={t("Buscar por contato ou empresa")}
          placeholder={t("Buscar por contato ou empresa")}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <SeletorDaCasca
          aparencia="janela"
          valor={filtros.usuario}
          aria-label={t("Todos os usuários")}
          opcoes={[
            { valor: "", rotulo: t("Todos os usuários") },
            ...naDistribuicao.map((id) => ({ valor: id, rotulo: nomeDe(id) })),
          ]}
          aoMudar={(v) => setFiltros((f) => ({ ...f, usuario: v, pagina: 1 }))}
        />
        <SeletorDaCasca
          aparencia="janela"
          valor={filtros.periodo}
          aria-label={t("Período")}
          opcoes={[
            { valor: "", rotulo: t("Todo o período") },
            { valor: "7", rotulo: t("Últimos 7 dias") },
            { valor: "30", rotulo: t("Últimos 30 dias") },
          ]}
          aoMudar={(v) =>
            setFiltros((f) => ({
              ...f,
              periodo: v as FiltrosDasDistribuicoes["periodo"],
              pagina: 1,
            }))
          }
        />
      </div>

      <div role="table" aria-label={t("Histórico de distribuições")}>
        <div role="row" className={`${GRADE} h-10 border-b border-casca-borda`}>
          {[t("Negócio"), t("Etapa"), t("Distribuído para"), t("Data")].map((c) => (
            <span
              key={c}
              role="columnheader"
              className="text-[10px] font-semibold tracking-wide text-casca-meta uppercase"
            >
              {c}
            </span>
          ))}
        </div>
        {consulta.isPending ? (
          <p className="py-6 text-[13px] text-casca-suave">{t("Carregando…")}</p>
        ) : consulta.isError && !consulta.data ? (
          <ErroDaLista
            mensagem={t("Não foi possível carregar o histórico de distribuições.")}
            aoTentar={() => void consulta.refetch()}
          />
        ) : itens.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-casca-suave">
            <SearchX size={24} aria-hidden />
            <p className="text-[13px]">
              {t("Nenhuma distribuição encontrada para os filtros selecionados.")}
            </p>
            <BotaoDaCasca variante="texto" onClick={limpar}>
              {t("Limpar filtros")}
            </BotaoDaCasca>
          </div>
        ) : (
          itens.map((d) => (
            <div
              key={d.id}
              role="row"
              className={`${GRADE} h-16 border-b border-casca-borda text-[13px]`}
            >
              <Link
                role="cell"
                href={`/app/leads/${d.leadId}`}
                className="truncate font-medium text-casca-texto hover:underline"
              >
                {d.titulo}
              </Link>
              <span role="cell" className="truncate text-casca-suave">
                {d.etapa ?? "—"}
              </span>
              <span role="cell" className="flex min-w-0 items-center gap-2">
                <span className="truncate text-casca-texto">{nomeDe(d.userId)}</span>
                {d.userId && !naDistribuicao.includes(d.userId) ? (
                  <span className="shrink-0 rounded-full bg-casca-raia px-2 py-0.5 text-[11px] text-casca-alerta">
                    {t("Removido")}
                  </span>
                ) : null}
              </span>
              <span
                role="cell"
                className="text-casca-suave"
              >{`${dataBr(d.em)} ${horaBr(d.em)}`}</span>
            </div>
          ))
        )}
      </div>

      {total > 0 ? (
        <div className="flex items-center justify-between gap-3 text-[12px] text-casca-suave">
          <span>
            {(total === 1
              ? t("Mostrando {de}–{ate} de {total} negócio atribuído")
              : t("Mostrando {de}–{ate} de {total} negócios atribuídos")
            )
              .split("{de}")
              .join(String(de))
              .split("{ate}")
              .join(String(ate))
              .split("{total}")
              .join(String(total))}
          </span>
          <PaginacaoDaCasca
            pagina={filtros.pagina}
            total={total}
            porPagina={POR_PAGINA_DAS_DISTRIBUICOES}
            opcoesPorPagina={[POR_PAGINA_DAS_DISTRIBUICOES]}
            aoMudarPagina={(pagina) => setFiltros((f) => ({ ...f, pagina }))}
            aoMudarPorPagina={() => undefined}
          />
        </div>
      ) : null}
    </JanelaDaCasca>
  );
}
