import { IconeDoPainel } from "@/components/escale/indicadores/lista/QuadradoDoPainel";
import { SEM_ICONE, corDoPainel, iniciaisDoPainel } from "@/lib/escale/indicadores/paineis/aparencia";

/**
 * A CAPA DO CARD DO MODELO (10-005, U6, provisório): a Clint usa uma foto com o roxo dela; aqui é um bloco de
 * 128 px com a cor do modelo em degradê para a marca e o ícone grande e translúcido à direita.
 */
export function CapaDoModelo({ cor, icone, nome }: { cor: string; icone: string; nome: string }) {
  return (
    <div
      data-testid="capa-do-modelo"
      className="relative h-32 w-full overflow-hidden"
      style={{ backgroundImage: `linear-gradient(135deg, ${corDoPainel(cor)} 0%, var(--color-casca-marca-forte) 100%)` }}
    >
      <span aria-hidden className="absolute inset-y-0 right-4 grid place-items-center text-white opacity-30">
        {icone === SEM_ICONE ? (
          <span className="text-[40px] font-medium">{iniciaisDoPainel(nome)}</span>
        ) : (
          <IconeDoPainel icone={icone} tamanho={72} />
        )}
      </span>
    </div>
  );
}
