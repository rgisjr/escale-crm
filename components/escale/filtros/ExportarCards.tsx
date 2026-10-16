"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { apiClient } from "@/lib/api/client";
import { baixarCsv } from "@/lib/escale/exportar/baixar";
import { csvDoQuadro, nomeDoArquivo } from "@/lib/escale/exportar/csv-do-quadro";
import type { Stage } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";
import { Download, RefreshCw, X } from "@/lib/ui/icons-da-casca";

export interface ExportacaoDoQuadro {
  origem: { id: string; nome: string };
  /** Os cards que a tela mostra agora (o recorte, com os filtros): é o que sai no arquivo. */
  leads: readonly Lead[];
  stages: readonly Stage[];
  settings?: Record<string, unknown>;
}

/**
 * O EXPORTAR (fork Escale, Fase 1E; E11): o ícone da linha de contagem no lugar
 * da Clint v1 (print 16a) e a janela "Confirme sua ação" da Clint v2 (v2-03). A
 * trava é a rota (gerente ou acima, com auditoria), chamada ANTES do download. Os
 * nomes dos donos vêm do mesmo cache do quadro, e só são pedidos com a janela aberta.
 */
export function ExportarCards({ origem, leads, stages, settings }: ExportacaoDoQuadro) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { data: membros, isLoading: carregandoMembros } = useAssignableMembers(aberta);
  const vazio = leads.length === 0;
  const dica = vazio
    ? t("Nenhum negócio para exportar.")
    : (leads.length === 1 ? t("Exportar {n} Negócio") : t("Exportar {n} Negócios")).replace(
        "{n}",
        String(leads.length),
      );

  async function exportar() {
    setExportando(true);
    try {
      // A trava de papel vem ANTES do arquivo: sem o 201 (gerente+ e origem visível), não há exportação.
      await apiClient.post("/api/v1/exportacoes-do-quadro", {
        origem: origem.id,
        quantidade: leads.length,
      });
      const nomes = new Map((membros ?? []).map((m) => [m.user_id, m.full_name ?? ""]));
      const csv = csvDoQuadro({
        leads,
        stages,
        campos: camposDoFunil(settings ?? null),
        t,
        nomeDoDono: (l) =>
          l.owner_kind === "ai"
            ? (l.owner_agent?.name ?? "")
            : l.owner_user_id
              ? (nomes.get(l.owner_user_id) ?? "")
              : "",
      });
      baixarCsv(nomeDoArquivo(origem.nome, new Date()), csv);
      toast.success(t("Os negócios foram exportados com sucesso."));
      setAberta(false);
    } catch {
      toast.error(t("Falha ao exportar os negócios, tente novamente ou chame o suporte."));
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <BotaoDaCasca
        type="button"
        variante="icone"
        disabled={vazio || exportando}
        aria-label={t("Exportar")}
        title={dica}
        onClick={() => setAberta(true)}
        // O BotaoDaCasca desligado tem `pointer-events-none`; sem o `auto`, a dica não apareceria.
        className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:text-[#BDBDBD]"
      >
        {exportando ? (
          <RefreshCw size={16} aria-hidden className="animate-spin" />
        ) : (
          <Download size={16} aria-hidden />
        )}
      </BotaoDaCasca>
      <DialogPrimitive.Root open={aberta} onOpenChange={(a) => !exportando && setAberta(a)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/48" />
          <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 w-[min(576px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] rounded-[8px] bg-surface text-casca-texto shadow-casca-painel">
            <div className="flex h-14 items-center justify-between border-b border-[#E4E4E9] px-5">
              <DialogTitle className="text-base font-medium">{t("Confirme sua ação")}</DialogTitle>
              <DialogPrimitive.Close
                aria-label={t("Fechar")}
                className="grid size-6 place-items-center text-[#86858F] hover:text-casca-texto"
              >
                <X size={16} aria-hidden />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="px-6 py-6 text-[13px] text-[#5A5964]">
              {t("Tem certeza que deseja exportar os negócios dessa origem?")}
            </DialogPrimitive.Description>
            <div className="flex justify-end gap-3 border-t border-[#E4E4E9] px-3 py-3">
              <button
                type="button"
                onClick={() => setAberta(false)}
                disabled={exportando}
                className="h-8 rounded-[6px] border border-[#E4E4E9] px-4 text-[13px] font-medium hover:bg-[#EFEFF2]"
              >
                {t("Cancelar")}
              </button>
              <button
                type="button"
                onClick={() => void exportar()}
                disabled={exportando || carregandoMembros}
                title={carregandoMembros ? t("Carregando…") : undefined}
                className="h-8 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("Confirmar")}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>
    </>
  );
}
