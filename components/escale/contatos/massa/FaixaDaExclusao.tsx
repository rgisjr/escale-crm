"use client";

import { useT } from "@/hooks/i18n/useT";

/**
 * A FAIXA DA EXCLUSÃO EM ANDAMENTO (fork Escale): fixa no topo da lista, no
 * estilo da faixa da seleção, enquanto uma exclusão em massa desta pessoa está
 * na fila ou processando. Some sozinha quando termina.
 */
export function FaixaDaExclusao({
  emAndamento,
  total,
  feitos,
}: {
  emAndamento: boolean;
  total: number;
  feitos: number;
}) {
  const t = useT();
  if (!emAndamento) return null;
  const totalBr = total.toLocaleString("pt-BR");
  return (
    <div
      role="status"
      className="flex h-9 shrink-0 items-center justify-center gap-2 bg-casca-marca-suave px-6 text-[13px] text-casca-texto"
    >
      <span>{t("Excluindo {total} contatos…").replace("{total}", totalBr)}</span>
      <span className="font-medium text-casca-marca">
        {t("{feitos} de {total}")
          .replace("{feitos}", feitos.toLocaleString("pt-BR"))
          .replace("{total}", totalBr)}
      </span>
    </div>
  );
}
