"use client";
import { useState, type ReactNode } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useVariaveisDisponiveis } from "@/hooks/escale/useVariaveisDisponiveis";
import { useT } from "@/hooks/i18n/useT";
import {
  filtrarGrupos,
  type CamposPorObjeto,
  type ChaveDoGrupo,
  type ExtraDasVariaveis,
} from "@/lib/variaveis/catalogo";
import { ChevronDown, ChevronUp, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O POPOVER "VARIÁVEIS" (fork Escale, Frente V): o seletor único de toda tela
 * que insere ou mapeia variável. Igual à Clint (prints v03 a v07 em
 * `docs/escale/clint/prints-variaveis/`): título, busca com a lupa à direita,
 * grupos em acordeão com só o 1º aberto, campos como chips na cor da marca, e
 * a busca abrindo todo grupo com resultado. `gatilho` é um elemento só (vai em
 * `asChild`).
 */
export function SeletorDeVariaveis({
  gatilho,
  aoEscolher,
  extras = [],
  adicionais,
  permitir,
  alinhar = "start",
}: {
  gatilho: ReactNode;
  aoEscolher: (token: string) => void;
  extras?: readonly ExtraDasVariaveis[];
  /** Campos que a tela conhece por outro caminho (ex.: os da origem, no playbook). */
  adicionais?: CamposPorObjeto;
  /** Só os tokens que a tela sabe resolver (a campanha lê menos dados que a automação). */
  permitir?: (token: string) => boolean;
  alinhar?: "start" | "center" | "end";
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const { grupos: todos } = useVariaveisDisponiveis(aberto, extras, adicionais);
  const grupos = permitir
    ? todos.map((g) => ({ ...g, itens: g.itens.filter((i) => permitir(i.token)) })).filter((g) => g.itens.length > 0)
    : todos;
  const [abertos, setAbertos] = useState<ReadonlySet<ChaveDoGrupo> | null>(null);
  const filtrados = filtrarGrupos(grupos, busca, t);
  const buscando = busca.trim() !== "";
  // Só o 1º grupo começa aberto; com busca, todo grupo com resultado abre.
  const estaAberto = (chave: ChaveDoGrupo) =>
    buscando || (abertos ? abertos.has(chave) : chave === grupos[0]?.chave);

  const mudar = (sim: boolean) => {
    setAberto(sim);
    if (!sim) {
      setBusca("");
      setAbertos(null);
    }
  };
  const alternar = (chave: ChaveDoGrupo) => {
    const atual = new Set(abertos ?? (grupos[0] ? [grupos[0].chave] : []));
    if (atual.has(chave)) atual.delete(chave);
    else atual.add(chave);
    setAbertos(atual);
  };

  return (
    <Popover open={aberto} onOpenChange={mudar}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso align={alinhar} className="w-[380px] max-w-[calc(100vw-32px)] p-0">
        <p className="border-b border-casca-borda px-4 py-3 text-[14px] font-semibold text-casca-texto">
          {t("Variáveis")}
        </p>
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <input
              type="search"
              autoFocus
              aria-label={t("Buscar variável")}
              placeholder={t("Buscar variável")}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-9 w-full rounded-[4px] border-0 bg-casca-raia pr-9 pl-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
            />
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-casca-suave"
            />
          </div>
        </div>
        <div className="max-h-[330px] overflow-y-auto px-3 pb-3">
          {filtrados.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-casca-suave">
              {t("Nenhuma variável encontrada")}
            </p>
          ) : (
            filtrados.map((g) => {
              const abertoAgora = estaAberto(g.chave);
              const Chevron = abertoAgora ? ChevronUp : ChevronDown;
              return (
                <div key={g.chave} role="group" aria-label={t(g.grupo)}>
                  <button
                    type="button"
                    aria-expanded={abertoAgora}
                    onClick={() => alternar(g.chave)}
                    disabled={buscando}
                    className="flex w-full items-center justify-between py-2 text-left text-[12px] font-medium tracking-[0.02em] text-casca-meta uppercase disabled:cursor-default"
                  >
                    {t(g.grupo)}
                    <Chevron size={16} aria-hidden className="text-casca-suave" />
                  </button>
                  {abertoAgora ? (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {g.itens.map((v) => (
                        <button
                          key={v.token}
                          type="button"
                          title={t(v.rotulo)}
                          onClick={() => {
                            aoEscolher(v.token);
                            mudar(false);
                          }}
                          className={cn(
                            "max-w-full truncate rounded-[4px] bg-casca-marca-suave px-2 py-0.5 text-[12px] text-casca-marca",
                            "hover:brightness-95 focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:outline-hidden",
                          )}
                        >
                          {t(v.rotulo)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
