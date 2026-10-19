"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { useCancelarImportacao, useImportacoes } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { dataEHora, porcentagem, processadas } from "@/lib/escale/importacao/relatorio";
import { ROTULO_DO_STATUS, ROTULO_DO_TIPO, STATUS_EM_ANDAMENTO, type StatusDaImportacao } from "@/lib/escale/importacao/textos";
import { PAGINA_DA_LISTA, type ImportacaoLida } from "@/lib/escale/importacao/tipos";
import { FileText, Upload } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AcompanharImportacoes } from "./AcompanharImportacoes";
import { JanelaDeImportacao } from "./JanelaDeImportacao";
import { TabelaDeExportacoes } from "./TabelaDeExportacoes";

const PILULA = "h-7 rounded-[6px] px-3 text-[12px] font-medium";
const COR_DO_STATUS: Record<StatusDaImportacao, string> = {
  preparando: "bg-[#F4F4F7] text-[#5A5964]",
  na_fila: "bg-[#F4F4F7] text-[#5A5964]",
  importando: "bg-[#EFF3FF] text-[#2F4A9A]",
  aguardando_revisao: "bg-[#FFF4D6] text-[#9A6700]",
  concluida: "bg-[#EEFBF2] text-[#1F9D55]",
  cancelada: "bg-[#F4F4F7] text-[#5A5964]",
  falhou: "bg-[#FDECEF] text-[#D1264F]",
};
const RELATORIO: readonly StatusDaImportacao[] = ["concluida", "falhou", "cancelada", "aguardando_revisao"];

