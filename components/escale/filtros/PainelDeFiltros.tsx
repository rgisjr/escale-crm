"use client";
import { useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import {
  contarPorSecao,
  limparSecao,
  type FiltrosDoQuadro,
  type SecaoDeFiltro,
} from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import {
  CaretDown,
  CaretUp,
  ChatCircle,
  ClipboardText,
  DotsThree,
  Funnel,
  Kanban,
  Tag,
  X,
} from "@/lib/ui/icons";

import { SecaoCampos } from "./SecaoCampos";
import { SecaoConversas } from "./SecaoConversas";
import { SecaoNegocio } from "./SecaoNegocio";
import { SecaoOutros } from "./SecaoOutros";
import { SecaoTags } from "./SecaoTags";

const SECOES: ReadonlyArray<{
  id: SecaoDeFiltro;
  titulo: string;
  Icone: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}> = [
  { id: "negocio", titulo: "Negócio", Icone: Kanban },
  { id: "conversas", titulo: "Conversas", Icone: ChatCircle },
  { id: "tags", titulo: "Tags", Icone: Tag },
  { id: "campos", titulo: "Campos", Icone: ClipboardText },
  { id: "outros", titulo: "Outros", Icone: DotsThree },
];

/**
 * O BOTÃO "FILTROS" E O PAINEL DE ACORDEÕES (fork Escale, Fase 1D; ficha 01-018
 * da Clint): Negócio, Conversas, Tags, Campos e Outros. Cada seção mostra quantos
 * critérios tem ligados e um X que limpa só ela. Filtros de seções diferentes se
 * somam.
 */
export function PainelDeFiltros({
  filtros,
  onMudar,
  leads,
  campos,
  settings,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
  campos: readonly CampoFiltravel[];
  settings?: Record<string, unknown>;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<SecaoDeFiltro | null>("negocio");
  const contagem = contarPorSecao(filtros);
  const total = SECOES.reduce((soma, s) => soma + contagem[s.id], 0);

  function corpo(id: SecaoDeFiltro) {
    if (id === "negocio")
      return <SecaoNegocio filtros={filtros} onMudar={onMudar} leads={leads} settings={settings} />;
    if (id === "conversas") return <SecaoConversas filtros={filtros} onMudar={onMudar} />;
    if (id === "tags") return <SecaoTags filtros={filtros} onMudar={onMudar} leads={leads} />;
    if (id === "campos") return <SecaoCampos filtros={filtros} onMudar={onMudar} campos={campos} />;
    return <SecaoOutros filtros={filtros} onMudar={onMudar} />;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Funnel size={16} aria-hidden />
          {t("Filtros")}
          {total > 0 ? (
            <span className="rounded-full bg-accent/15 px-1.5 text-xs font-semibold text-accent">
              {total}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={t("Filtros")}
        className="max-h-[70vh] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto p-0"
      >
        {SECOES.map((secao) => {
          const { id, Icone } = secao;
          return (
            <section key={id} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  aria-expanded={aberta === id}
                  onClick={() => setAberta(aberta === id ? null : id)}
                  className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                >
                  <Icone size={16} aria-hidden />
                  <span>{t(secao.titulo)}</span>
                  {contagem[id] > 0 ? (
                    <span className="rounded-md bg-accent/15 px-1.5 text-xs text-accent">
                      {contagem[id]}
                    </span>
                  ) : null}
                  <span className="ml-auto text-muted-foreground">
                    {aberta === id ? (
                      <CaretUp size={14} aria-hidden />
                    ) : (
                      <CaretDown size={14} aria-hidden />
                    )}
                  </span>
                </button>
                {contagem[id] > 0 ? (
                  <button
                    type="button"
                    aria-label={`${t("Limpar")}: ${t(secao.titulo)}`}
                    onClick={() => onMudar(limparSecao(filtros, id))}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
              {aberta === id ? <div className="px-4 pb-4">{corpo(id)}</div> : null}
            </section>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
