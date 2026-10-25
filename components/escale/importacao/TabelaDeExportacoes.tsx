"use client";
import { rodando } from "@/components/escale/contatos/massa/textosDasAcoes";
import { useAcoesEmMassa } from "@/hooks/escale/useAcoesEmMassa";
import { useT } from "@/hooks/i18n/useT";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { dataEHora } from "@/lib/escale/importacao/relatorio";
import type { StatusVisivel } from "@/lib/escale/massa/tipos";
import { Download, FileText } from "@/lib/ui/icons-da-casca";

const ROTULO: Record<StatusVisivel, string> = {
  preparando: "Gerando exportação",
  aguardando_aprovacao: "Aguardando aprovação",
  na_fila: "Gerando exportação",
  processando: "Gerando exportação",
  concluida: "Concluída",
  falhou: "Erro",
  recusada: "Recusada",
  expirada: "Expirada",
};

const INTERVALO_MS = 5000;

/** Só pergunta de novo enquanto há exportação sendo gerada; parada, a tela não consulta. */
const intervaloDasExportacoes = (dados: { minhas: Array<{ acao: string; status: StatusVisivel }> } | undefined) =>
  dados?.minhas.some((a) => a.acao === "exportar" && rodando(a.status)) ? INTERVALO_MS : false;

/** A superfície "Exportações" da página Importações (N15): as minhas exportações da 2B, com o download. */
export function TabelaDeExportacoes() {
  const t = useT();
  const idioma = useIdioma();
  const acoes = useAcoesEmMassa(true, intervaloDasExportacoes);
  const exportacoes = (acoes.data?.minhas ?? []).filter((a) => a.acao === "exportar");
  const COLUNA = "px-4 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#86858F] uppercase";
  return (
    <div className="min-h-0 flex-1 overflow-auto px-[30px] pt-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-casca-borda">
            <th className={COLUNA}>{t("Exportação")}</th>
            <th className={COLUNA}>{t("Data")}</th>
            <th className={COLUNA}>{t("Status")}</th>
            <th className={COLUNA}>
              <span className="sr-only">{t("Ações")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {acoes.isLoading ? (
            <tr>
              <td colSpan={4} className="py-10 text-center text-[13px] text-[#5A5964]">
                {t("Carregando…")}
              </td>
            </tr>
          ) : acoes.isError && !acoes.data ? (
            <tr>
              <td colSpan={4} className="py-10">
                <div role="alert" className="mx-auto flex max-w-[360px] flex-col items-center gap-2 text-center">
                  <p className="text-[14px] font-semibold text-casca-texto">{t("Não foi possível carregar as exportações.")}</p>
                  <button type="button" onClick={() => void acoes.refetch()} className="text-[13px] font-semibold text-casca-marca hover:underline">
                    {t("Tentar de novo")}
                  </button>
                </div>
              </td>
            </tr>
          ) : exportacoes.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-10">
                <div className="mx-auto flex max-w-[360px] flex-col items-center gap-2 text-center">
                  <FileText size={28} aria-hidden className="text-[#86858F]" />
                  <p className="text-[14px] font-semibold text-casca-texto">{t("Nenhuma exportação ainda")}</p>
                  <p className="text-[13px] text-[#5A5964]">
                    {t("Quando você exportar contatos, negócios, campanhas ou a carteira em CSV, os arquivos aparecem aqui.")}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            exportacoes.map((e) => (
              <tr key={e.id} className="border-b border-casca-borda">
                <td className="px-4 py-3 text-[14px] font-medium text-casca-texto">{t("Contatos")}</td>
                <td className="px-4 py-3 text-[13px] text-[#5A5964]">{dataEHora(e.created_at, idioma)}</td>
                <td className="px-4 py-3 text-[13px] text-casca-texto">{t(ROTULO[e.status])}</td>
                <td className="px-4 py-3 text-right">
                  {e.status === "concluida" && e.tem_arquivo ? (
                    <a
                      href={`/api/v1/acoes-em-massa/${e.id}/arquivo`}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-casca-marca hover:underline"
                    >
                      <Download size={12} aria-hidden />
                      {t("Baixar exportação")}
                    </a>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
