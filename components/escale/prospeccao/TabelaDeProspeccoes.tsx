"use client";
import type { KeyboardEvent } from "react";

import { useT } from "@/hooks/i18n/useT";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import { subtituloDaProspeccao } from "@/lib/escale/prospeccao/apresentacao";
import type { LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Building2, CirclePause, Play } from "@/lib/ui/icons-da-casca";

import { BarraDaProspeccao } from "./BarraDaProspeccao";
import { MenuDaProspeccao } from "./MenuDaProspeccao";
import { SeloDaSituacao } from "./SeloDaProspeccao";

const COLUNAS = ["w-[28%] pl-6", "w-[14%]", "w-[18%]", "w-[22%]", "w-[12%]", "w-[6%]"];
/**
 * A TABELA DE PROSPECÇÕES (molde 002; D6, D8): a linha com o quadrado, o nome
 * e o subtítulo, a data de início, o número, a barra, o selo, Pausar/Retomar e
 * o ⋮. Carregando, vazio por filtro e erro moram aqui; o vazio sem nenhuma
 * prospecção é da aba (`ListaDeProspeccoes`).
 */
export function TabelaDeProspeccoes({
  linhas,
  carregando,
  erro,
  filtrando,
  fuso,
  ocupadoId,
  nomeDoNumero,
  aoAbrir,
  aoPausar,
  aoRetomar,
  aoDuplicar,
  aoLimparFiltros,
  aoTentarDeNovo,
}: {
  linhas: LinhaDeProspeccao[];
  carregando: boolean;
  erro: boolean;
  filtrando: boolean;
  fuso?: string;
  ocupadoId: string | null;
  nomeDoNumero: (id: string | null) => string;
  aoAbrir: (l: LinhaDeProspeccao) => void;
  aoPausar: (l: LinhaDeProspeccao) => void;
  aoRetomar: (l: LinhaDeProspeccao) => void;
  aoDuplicar: (l: LinhaDeProspeccao) => void;
  aoLimparFiltros: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const tecla = (l: LinhaDeProspeccao) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter") aoAbrir(l);
  };

  return (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr className="h-[42px] border-y border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] text-casca-texto uppercase">
          {[t("Prospecção"), t("Data de início"), t("Número"), t("Resultado"), t("Status")].map(
            (titulo, i) => (
              <th key={i} className={COLUNAS[i]}>
                {titulo}
              </th>
            ),
          )}
          <th className={COLUNAS[5]}>
            <span className="sr-only">{t("Ações")}</span>
          </th>
        </tr>
      </thead>
      <tbody aria-busy={carregando}>
        {carregando ? (
          <tr role="status" aria-label={t("Carregando prospecções")}>
            <td colSpan={6}>
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="mx-6 my-[19px] h-4 animate-pulse rounded-md bg-casca-busca"
                />
              ))}
            </td>
          </tr>
        ) : erro ? (
          <tr>
            <td colSpan={6} className="px-6 py-10 text-center text-[13px] text-casca-suave">
              <p>{t("Não foi possível carregar as prospecções.")}</p>
              <button
                type="button"
                onClick={aoTentarDeNovo}
                className="mt-3 text-[12px] font-medium text-casca-marca hover:underline"
              >
                {t("Tentar novamente")}
              </button>
            </td>
          </tr>
        ) : linhas.length === 0 && filtrando ? (
          <tr>
            <td colSpan={6} className="px-6 py-10 text-center">
              <p className="text-[15px] font-semibold text-casca-texto">
                {t("Nenhuma prospecção encontrada")}
              </p>
              <p className="mt-2 text-[13px] text-casca-suave">
                {t("Tente ajustar a busca ou os filtros aplicados.")}
              </p>
              <button
                type="button"
                onClick={aoLimparFiltros}
                className="mt-4 inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
              >
                {t("Limpar filtros")}
              </button>
            </td>
          </tr>
        ) : (
          linhas.map((l) => (
            <tr
              key={l.id}
              tabIndex={0}
              onClick={() => aoAbrir(l)}
              onKeyDown={tecla(l)}
              className="h-[54px] cursor-pointer border-b border-casca-divisoria text-[11px] text-casca-texto transition-colors hover:bg-casca-busca focus-visible:bg-casca-busca focus-visible:outline-hidden"
            >
              <td className="pl-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca">
                    <Building2 size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p
                      title={l.nome}
                      className="max-w-[200px] truncate text-[13px] font-medium text-casca-texto"
                    >
                      {l.nome}
                    </p>
                    <p className="text-[11px] text-casca-meta">{subtituloDaProspeccao(l, t)}</p>
                  </div>
                </div>
              </td>
              <td>{l.primeiraAbordagem ? dataEHoraBr(l.primeiraAbordagem, fuso) : "—"}</td>
              <td className="truncate">{l.numeroId ? nomeDoNumero(l.numeroId) : "—"}</td>
              <td>
                <BarraDaProspeccao linha={l} />
              </td>
              <td>
                <SeloDaSituacao situacao={l.situacao} />
              </td>
              <td>
                <div className="flex items-center justify-end gap-1 pr-3">
                  {l.situacao === "em_progresso" ? (
                    <button
                      type="button"
                      aria-label={t("Pausar prospecção")}
                      title={t("Pausar prospecção")}
                      disabled={ocupadoId === l.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        aoPausar(l);
                      }}
                      className="grid size-7 place-items-center rounded-casca-gatilho border border-casca-borda text-casca-texto-2 hover:bg-casca-raia disabled:opacity-50"
                    >
                      <CirclePause size={16} aria-hidden />
                    </button>
                  ) : l.situacao === "pausada" ? (
                    <button
                      type="button"
                      aria-label={t("Retomar prospecção")}
                      title={t("Retomar prospecção")}
                      disabled={ocupadoId === l.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        aoRetomar(l);
                      }}
                      className="grid size-7 place-items-center rounded-casca-gatilho bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
                    >
                      <Play size={14} aria-hidden />
                    </button>
                  ) : null}
                  <MenuDaProspeccao
                    linha={l}
                    aoContinuar={() => aoAbrir(l)}
                    aoDuplicar={() => aoDuplicar(l)}
                  />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
