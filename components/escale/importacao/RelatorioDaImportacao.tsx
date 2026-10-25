"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useImportacao, useLinhasDaImportacao } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import {
  LINHAS_DO_RELATORIO_MAX,
  ROTULO_DA_CHAVE,
  agruparPorChave,
  chavesDaLinha,
  csvDoRelatorio,
  detalheDaLinha,
  porcentagem,
} from "@/lib/escale/importacao/relatorio";
import { ROTULO_DO_TIPO } from "@/lib/escale/importacao/textos";
import type { LinhaLida } from "@/lib/escale/importacao/tipos";
import { ArrowLeft, CheckCircle2, CircleX, Download, Flag, TriangleAlert } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

function Cartao({ icone, rotulo, valor, cor, fundo }: { icone: ReactNode; rotulo: string; valor: string; cor: string; fundo: string }) {
  return (
    <div className="flex-1 rounded-[8px] border border-casca-borda p-4">
      <span aria-hidden className={cn("mb-2 grid size-8 place-items-center rounded-[6px]", cor, fundo)}>
        {icone}
      </span>
      <p className="text-[24px] font-semibold text-casca-texto">{valor}</p>
      <p className="text-[12px] text-[#5A5964]">{rotulo}</p>
    </div>
  );
}

function PorMotivo({ titulo, entradas }: { titulo: string; entradas: Array<[string, number]> }) {
  const t = useT();
  return (
    <div>
      <p className="mb-2 text-[14px] font-medium text-casca-texto">{titulo}</p>
      <dl className="flex flex-col gap-1">
        {entradas.map(([chave, n]) => (
          <div key={chave} className="flex justify-between border-b border-[#F1F0F5] py-1">
            <dt className="text-[14px] text-[#5A5964]">{t(ROTULO_DA_CHAVE[chave] ?? chave)}</dt>
            <dd className="text-[14px] font-medium text-casca-texto">{n.toLocaleString("pt-BR")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TabelaDeLinhas({ linhas, cinza }: { linhas: readonly LinhaLida[]; cinza?: boolean }) {
  const t = useT();
  const COLUNA = "px-4 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#86858F] uppercase";
  const aviso = (texto: string) => {
    const corte = texto.indexOf(": ");
    const antes = corte < 0 ? texto : texto.slice(0, corte);
    const depois = corte < 0 ? "" : texto.slice(corte + 2);
    const modelo =
      antes === "Telefone descartado"
        ? t("Telefone descartado: {x}")
        : antes === "E-mail descartado"
          ? t("E-mail descartado: {x}")
          : antes === "ID descartado"
            ? t("ID descartado: {x}")
            : antes === "Dono descartado"
              ? t("Dono descartado: {x}")
              : t("Campo descartado: {x}");
    return modelo.replace("{x}", depois);
  };
  return (
    <div className={cn("overflow-hidden rounded-[8px] border", cinza ? "border-[#F1F0F5] bg-[#FAFAFC]" : "border-casca-borda bg-white")}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-casca-borda">
            <th className={COLUNA}>{t("Linha")}</th>
            <th className={COLUNA}>{t("Motivo")}</th>
            <th className={COLUNA}>{t("Detalhe")}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const d = detalheDaLinha(l);
            return (
              <tr key={l.id} className="border-b border-[#F1F0F5] last:border-b-0">
                <td className="px-4 py-2 text-[14px] text-[#5A5964]">{t("Linha {n}").replace("{n}", String(l.numero))}</td>
                <td className="px-4 py-2 text-[14px] text-casca-texto">
                  {chavesDaLinha(l)
                    .map((c) => t(ROTULO_DA_CHAVE[c] ?? c))
                    .join(" · ")}
                </td>
                <td className="px-4 py-2">
                  {d.erro ? (
                    <p className="line-clamp-1 text-[14px] text-[#D1264F]">{t(d.erro)}</p>
                  ) : (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="line-clamp-1 text-[14px] text-casca-texto">{d.titulo}</p>
                      {d.meio ? <p className="line-clamp-1 text-[12px] text-[#5A5964]">{d.meio}</p> : null}
                      {d.avisos.map((a) => (
                        <p key={a} className="line-clamp-1 text-[12px] text-[#9A6700]">
                          {aviso(a)}
                        </p>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ErroDeCarga({ mensagem, aoTentar }: { mensagem: string; aoTentar: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-8">
      <p className="text-[13px] text-[#5A5964]">{mensagem}</p>
      <BotaoDaCasca type="button" variante="marca" onClick={aoTentar}>
        {t("Tentar de novo")}
      </BotaoDaCasca>
    </div>
  );
}

export function RelatorioDaImportacao({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const importacao = useImportacao(id);
  const lidas = useLinhasDaImportacao(id, "relatorio");
  const i = importacao.data;
  if (importacao.isLoading) return <p className="p-6 text-[13px] text-[#5A5964]">{t("Carregando…")}</p>;
  if (!i) {
    const naoAchada = importacao.error instanceof ApiError && importacao.error.status === 404;
    if (!importacao.isError || naoAchada) return <p className="p-6 text-[13px] text-[#5A5964]">{t("Importação não encontrada.")}</p>;
    return <ErroDeCarga mensagem={t("Não foi possível carregar a importação.")} aoTentar={() => void importacao.refetch()} />;
  }
  const todas = lidas.data ?? [];
  const cortou = todas.length > LINHAS_DO_RELATORIO_MAX;
  const linhas = cortou ? todas.slice(0, LINHAS_DO_RELATORIO_MAX) : todas;
  const falhas = linhas.filter((l) => l.status !== "importada");
  const avisos = linhas.filter((l) => l.status === "importada");
  const total = i.total || i.importadas + i.revisar + i.puladas + i.erros;

  function exportar() {
    const url = URL.createObjectURL(new Blob([csvDoRelatorio(linhas, t)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-importacao-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col bg-surface">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 px-[30px]">
        <div className="flex items-center gap-2">
          <BotaoDaCasca type="button" variante="icone" aria-label={t("Voltar")} onClick={() => router.push("/app/imports")}>
            <ArrowLeft aria-hidden />
          </BotaoDaCasca>
          <div>
            <h1 className="text-[20px] font-medium text-casca-texto">{t("Relatório da importação")}</h1>
            <p className="text-[12px] text-[#5A5964]">{t(ROTULO_DO_TIPO[i.tipo])}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {i.status === "aguardando_revisao" && i.revisar > 0 ? (
            <BotaoDaCasca type="button" variante="marca" onClick={() => router.push(`/app/imports/${id}?revisar=1`)}>
              <Flag aria-hidden />
              {t("Revisar {n} pendências").replace("{n}", String(i.revisar))}
            </BotaoDaCasca>
          ) : null}
          {linhas.length > 0 ? (
            <button
              type="button"
              onClick={exportar}
              className="inline-flex h-[31px] items-center gap-2 rounded-[6px] border border-[#D9D8E0] px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              <Download size={15} aria-hidden />
              {t("Exportar")}
            </button>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex gap-3">
          <Cartao icone={<CheckCircle2 size={17} />} rotulo={t("Importados")} valor={i.importadas.toLocaleString("pt-BR")} cor="text-[#1F9D55]" fundo="bg-[#EEFBF2]" />
          <Cartao icone={<TriangleAlert size={17} />} rotulo={t("Avisos")} valor={cortou ? `${avisos.length}+` : String(i.avisos)} cor="text-[#9A6700]" fundo="bg-[#FFF4D6]" />
          <Cartao icone={<Flag size={17} />} rotulo={t("Para revisar")} valor={i.revisar.toLocaleString("pt-BR")} cor="text-[#C2570C]" fundo="bg-[#FFEBD6]" />
          <Cartao icone={<CircleX size={17} />} rotulo={t("Pulados")} valor={i.puladas.toLocaleString("pt-BR")} cor="text-[#5A5964]" fundo="bg-[#F4F4F7]" />
          <Cartao icone={<CircleX size={17} />} rotulo={t("Erros")} valor={i.erros.toLocaleString("pt-BR")} cor="text-[#D1264F]" fundo="bg-[#FDECEF]" />
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#ECEBF1]" aria-hidden>
          <span className="bg-[#2FB36B]" style={{ width: `${porcentagem(i.importadas, total)}%` }} />
          <span className="bg-[#F08A24]" style={{ width: `${porcentagem(i.revisar, total)}%` }} />
          <span className="bg-[#B8B7C0]" style={{ width: `${porcentagem(i.puladas, total)}%` }} />
          <span className="bg-[#D1264F]" style={{ width: `${porcentagem(i.erros, total)}%` }} />
        </div>

        {i.linhas_apagadas_em ? (
          <p className="rounded-[8px] border border-casca-borda p-6 text-center text-[13px] text-[#5A5964]">
            {t("Os detalhes desta importação foram apagados depois de 30 dias.")}
          </p>
        ) : lidas.isLoading ? (
          <p className="p-8 text-center text-[13px] text-[#5A5964]">{t("Carregando…")}</p>
        ) : lidas.isError ? (
          <ErroDeCarga mensagem={t("Não foi possível carregar as linhas da importação.")} aoTentar={() => void lidas.refetch()} />
        ) : (
          <>
            {cortou ? (
              <p role="status" className="rounded-[8px] bg-[#FFF4D6] px-3 py-2 text-[12px] text-[#9A6700]">
                {t("Este relatório mostra as primeiras {n} linhas. A importação processou mais do que isso.").replace("{n}", String(LINHAS_DO_RELATORIO_MAX))}
              </p>
            ) : null}
            {falhas.length === 0 && avisos.length === 0 ? (
              <p className="rounded-[8px] border border-casca-borda p-8 text-center text-[13px] text-[#5A5964]">
                {t("Nada para revisar aqui. Todas as linhas foram importadas sem ressalvas.")}
              </p>
            ) : null}
            {falhas.length > 0 ? (
              <div className="flex flex-col gap-3">
                <PorMotivo titulo={t("Linhas não importadas por motivo")} entradas={agruparPorChave(falhas)} />
                <TabelaDeLinhas linhas={falhas} />
              </div>
            ) : null}
            {avisos.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p role="status" className="rounded-[8px] bg-[#FFF4D6] px-3 py-2 text-[12px] text-[#9A6700]">
                  {t("Estas linhas foram importadas normalmente, mas um dado foi descartado durante o processo.")}
                </p>
                <PorMotivo titulo={t("Avisos agrupados por motivo")} entradas={agruparPorChave(avisos)} />
                <TabelaDeLinhas linhas={avisos} cinza />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