function Pilulas<V extends string>({ valor, opcoes, aoMudar, rotulo }: { valor: V; opcoes: Array<[V, string]>; aoMudar: (v: V) => void; rotulo: string }) {
  return (
    <div role="tablist" aria-label={rotulo} className="inline-flex gap-0.5 rounded-[8px] bg-[#F4F4F7] p-0.5">
      {opcoes.map(([v, r]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={valor === v}
          onClick={() => aoMudar(v)}
          className={cn(PILULA, valor === v ? "bg-white text-casca-texto shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-[#5A5964]")}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function Resultado({ i }: { i: ImportacaoLida }) {
  const t = useT();
  if (STATUS_EM_ANDAMENTO.includes(i.status)) {
    const feitas = processadas(i);
    if (feitas === 0) return <span className="text-[12px] text-[#5A5964]">{t("Aguardando início…")}</span>;
    return (
      <div className="flex min-w-[160px] flex-col gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#ECEBF1]">
          <div className="h-full rounded-full bg-[#2F6BFF]" style={{ width: `${porcentagem(feitas, i.total)}%` }} />
        </div>
        <span className="text-[12px] text-[#5A5964]">
          {feitas.toLocaleString("pt-BR")} / {i.total.toLocaleString("pt-BR")}
        </span>
      </div>
    );
  }
  if (i.status === "aguardando_revisao") {
    return (
      <span className="text-[13px] font-medium text-[#9A6700]">
        {t("{count} linhas precisam de revisão").replace("{count}", i.revisar.toLocaleString("pt-BR"))}
      </span>
    );
  }
  const contadores = (
    <span className="text-[12px] text-[#5A5964]">
      {t("{ok} importados · {skipped} pulados · {error} erros")
        .replace("{ok}", i.importadas.toLocaleString("pt-BR"))
        .replace("{skipped}", i.puladas.toLocaleString("pt-BR"))
        .replace("{error}", i.erros.toLocaleString("pt-BR"))}
    </span>
  );
  if (i.status === "falhou") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="line-clamp-2 max-w-[320px] text-[13px] text-[#D1264F]">{t("A importação falhou. Tente novamente ou fale com o suporte.")}</span>
        {processadas(i) > 0 ? contadores : null}
      </div>
    );
  }
  return contadores;
}

export function ListaDeImportacoes() {
  const t = useT();
  const idioma = useIdioma();
  const router = useRouter();
  const busca = useSearchParams();
  const [superficie, setSuperficie] = useState<"importacoes" | "exportacoes">(busca.get("superficie") === "exportacoes" ? "exportacoes" : "importacoes");
  const [tipo, setTipo] = useState<"todas" | "contato" | "negocio">("todas");
  const [pagina, setPagina] = useState(1);
  const [nova, setNova] = useState(false);
  const [perguntarRapido, setPerguntarRapido] = useState(false);
  const lista = useImportacoes(tipo, pagina, perguntarRapido);
  const cancelar = useCancelarImportacao();

  useEffect(() => {
    if (!perguntarRapido) return;
    const id = setTimeout(() => setPerguntarRapido(false), 30_000);
    return () => clearTimeout(id);
  }, [perguntarRapido]);

  const itens = lista.data?.itens ?? [];
  const total = lista.data?.total ?? 0;
  const COLUNA = "px-4 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#86858F] uppercase";

  return (
    <div className="flex min-h-[28rem] flex-col bg-surface">
      <AcompanharImportacoes />
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 px-[30px]">
        <h1 className="text-[20px] font-medium text-casca-texto">{superficie === "exportacoes" ? t("Exportações") : t("Importações")}</h1>
        {superficie === "importacoes" ? (
          <BotaoDaCasca type="button" variante="marca" onClick={() => setNova(true)}>
            <Upload aria-hidden />
            {t("Nova importação")}
          </BotaoDaCasca>
        ) : null}
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-casca-borda px-[30px] pt-1 pb-4">
        <Pilulas
          rotulo={t("Importações / Exportações")}
          valor={superficie}
          aoMudar={setSuperficie}
          opcoes={[
            ["importacoes", t("Importações")],
            ["exportacoes", t("Exportações")],
          ]}
        />
        {superficie === "importacoes" ? (
          <Pilulas
            rotulo={t("Tipo")}
            valor={tipo}
            aoMudar={(v) => {
              setTipo(v);
              setPagina(1);
            }}
            opcoes={[
              ["todas", t("Todas")],
              ["contato", t("Contatos")],
              ["negocio", t("Negócios")],
            ]}
          />
        ) : null}
      </div>

      {superficie === "exportacoes" ? (
        <TabelaDeExportacoes />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-[30px] pt-2">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-casca-borda">
                <th className={COLUNA}>{t("Importação")}</th>
                <th className={COLUNA}>{t("Data")}</th>
                <th className={COLUNA}>{t("Status")}</th>
                <th className={COLUNA}>{t("Resultado")}</th>
                <th className={COLUNA}>
                  <span className="sr-only">{t("Ações")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[13px] text-[#5A5964]">
                    {t("Carregando…")}
                  </td>
                </tr>
              ) : lista.isError ? (
                <tr>
                  <td colSpan={5} className="p-4 text-[13px] text-casca-alerta">
                    {t("Não foi possível carregar as importações.")}
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10">
                    <div className="mx-auto flex max-w-[360px] flex-col items-center gap-2 text-center">
                      <FileText size={28} aria-hidden className="text-[#86858F]" />
                      <p className="text-[14px] font-semibold text-casca-texto">{t("Nenhuma importação ainda")}</p>
                      <p className="text-[13px] text-[#5A5964]">
                        {t("Faça o upload de um arquivo CSV para criar ou atualizar contatos e negócios em massa.")}
                      </p>
                      <BotaoDaCasca type="button" variante="marca" onClick={() => setNova(true)}>
                        {t("Nova importação")}
                      </BotaoDaCasca>
                    </div>
                  </td>
                </tr>
              ) : (
                itens.map((i) => (
                  <tr
                    key={i.id}
                    className={cn(
                      "border-b border-casca-borda",
                      i.status === "aguardando_revisao" && "border-l-[3px] border-l-[#E8A400] bg-[#E8A400]/8",
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 text-[14px] font-medium text-casca-texto">{t(ROTULO_DO_TIPO[i.tipo])}</p>
                      <p className="line-clamp-1 text-[12px] text-[#5A5964]">
                        {i.arquivo}
                        {i.tipo === "negocio" && i.origem_nome ? ` · ${t("Origem: {origin}").replace("{origin}", i.origem_nome)}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#5A5964]">{dataEHora(i.created_at, idioma)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium", COR_DO_STATUS[i.status])}>
                        {t(ROTULO_DO_STATUS[i.status])}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Resultado i={i} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {i.status === "aguardando_revisao" ? (
                          <BotaoDaCasca type="button" variante="marca" tamanho="sm" onClick={() => router.push(`/app/imports/${i.id}?revisar=1`)}>
                            {t("Revisar")}
                          </BotaoDaCasca>
                        ) : null}
                        {RELATORIO.includes(i.status) ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/app/imports/${i.id}`)}
                            className="inline-flex h-[26px] items-center rounded-[6px] border border-[#D9D8E0] px-3 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
                          >
                            {t("Relatório")}
                          </button>
                        ) : null}
                        {i.status === "na_fila" || i.status === "importando" ? (
                          <BotaoDaCasca
                            type="button"
                            variante="texto"
                            tamanho="sm"
                            disabled={cancelar.isPending && cancelar.variables === i.id}
                            onClick={() => cancelar.mutate(i.id)}
                          >
                            {t("Cancelar")}
                          </BotaoDaCasca>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {total > PAGINA_DA_LISTA ? (
            <div className="py-3">
              <PaginacaoDaCasca
                pagina={pagina}
                total={total}
                porPagina={PAGINA_DA_LISTA}
                opcoesPorPagina={[PAGINA_DA_LISTA]}
                aoMudarPagina={setPagina}
                aoMudarPorPagina={() => setPagina(1)}
              />
            </div>
          ) : null}
        </div>
      )}
      <JanelaDeImportacao
        aberta={nova}
        aoFechar={() => setNova(false)}
        tipoInicial="contato"
        aoImportar={() => {
          setPagina(1);
          setPerguntarRapido(true);
        }}
      />
    </div>
  );
}
