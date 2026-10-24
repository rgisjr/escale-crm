import type { ReactNode } from "react";

/** "RESULTADO" (010, 011): 10px/600 caixa alta, espaçado, na cor da marca. */
export function TituloDaSecao({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-6 pb-3 text-[10px] font-semibold tracking-[0.1em] text-casca-marca uppercase">
      {children}
    </h2>
  );
}
