import { monograma } from "@/lib/escale/conversas/setores";
import { cn } from "@/lib/utils";

const TAMANHO = {
  lista: "size-7 rounded-casca-gatilho text-[10px]",
  linha: "size-3.5 rounded-[3px] text-[7px]",
  cabecalho: "size-5 rounded-[4px] text-[9px]",
} as const;

/** O monograma colorido do setor: 28px na lista (c38), 14px na linha da fila (c87), 20px no cabeçalho (c02). */
export function MonogramaDoSetor({
  setor,
  tamanho = "lista",
  tracejado = false,
  className,
}: {
  setor: { nome: string; cor: string };
  tamanho?: keyof typeof TAMANHO;
  tracejado?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center leading-none font-bold text-white",
        TAMANHO[tamanho],
        tracejado && "outline-1 outline-offset-1 outline-casca-suave outline-dashed",
        className,
      )}
      style={{ backgroundColor: setor.cor }}
    >
      {monograma(setor.nome)}
    </span>
  );
}
