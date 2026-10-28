"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";
import { rotaDoPainel } from "@/lib/escale/indicadores/rotas";

import { MenuDoPainel } from "./MenuDoPainel";
import { QuadradoDoPainel } from "./QuadradoDoPainel";

/** "dd/mm/aaaa" no fuso da organização (a Clint mostra DD/MM/AA; regra 5 do CLAUDE.md). */
export function dataDoCard(iso: string, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );
}

/**
 * O CARD DO PAINEL (10-001, 10-002): 85 px, quadrado de 36 px, nome e "Criado em".
 * O link e o ⋮ são irmãos (botão dentro de link não é HTML válido); o card inteiro
 * leva ao painel pelo link, que ocupa o espaço todo menos o ⋮.
 */
export function CardDoPainel({
  painel,
  fuso,
  podeGerir,
  aoEditar,
}: {
  painel: PainelDaLista;
  fuso: string;
  podeGerir: boolean;
  aoEditar: (p: PainelDaLista) => void;
}) {
  const t = useT();
  return (
    <div className="group relative flex h-[85px] items-center rounded-[6px] border border-casca-borda bg-surface pr-3 shadow-xs transition-shadow hover:shadow-md">
      <Link
        href={rotaDoPainel(painel.id)}
        className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-[6px] pl-3 focus-visible:outline-2 focus-visible:outline-casca-marca"
      >
        <QuadradoDoPainel cor={painel.cor} icone={painel.icone} nome={painel.nome} tamanho={36} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium text-casca-texto">{painel.nome}</span>
          <span className="text-[11px] text-casca-suave">
            {t("Criado em {data}").replace("{data}", dataDoCard(painel.criadoEm, fuso))}
          </span>
        </span>
      </Link>
      {podeGerir ? <MenuDoPainel painel={painel} aoEditar={aoEditar} /> : null}
    </div>
  );
}
