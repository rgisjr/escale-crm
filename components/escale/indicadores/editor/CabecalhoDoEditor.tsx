"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { rotaDoPainel } from "@/lib/escale/indicadores/rotas";
import { ArrowLeft, Plus } from "@/lib/ui/icons-da-casca";

type Props = {
  modo: "novo" | "editar";
  /** O nome do gráfico ao editar. */
  nome: string | null;
  painelDeOrigem: { id: string; nome: string } | null;
  aoSalvar: () => void;
};

/** O cabeçalho do editor (10-012, 10-036, 10-059): título, "← painel" e "Adicionar ao dashboard +" / "Atualizar". Sem BETA nem IA. */
export function CabecalhoDoEditor({ modo, nome, painelDeOrigem, aoSalvar }: Props) {
  const t = useT();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-casca-divisoria px-6">
      <h1 className="max-w-[40%] truncate text-[16px] font-medium text-casca-texto">
        {modo === "editar" && nome ? nome : t("Charts")}
      </h1>
      {painelDeOrigem ? (
        <Link
          href={rotaDoPainel(painelDeOrigem.id)}
          className="inline-flex max-w-[30%] items-center gap-1 truncate text-[13px] text-casca-suave hover:text-casca-texto"
        >
          <ArrowLeft size={14} aria-hidden />
          <span className="truncate">{painelDeOrigem.nome}</span>
        </Link>
      ) : null}
      <button
        type="button"
        onClick={aoSalvar}
        className="ml-auto inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3 text-[13px] font-medium text-white hover:bg-casca-marca-forte"
      >
        {modo === "editar" ? t("Atualizar") : t("Adicionar ao dashboard")}
        {modo === "editar" ? null : <Plus size={16} aria-hidden />}
      </button>
    </header>
  );
}
