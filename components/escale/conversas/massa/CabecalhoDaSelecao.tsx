"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";

/** A linha "Selecionar todos" / "{n} selecionados" com o X vermelho (c25, c82, c83). A caixinha marca as linhas carregadas (N12). */
export function CabecalhoDaSelecao({
  estado,
  selecionadas,
  aoMarcarCarregadas,
  aoSair,
}: {
  estado: boolean | "indeterminada";
  selecionadas: number;
  aoMarcarCarregadas: (marcar: boolean) => void;
  aoSair: () => void;
}) {
  const t = useT();
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-casca-borda px-3">
      <CaixaDaCasca
        marcada={estado}
        aoMudar={aoMarcarCarregadas}
        aria-label={t("Selecionar todos")}
      />
      <span className="flex-1 text-[13px] font-medium text-casca-texto">
        {selecionadas > 0
          ? `${selecionadas.toLocaleString("pt-BR")} ${t("selecionados")}`
          : t("Selecionar todos")}
      </span>
      <button
        type="button"
        aria-label={t("Sair de ação em massa")}
        title={t("Sair de ação em massa")}
        onClick={aoSair}
        className="grid size-6 place-items-center rounded-casca-gatilho text-casca-alerta hover:bg-casca-raia"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
