"use client";

import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import {
  DONO_COM,
  DONO_SEM,
  ROTULO_DA_OP_DE_TAG,
  ROTULO_DO_STATUS,
  ROTULO_DO_TELEFONE,
  chipsDosFiltros,
  removerChip,
  textoDoPeriodo,
  type ChipDoFiltro,
  type FiltrosDeContatos,
  type SecaoDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { agentOwnerFilter } from "@/lib/kanban/filters";
import { ChevronUp, Plus, X } from "@/lib/ui/icons-da-casca";

const CHIPS_VISIVEIS = 6;

/**
 * A FAIXA DE FILTROS (prints 2b-24 a 2b-26; Clint `useCollapsibleFilters`): um chip
 * por critério ("Título **valor** │ ×"); o chip abre o painel na seção dele; "+ Filtro"
 * abre o painel inteiro; mais de 6 viram "+N"; "Resetar" volta ao padrão; o ^ à
 * direita recolhe a faixa. Sem filtro, só "+ Filtro" e o ^. Enquanto a faixa está
 * aberta, o "Filtros" + ⇕ sai da barra (`ControleDosFiltros`).
 */
export function FaixaDeFiltros({
  filtros,
  opcoes,
  aoMudar,
  aoAbrir,
  podeResetar,
  aoResetar,
  aoRecolher,
}: {
  filtros: FiltrosDeContatos;
  opcoes: OpcoesDoFiltro;
  aoMudar: (f: FiltrosDeContatos) => void;
  aoAbrir: (secao: SecaoDoFiltro | null) => void;
  podeResetar: boolean;
  aoResetar: () => void;
  aoRecolher: () => void;
}) {
  const t = useT();
  const membros = useAssignableMembers(true);
  const agentes = useAssignableAgents(true);
  const chips = chipsDosFiltros(filtros);
  const visiveis = chips.slice(0, CHIPS_VISIVEIS);
  const resto = chips.length - visiveis.length;
  const selecionados = (n: number) => t("{count} selecionados").replace("{count}", String(n));
  const contagem = (n: number, um: string, varios: string) =>
    (n === 1 ? t(um) : t(varios)).replace("{count}", String(n));

  const nomeDoDono = (d: string) => {
    if (d === DONO_SEM) return t("Sem dono");
    if (d === DONO_COM) return t("Todos os donos");
    const membro = (membros.data ?? []).find((m) => m.user_id === d);
    if (membro) return membro.full_name ?? t("Sem nome");
    return (
      (agentes.data ?? []).find((a) => agentOwnerFilter(a.agent_id) === d)?.name ?? t("Sem nome")
    );
  };

  function texto(chip: ChipDoFiltro): { titulo: string; valor: string } {
    const n = filtros.negocio ?? {};
    switch (chip.chave) {
      case "criadoEm":
        return { titulo: t("Data de criação"), valor: textoDoPeriodo(filtros.criadoEm ?? {}) };
      case "telefone":
        return {
          titulo: t("Telefone"),
          valor: filtros.telefone ? t(ROTULO_DO_TELEFONE[filtros.telefone]) : "",
        };
      case "negocio.tem":
        return {
          titulo: t("Negócio"),
          valor: n.tem === "sem" ? t("Sem negócio") : t("Com negócio"),
        };
      case "negocio.origens":
        return {
          titulo: t("Origens"),
          valor:
            chip.quantidade === 1
              ? (opcoes.origens.find((o) => o.id === n.origens?.[0])?.nome ?? selecionados(1))
              : selecionados(chip.quantidade),
        };
      case "negocio.etapas":
        return {
          titulo: t("Etapa"),
          valor: contagem(chip.quantidade, "{count} etapa", "{count} etapas"),
        };
      case "negocio.status":
        return {
          titulo: t("Status"),
          valor:
            chip.quantidade === 1 && n.status?.[0]
              ? t(ROTULO_DO_STATUS[n.status[0]])
              : selecionados(chip.quantidade),
        };
      case "negocio.donos":
        return {
          titulo: t("Dono"),
          valor:
            chip.quantidade === 1 && n.donos?.[0]
              ? nomeDoDono(n.donos[0])
              : selecionados(chip.quantidade),
        };
      case "negocio.motivos":
        return {
          titulo: t("Motivo de perda"),
          valor:
            chip.quantidade === 1
              ? t(
                  opcoes.motivos.find((m) => m.valor === n.motivos?.[0])?.rotulo ??
                    n.motivos?.[0] ??
                    "",
                )
              : selecionados(chip.quantidade),
        };
      case "tags": {
        // Uma condição só: o texto dela ("vip", "Qualquer tag", "Não possui a tag frio"); mais: "2 tags" (print 2b-25).
        const unica = chip.quantidade === 1 ? filtros.tags?.grupos[0]?.condicoes[0] : undefined;
        const valor = !unica
          ? contagem(chip.quantidade, "{count} tag", "{count} tags")
          : unica.op === "possui"
            ? unica.tag
            : unica.op === "nao_possui"
              ? `${t(ROTULO_DA_OP_DE_TAG.nao_possui)} ${unica.tag}`
              : t(ROTULO_DA_OP_DE_TAG[unica.op]);
        return { titulo: t("Tags"), valor };
      }
      case "campos":
        return {
          titulo: t("Campos"),
          valor: contagem(chip.quantidade, "{count} campo", "{count} campos"),
        };
    }
  }

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-casca-borda px-6 py-2">
      {visiveis.map((chip) => {
        const { titulo, valor } = texto(chip);
        return (
          <span
            key={chip.chave}
            className="inline-flex h-[30px] items-center rounded-[6px] border border-casca-borda bg-surface text-[13px] text-casca-suave"
          >
            <button
              type="button"
              onClick={() => aoAbrir(chip.secao)}
              className="inline-flex h-full items-center gap-1 px-3"
            >
              {titulo} <span className="font-semibold text-casca-texto">{valor}</span>
            </button>
            <span aria-hidden className="h-full w-px bg-casca-borda" />
            <button
              type="button"
              aria-label={`${t("Remover filtro")} ${titulo}`}
              onClick={() => aoMudar(removerChip(filtros, chip.chave))}
              className="grid h-full w-8 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        );
      })}
      {resto > 0 ? (
        <button
          type="button"
          onClick={() => aoAbrir(null)}
          className="h-[30px] rounded-[6px] border border-casca-borda px-2.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
        >
          {`+${resto}`}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t("Filtro")}
        onClick={() => aoAbrir(null)}
        className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-casca-borda bg-surface px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
      >
        <Plus size={14} aria-hidden />
        {t("Filtro")}
      </button>
      {podeResetar ? (
        <button
          type="button"
          onClick={aoResetar}
          className="h-[30px] px-2 text-[12px] font-medium text-casca-suave hover:text-casca-texto"
        >
          {t("Resetar")}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t("Recolher filtros")}
        title={t("Recolher filtros")}
        onClick={aoRecolher}
        className="ml-auto grid size-[30px] place-items-center rounded-[6px] border border-casca-borda text-casca-suave hover:bg-casca-raia"
      >
        <ChevronUp size={14} aria-hidden />
      </button>
    </div>
  );
}
