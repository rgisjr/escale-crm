"use client";
import Link from "next/link";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useAcoesDasAutomacoes } from "@/hooks/escale/useAutomacoesDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { rotaDeAbrir } from "@/lib/escale/automacoes/rotas";
import type { AgenteDaLista, AutomacaoDaLista, PastaDeAutomacao } from "@/lib/escale/automacoes/tipos";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";
import { Star } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AgenteDaLinha } from "./AgenteDaLinha";
import { MenuDaAutomacao } from "./MenuDaAutomacao";

/** A linha da tabela (07-001): caixa, nome, agente, interruptor, data, estrela e ⋮. */
export function LinhaDaAutomacao({
  automacao: a,
  pastas,
  agentes,
  fuso,
  selecionada,
  aoSelecionar,
  aoEditar,
  aoRenomear,
}: {
  automacao: AutomacaoDaLista;
  pastas: readonly PastaDeAutomacao[];
  agentes: ReadonlyMap<string, AgenteDaLista>;
  fuso: string;
  selecionada: boolean;
  aoSelecionar: () => void;
  aoEditar: (id: string) => void;
  aoRenomear: (a: AutomacaoDaLista) => void;
}) {
  const t = useT();
  const acoes = useAcoesDasAutomacoes();
  const dicaDaEstrela = a.favorita ? t("Remover dos favoritos") : t("Adicionar aos favoritos");
  return (
    <tr className="h-16 border-b border-casca-divisoria hover:bg-casca-raia/40">
      <td className="pl-6">
        <CaixaDaCasca marcada={selecionada} aoMudar={aoSelecionar} aria-label={t("Selecionar automação")} />
      </td>
      <td className="px-3">
        <Link
          href={rotaDeAbrir(a)}
          onClick={(e) => {
            if (a.forma === "editor") {
              e.preventDefault();
              aoEditar(a.id);
            }
          }}
          className="block truncate text-[13px] font-medium text-casca-texto hover:underline"
        >
          {a.nome}
        </Link>
      </td>
      <td className="px-3">
        <AgenteDaLinha ids={a.agentes} agentes={agentes} />
      </td>
      <td className="px-3">
        <InterruptorDaCasca
          ligado={a.ativa}
          aoMudar={(ativa) => acoes.alternar.mutate({ id: a.id, ativa })}
          aria-label={a.ativa ? `${t("Pausar")} ${a.nome}` : `${t("Ativar")} ${a.nome}`}
        />
      </td>
      <td className="px-3 text-[12px] text-casca-texto-2 tabular-nums">{dataHoraBr(a.atualizadaEm, fuso)}</td>
      <td className="px-1">
        <button
          type="button"
          aria-label={dicaDaEstrela}
          title={dicaDaEstrela}
          aria-pressed={a.favorita}
          onClick={() => acoes.favoritar.mutate({ id: a.id, favorita: !a.favorita })}
          className={cn(
            "grid size-7 place-items-center rounded-casca-gatilho hover:bg-casca-raia",
            a.favorita ? "text-[#FACC15]" : "text-casca-suave",
          )}
        >
          <Star size={16} aria-hidden fill={a.favorita ? "#FACC15" : "none"} />
        </button>
      </td>
      <td className="px-1">
        <MenuDaAutomacao automacao={a} pastas={pastas} aoEditar={aoEditar} aoRenomear={aoRenomear} />
      </td>
    </tr>
  );
}
