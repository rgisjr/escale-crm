"use client";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { useT } from "@/hooks/i18n/useT";
import { Plus } from "@/lib/ui/icons-da-casca";

/**
 * A COLUNA TRACEJADA "+ NOVA ETAPA" (fork Escale, Fase 1L; Clint `CreateStage`, print de 24/10):
 * caixa de borda tracejada de 2px na cor do "Nova atividade", raio 8, 201px de largura e
 * o botão "+ Nova Etapa" no meio. Só acrescenta ao rascunho.
 */
export function NovaEtapa({ aoCriar }: { aoCriar: () => void }) {
  const t = useT();
  return (
    <div className="mr-5 flex min-h-[340px] w-[201px] shrink-0 items-center justify-center rounded-[8px] border-2 border-dashed border-casca-novo">
      <DicaEscura texto={t("Adicionar uma nova etapa")}>
        <button
          type="button"
          onClick={aoCriar}
          className="flex items-center gap-3 rounded-[4px] border border-casca-borda bg-surface px-6 py-1.5 text-[13px] text-casca-texto hover:bg-casca-raia"
        >
          <Plus size={13} aria-hidden />
          {t("Nova Etapa")}
        </button>
      </DicaEscura>
    </div>
  );
}
