"use client";

import { useT } from "@/hooks/i18n/useT";
import { tirarDoFiltroFixo, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import type { FiltroFixo } from "@/lib/escale/indicadores/pergunta";
import { X } from "@/lib/ui/icons-da-casca";

type Props = {
  rascunho: RascunhoDoGrafico;
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
};

const ROTULOS: readonly { chave: keyof FiltroFixo; rotulo: string }[] = [
  { chave: "usuarios", rotulo: "Usuário ({n})" },
  { chave: "gruposDeOrigem", rotulo: "Grupo de origem ({n})" },
  { chave: "origens", rotulo: "Origem ({n})" },
  { chave: "tags", rotulo: "Tags ({n})" },
];

function quantos(f: FiltroFixo, chave: keyof FiltroFixo): number {
  if (chave === "tags") return f.tags?.grupos.reduce((soma, g) => soma + g.condicoes.length, 0) ?? 0;
  return f[chave]?.length ?? 0;
}

/** "Filtros do modelo" (Fase 7F, U4): mostra o filtro fixo que veio do modelo e deixa tirar cada chave. Sem print da Clint (provisório). */
export function FiltrosDoModeloNoEditor({ rascunho, mudar }: Props) {
  const t = useT();
  const fixo = rascunho.filtroFixo;
  if (!fixo) return null;
  const chips = ROTULOS.map((r) => ({ ...r, n: quantos(fixo, r.chave) })).filter((r) => r.n > 0);
  if (chips.length === 0) return null;
  return (
    <section aria-label={t("Filtros do modelo")} className="mt-10">
      <h3 className="text-[12px] font-medium text-casca-texto">{t("Filtros do modelo")}</h3>
      <p className="mt-1 text-[11px] text-casca-suave">{t("Aplicados sempre, junto com os filtros do dashboard.")}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {chips.map((c) => {
          const texto = t(c.rotulo).replace("{n}", String(c.n));
          return (
            <li key={c.chave} className="inline-flex h-6 items-center gap-1 rounded-[4px] bg-casca-raia px-2 text-[11px] text-casca-texto">
              {texto}
              <button
                type="button"
                aria-label={t("Remover {nome}").replace("{nome}", texto)}
                onClick={() => mudar((r) => tirarDoFiltroFixo(r, c.chave))}
                className="grid size-3 place-items-center text-casca-suave hover:text-casca-texto"
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
