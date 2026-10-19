import { iniciaisDaEmpresa } from "@/lib/escale/empresas/regras";

/** O quadrado com as iniciais da empresa (04-001): 44px, canto 6, fundo lilás claro. */
export function Monograma({ nome, tamanho = 44 }: { nome: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: tamanho, height: tamanho }}
      className="inline-flex shrink-0 items-center justify-center rounded-[6px] bg-casca-marca-suave text-[13px] font-medium text-casca-marca"
    >
      {iniciaisDaEmpresa(nome)}
    </span>
  );
}
