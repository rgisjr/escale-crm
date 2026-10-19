"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, ChevronUp } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface OpcaoDoFiltro<V extends string> {
  valor: V;
  rotulo: string;
  grupo?: string;
  selo?: string;
  desabilitada?: boolean;
}

function agrupar<V extends string>(opcoes: readonly OpcaoDoFiltro<V>[]) {
  const blocos: Array<{ grupo?: string; itens: OpcaoDoFiltro<V>[] }> = [];
  for (const o of opcoes) {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.grupo === o.grupo) ultimo.itens.push(o);
    else blocos.push({ grupo: o.grupo, itens: [o] });
  }
  return blocos;
}

/**
 * O SELETOR DOS FILTROS DA FILA (fork Escale, Fase 3D; o select da Clint em c65,
 * c67–c70, c35, c77, c79, c80): gatilho de 32px cinza com "Selecione...", que fica
 * branco com a borda da marca aberto; a lista com caixinhas (38px), os grupos em
 * caixa alta e o selo ("Desconectado"). `multiplo={false}` escolhe um e fecha.
 * `limite` desliga as não marcadas quando chega nele (Agentes: 20).
 */
export function SeletorDoFiltro<V extends string>({
  valores,
  opcoes,
  aoMudar,
  multiplo = true,
  vazio,
  "aria-label": rotulo,
  desabilitado = false,
  dica,
  limite,
}: {
  valores: readonly V[];
  opcoes: readonly OpcaoDoFiltro<V>[];
  aoMudar: (valores: V[]) => void;
  multiplo?: boolean;
  vazio?: string;
  "aria-label": string;
  desabilitado?: boolean;
  dica?: string;
  limite?: number;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const nomes = opcoes.filter((o) => valores.includes(o.valor)).map((o) => o.rotulo);
  const cheio = limite !== undefined && valores.length >= limite;

  function alternar(v: V, marcar: boolean) {
    if (!multiplo) {
      aoMudar(marcar ? [v] : []);
      setAberto(false);
      return;
    }
    aoMudar(marcar ? [...valores.filter((x) => x !== v), v] : valores.filter((x) => x !== v));
  }

  return (
    <Popover open={aberto && !desabilitado} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={rotulo}
          aria-expanded={aberto}
          disabled={desabilitado}
          title={desabilitado ? dica : undefined}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-casca-gatilho border px-2.5 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-60",
            aberto ? "border-casca-marca bg-surface" : "border-transparent bg-casca-busca",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              nomes.length ? "text-casca-texto" : "text-casca-meta",
            )}
          >
            {nomes.length ? nomes.join(", ") : (vazio ?? t("Selecione..."))}
          </span>
          {aberto ? (
            <ChevronUp size={14} aria-hidden className="shrink-0 text-casca-suave" />
          ) : (
            <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-suave" />
          )}
        </button>
      </PopoverTrigger>
      <PainelSuspenso
        aria-label={rotulo}
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-1"
      >
        <div className="max-h-[360px] overflow-y-auto">
          {opcoes.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-casca-suave">{t("Nenhuma opção.")}</p>
          ) : null}
          {agrupar(opcoes).map((b, i) => (
            <div key={b.grupo ?? `bloco-${i}`} role="group" aria-label={b.grupo}>
              {b.grupo ? (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-meta uppercase">
                  {b.grupo}
                </p>
              ) : null}
              {b.itens.map((o) => {
                const marcada = valores.includes(o.valor);
                const bloqueada = !!o.desabilitada || (!marcada && cheio);
                return multiplo ? (
                  <div
                    key={o.valor}
                    title={bloqueada ? dica : undefined}
                    className={cn(
                      "flex h-[38px] items-center gap-2 rounded-[4px] px-3 hover:bg-casca-raia",
                      marcada && "bg-casca-marca-suave",
                    )}
                  >
                    <CaixaDaCasca
                      marcada={marcada}
                      aoMudar={(m) => alternar(o.valor, m)}
                      rotulo={o.rotulo}
                      desabilitada={bloqueada}
                    />
                    {o.selo ? (
                      <span className="rounded-[4px] bg-casca-raia px-1.5 text-[11px] text-casca-suave">
                        {o.selo}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <button
                    key={o.valor}
                    type="button"
                    role="option"
                    aria-selected={marcada}
                    onClick={() => alternar(o.valor, !marcada)}
                    className={cn(
                      "flex h-[38px] w-full items-center rounded-[4px] px-3 text-left text-[13px] hover:bg-casca-raia",
                      marcada ? "text-casca-marca" : "text-casca-texto",
                    )}
                  >
                    {o.rotulo}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
