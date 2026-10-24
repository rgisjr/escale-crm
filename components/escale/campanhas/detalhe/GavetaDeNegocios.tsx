"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useNegociosDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import { dataBr, numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DO_STATUS_DO_NEGOCIO,
  TITULO_DA_GAVETA,
  reaisBr,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { csvDosNegocios, nomeDoCsvDaCampanha } from "@/lib/escale/campanhas/detalhe/csv";
import type { SituacaoDosNegocios } from "@/lib/escale/campanhas/detalhe/tipos";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { baixarCsv } from "@/lib/escale/exportar/baixar";
import { X } from "@/lib/ui/icons-da-casca";

const COLUNAS = ["Contato", "Telefone", "Origem", "Status", "Valor", "Criado em"] as const;

/**
 * A GAVETA "NEGÓCIOS CRIADOS" (material 2.3; N5; sem print, provisória): à
 * direita, 720px; o título da situação, "{n} negócios gerados por {campanha}",
 * a tabela (até 200), "{n} de {total}", "Baixar CSV" e "Fechar".
 */
export function GavetaDeNegocios({
  campanhaId,
  nomeDaCampanha,
  situacao,
  aoFechar,
  fuso,
}: {
  campanhaId: string;
  nomeDaCampanha: string;
  situacao: SituacaoDosNegocios | null;
  aoFechar: () => void;
  fuso?: string;
}) {
  const t = useT();
  const consulta = useNegociosDaCampanha(campanhaId, situacao ?? "todos", situacao !== null);
  const linhas = consulta.data?.linhas ?? [];
  const total = consulta.data?.total ?? 0;
  const botao =
    "inline-flex h-8 items-center rounded-casca-gatilho px-3.5 text-[13px] font-medium transition-colors disabled:opacity-60";
  return (
    <DialogPrimitive.Root open={situacao !== null} onOpenChange={(a) => !a && aoFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/30" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(720px,100vw)] flex-col bg-surface text-casca-texto shadow-casca-painel focus:outline-hidden"
        >
          <header className="flex items-start justify-between gap-4 border-b border-casca-divisoria px-6 py-4">
            <div>
              <DialogTitle className="text-[16px] font-semibold">
                {t(TITULO_DA_GAVETA[situacao ?? "todos"])}
              </DialogTitle>
              <p className="mt-1 text-[12px] text-casca-suave">
                {t("{n} negócios gerados por {campanha}")
                  .replace("{n}", numeroBr(total))
                  .replace("{campanha}", nomeDaCampanha)}
              </p>
            </div>
            <DialogPrimitive.Close
              aria-label={t("Fechar")}
              className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
            >
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {consulta.isError ? (
              <div className="py-10 text-center text-[13px]">
                <p>{t("Não foi possível carregar os negócios.")}</p>
                <button
                  type="button"
                  onClick={() => void consulta.refetch()}
                  className="mt-2 font-medium text-casca-marca"
                >
                  {t("Tentar novamente")}
                </button>
              </div>
            ) : !consulta.isLoading && linhas.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[14px] font-semibold">{t("Nenhum negócio encontrado")}</p>
                <p className="mt-1 text-[13px] text-casca-suave">
                  {t("Os negócios criados por esta campanha aparecerão aqui.")}
                </p>
              </div>
            ) : (
              <table className="w-full table-fixed text-[12px]">
                <thead>
                  <tr className="h-10 border-b border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] uppercase">
                    {COLUNAS.map((c) => (
                      <th key={c} scope="col" className="pr-3">
                        {t(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.id} className="h-11 border-b border-casca-divisoria">
                      <td className="truncate pr-3">{l.contato}</td>
                      <td className="pr-3">{formatarTelefone(l.telefone) || "-"}</td>
                      <td className="truncate pr-3">{l.origem}</td>
                      <td className="pr-3">{t(ROTULO_DO_STATUS_DO_NEGOCIO[l.status])}</td>
                      <td className="pr-3">{reaisBr(l.valorCentavos)}</td>
                      <td>{dataBr(l.criadoEm, fuso)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-casca-divisoria px-6 py-3">
            <span className="text-[13px]">
              {t("{n} de {total}")
                .replace("{n}", numeroBr(linhas.length))
                .replace("{total}", numeroBr(total))}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={linhas.length === 0}
                onClick={() =>
                  baixarCsv(
                    `negocios-${nomeDoCsvDaCampanha(nomeDaCampanha, new Date(), fuso)}`,
                    csvDosNegocios(linhas, t, fuso),
                  )
                }
                className={`${botao} border border-casca-borda bg-surface hover:bg-casca-raia`}
              >
                {t("Baixar CSV")}
              </button>
              <button
                type="button"
                onClick={aoFechar}
                className={`${botao} bg-casca-marca text-white hover:bg-casca-marca-forte`}
              >
                {t("Fechar")}
              </button>
            </span>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
