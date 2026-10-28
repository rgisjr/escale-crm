"use client";
import { useState } from "react";

import { GrupoDoFiltro } from "@/components/escale/contatos/filtros/PecasDoFiltro";
import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useGruposDasOrigens } from "@/hooks/escale/useGruposDasOrigens";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { atalhoDaCasca, periodoDoCalendario, textoDoPeriodoDoPainel } from "@/lib/escale/indicadores/painel/filtro";
import type { FiltroDoPainel, Periodo } from "@/lib/escale/indicadores/pergunta";
import { periodoDoAtalho } from "@/lib/escale/ui/periodos";
import { Calendar, X } from "@/lib/ui/icons-da-casca";

/** O período que o calendário mostra: as datas do atalho (calculadas hoje) ou as escolhidas. */
function datasDoPeriodo(p: Periodo | undefined, hoje: Date): { de?: string; ate?: string } {
  if (!p) return {};
  if (p.atalho === "personalizado") return { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) };
  const casca = atalhoDaCasca(p.atalho);
  return casca ? periodoDoAtalho(casca, hoje) : {};
}

function CampoDePeriodo({ periodo, aoMudar }: { periodo: Periodo | undefined; aoMudar: (p: Periodo | undefined) => void }) {
  const t = useT();
  const [hoje] = useState(() => new Date());
  return (
    <span className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Período")}
            className="flex h-8 w-full items-center justify-between rounded-casca-gatilho bg-casca-busca px-2.5 text-left text-[13px]"
          >
            <span className={periodo ? "text-casca-texto" : "text-casca-meta"}>
              {periodo ? textoDoPeriodoDoPainel(periodo, t) : t("Selecione uma data")}
            </span>
            <Calendar size={14} aria-hidden className="text-casca-suave" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-auto p-0">
          <CalendarioDePeriodo
            valor={{ tipo: "criacao", ...datasDoPeriodo(periodo, hoje) }}
            semAbas
            aoMudar={(p) => {
              if (p.de && p.ate) aoMudar(periodoDoCalendario(p.de, p.ate, hoje));
            }}
          />
        </PainelSuspenso>
      </Popover>
      {periodo ? (
        <button
          type="button"
          aria-label={`${t("Limpar")} ${t("Período")}`}
          onClick={() => aoMudar(undefined)}
          className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
        >
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

/** Segmentação (prints 10-025, 10-027): período, usuário, grupo de origem e origem. */
export function SecaoSegmentacao({
  filtro,
  aoMudar,
  opcoes,
}: {
  filtro: FiltroDoPainel;
  aoMudar: (f: FiltroDoPainel) => void;
  opcoes: OpcoesDoFiltro;
}) {
  const t = useT();
  const membros = useAssignableMembers(true);
  const grupos = useGruposDasOrigens();
  return (
    <>
      <GrupoDoFiltro rotulo={t("Período")}>
        <CampoDePeriodo
          periodo={filtro.periodo}
          aoMudar={(periodo) => {
            const { periodo: _, ...resto } = filtro;
            aoMudar(periodo ? { ...resto, periodo } : resto);
          }}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Usuário")}>
        <SeletorMultiploDaCasca
          valores={filtro.usuarios ?? []}
          opcoes={(membros.data ?? []).map((m) => ({ valor: m.user_id, rotulo: m.full_name ?? t("Sem nome") }))}
          aoMudar={(usuarios) => aoMudar({ ...filtro, usuarios })}
          aria-label={t("Usuário")}
          vazio={t("Selecione usuários")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Grupo de origem")}>
        <SeletorMultiploDaCasca
          valores={filtro.gruposDeOrigem ?? []}
          opcoes={(grupos.data ?? []).map((g) => ({ valor: g.id, rotulo: g.nome }))}
          aoMudar={(gruposDeOrigem) => aoMudar({ ...filtro, gruposDeOrigem })}
          aria-label={t("Grupo de origem")}
          vazio={t("Selecione grupos de origem")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Origem")}>
        <SeletorMultiploDaCasca
          valores={filtro.origens ?? []}
          opcoes={opcoes.origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
          aoMudar={(origens) => aoMudar({ ...filtro, origens })}
          aria-label={t("Origem")}
          vazio={t("Selecione origens")}
        />
      </GrupoDoFiltro>
    </>
  );
}
