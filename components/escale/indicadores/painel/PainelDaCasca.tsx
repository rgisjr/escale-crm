import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

/**
 * O PAINEL ABERTO, MÍNIMO (fork Escale, Fase 7B; parte de 10-058): o cabeçalho com
 * o nome e o fundo branco. A 7C acrescenta o lápis, o atualizar, "Novo Chart +",
 * o ⋮, a barra de filtros e a grade.
 */
export function PainelDaCasca({ painel }: { painel: PainelDaLista }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <header className="flex h-12 shrink-0 items-center border-b border-casca-divisoria px-6">
        <h1 className="truncate text-[18px] font-normal text-casca-texto">{painel.nome}</h1>
      </header>
      <div className="flex-1 bg-surface" />
    </div>
  );
}
