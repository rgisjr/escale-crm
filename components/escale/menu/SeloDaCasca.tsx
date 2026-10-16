import { textoDoSelo } from "@/lib/escale/menu-do-topo";
import { cn } from "@/lib/utils";

/**
 * O selo vermelho da Clint (`#FF4B4C`, texto branco em negrito): "99+" ao lado
 * de "Atendimento" no topo e "+9" no botão de conversas. Quem usa decide o
 * tamanho por `className`, porque cada lugar tem a sua medida no print.
 */
export function SeloDaCasca({
  valor,
  limite,
  rotulo,
  className,
}: {
  valor: number;
  limite: 9 | 99;
  rotulo: string;
  className?: string;
}) {
  const texto = textoDoSelo(valor, limite);
  if (texto === null) return null;
  return (
    <span
      data-testid="selo-da-casca"
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-casca-alerta font-bold leading-none text-white tabular-nums",
        className,
      )}
    >
      {texto}
    </span>
  );
}
