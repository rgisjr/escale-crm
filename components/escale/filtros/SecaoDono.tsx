"use client";
import { useState } from "react";

import { useUser } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { agentOwnerFilter } from "@/lib/kanban/filters";
import { Check } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CLASSE_DO_CAMPO } from "./controles";

const BUSCA_A_PARTIR_DE = 8;
const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/**
 * "DONO DO NEGÓCIO" (fork Escale, Casca V4; gatilho da barra da Clint, print da
 * barra de 15/10). O conteúdo aberto não tem print (PRINT 27): é a lista do
 * react-select aberto da Clint (`menuIsOpen` no bundle), com a régua da 1D —
 * Todos, Eu, Sem responsável, a equipe e os agentes. Escolher fecha o painel.
 */
export function SecaoDono({
  filtros,
  onMudar,
  onEscolher,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  onEscolher?: () => void;
}) {
  const t = useT();
  const user = useUser();
  const { data: membros } = useAssignableMembers(true);
  const { data: agentes } = useAssignableAgents(true);
  const [busca, setBusca] = useState("");
  const atual = filtros.dono && filtros.dono !== "any" ? filtros.dono : "";

  const opcoes = [
    { valor: "", rotulo: t("Todos") },
    { valor: user.id, rotulo: t("Eu") },
    { valor: "unassigned", rotulo: t("Sem responsável") },
    ...(membros ?? [])
      .filter((m) => m.user_id !== user.id)
      .map((m) => ({ valor: m.user_id, rotulo: m.full_name ?? t("Sem nome") })),
    ...(agentes ?? []).map((a) => ({ valor: agentOwnerFilter(a.agent_id), rotulo: a.name })),
  ];
  const comBusca = opcoes.length >= BUSCA_A_PARTIR_DE;
  const termo = normalizar(busca);
  const visiveis =
    comBusca && termo ? opcoes.filter((o) => normalizar(o.rotulo).includes(termo)) : opcoes;

  function escolher(valor: string) {
    onMudar({ ...filtros, dono: valor || undefined });
    onEscolher?.();
  }

  return (
    <div className="space-y-2">
      {comBusca ? (
        <input
          type="search"
          aria-label={t("Buscar…")}
          placeholder={t("Buscar…")}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={CLASSE_DO_CAMPO}
        />
      ) : null}
      <ul role="listbox" aria-label={t("Dono do negócio")} className="max-h-64 overflow-y-auto">
        {visiveis.map((o) => {
          const escolhida = o.valor === atual;
          return (
            <li
              key={o.valor || "todos"}
              role="option"
              aria-selected={escolhida}
              tabIndex={0}
              onClick={() => escolher(o.valor)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  escolher(o.valor);
                }
              }}
              className={cn(
                "flex min-h-[34px] cursor-pointer items-center gap-2 rounded-[2px] px-3 text-[11px] text-casca-texto outline-hidden",
                "hover:bg-casca-marca-suave hover:text-casca-marca focus-visible:bg-casca-marca-suave",
                escolhida && "font-semibold",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
              {escolhida ? (
                <Check size={14} aria-hidden className="shrink-0 text-casca-marca" />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
