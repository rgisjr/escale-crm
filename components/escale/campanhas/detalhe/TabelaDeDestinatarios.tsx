"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DA_COLUNA,
  type ColunaDosDestinatarios,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { textoDoMotivoDaLinha } from "@/lib/escale/campanhas/detalhe/motivos";
import type { LinhaDeDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { formatarTelefone } from "@/lib/escale/contatos/regras";

import { SeloDaSituacao } from "./SeloDaSituacao";

const LINHAS_DO_ESQUELETO = 8;

/**
 * A TABELA DOS DETALHES (012): a caixinha, as colunas escolhidas, o selo da
 * situação; carregando, vazio (com e sem filtro, e a lista ainda não montada) e
 * erro (material 2.3).
 */
export function TabelaDeDestinatarios({
  linhas,
  colunas,
  carregando,
  erro,
  filtrando,
  aguardando,
  estadoDaPagina,
  marcada,
  aoAlternar,
  aoMarcarPagina,
  fuso,
  aoLimparFiltros,
  aoTentarDeNovo,
}: {
  linhas: readonly LinhaDeDestinatario[];
  colunas: readonly ColunaDosDestinatarios[];
  carregando: boolean;
  erro: boolean;
  filtrando: boolean;
  aguardando: boolean;
  estadoDaPagina: boolean | "indeterminada";
  marcada: (id: string, indice: number) => boolean;
  aoAlternar: (id: string, indice: number, marcar: boolean) => void;
  aoMarcarPagina: (marcar: boolean) => void;
  fuso?: string;
  aoLimparFiltros: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const celula = (l: LinhaDeDestinatario, c: ColunaDosDestinatarios) => {
    switch (c) {
      case "telefone":
        return formatarTelefone(l.telefone) || "-";
      case "nome":
        return l.nome || "-";
      case "email":
        return l.email || "-";
      case "situacao":
        return <SeloDaSituacao situacao={l.situacao} motivo={l.motivo} />;
      case "enviado_em":
        return l.enviadoEm ? dataEHoraBr(l.enviadoEm, fuso) : "-";
      case "motivo":
        return textoDoMotivoDaLinha(l.situacao, l.motivo, t) ?? "-";
    }
  };
  const mensagem = (texto: string, acao?: { rotulo: string; aoClicar: () => void }) => (
    <tr>
      <td colSpan={colunas.length + 1} className="py-10 text-center text-[13px]">
        <p>{texto}</p>
        {acao ? (
          <button
            type="button"
            onClick={acao.aoClicar}
            className="mt-2 font-medium text-casca-marca hover:underline"
          >
            {acao.rotulo}
          </button>
        ) : null}
      </td>
    </tr>
  );
  return (
    <table className="w-full table-fixed text-[12px]">
      <thead>
        <tr className="h-10 border-b border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] uppercase">
          <th scope="col" className="w-12 pl-2">
            <CaixaDaCasca
              marcada={estadoDaPagina}
              aoMudar={aoMarcarPagina}
              aria-label={t("Selecionar a página")}
            />
          </th>
          {colunas.map((c) => (
            <th key={c} scope="col" className={c === "situacao" ? "w-[140px]" : undefined}>
              {t(ROTULO_DA_COLUNA[c])}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {erro
          ? mensagem(t("Não foi possível carregar os contatos."), {
              rotulo: t("Tentar novamente"),
              aoClicar: aoTentarDeNovo,
            })
          : carregando
            ? Array.from({ length: LINHAS_DO_ESQUELETO }, (_, i) => (
                <tr key={i} className="h-[47px] border-b border-casca-divisoria">
                  <td colSpan={colunas.length + 1}>
                    <span
                      aria-hidden
                      className="block h-3 w-1/2 animate-pulse rounded-[4px] bg-casca-raia"
                    />
                  </td>
                </tr>
              ))
            : linhas.length === 0
              ? filtrando
                ? mensagem(t("Nenhum contato com esses filtros"), {
                    rotulo: t("Limpar filtros"),
                    aoClicar: aoLimparFiltros,
                  })
                : mensagem(
                    aguardando
                      ? t("Aguardando o processamento da campanha.")
                      : t("Nenhum contato foi encontrado"),
                  )
              : linhas.map((l, i) => (
                  <tr
                    key={l.id}
                    aria-label={l.nome || formatarTelefone(l.telefone)}
                    className="h-[47px] border-b border-casca-divisoria"
                  >
                    <td className="pl-2">
                      <CaixaDaCasca
                        marcada={marcada(l.id, i)}
                        aoMudar={(v) => aoAlternar(l.id, i, v)}
                        aria-label={`${t("Selecionar")} ${l.nome || formatarTelefone(l.telefone)}`}
                      />
                    </td>
                    {colunas.map((c) => (
                      <td key={c} className="truncate pr-3">
                        {celula(l, c)}
                      </td>
                    ))}
                  </tr>
                ))}
      </tbody>
    </table>
  );
}
