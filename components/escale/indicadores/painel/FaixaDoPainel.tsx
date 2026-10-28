"use client";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  chipsDoPainel,
  removerChipDoPainel,
  textoDoPeriodoDoPainel,
  type ChaveDoChipDoPainel,
  type SecaoDoPainel,
} from "@/lib/escale/indicadores/painel/filtro";
import type { FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";
import { ChevronUp, Plus, X } from "@/lib/ui/icons-da-casca";
import { useGruposDasOrigens } from "@/hooks/escale/useGruposDasOrigens";

/**
 * A FAIXA DE CHIPS DO PAINEL (prints 10-024, 10-026): um chip por critério ("Título **valor** │ ×"); o
 * chip abre o popover na seção dele; "+ Filtro" abre inteiro; "Resetar" só quando difere do padrão; o ^
 * recolhe. Molde: `FaixaDeFiltros` da lista de contatos (2B).
 */
export function FaixaDoPainel({
  filtro,
  opcoes,
  aoMudar,
  aoAbrir,
  podeResetar,
  aoResetar,
  aoRecolher,
}: {
  filtro: FiltroDoPainel;
  opcoes: OpcoesDoFiltro;
  aoMudar: (f: FiltroDoPainel) => void;
  aoAbrir: (secao: SecaoDoPainel | null) => void;
  podeResetar: boolean;
  aoResetar: () => void;
  aoRecolher: () => void;
}) {
  const t = useT();
  const membros = useAssignableMembers(true);
  const grupos = useGruposDasOrigens();
  const selecionados = (n: number) => t("{count} selecionados").replace("{count}", String(n));
  const contagem = (n: number, um: string, varios: string) => (n === 1 ? t(um) : t(varios)).replace("{count}", String(n));

  function texto(chave: ChaveDoChipDoPainel, n: number): { titulo: string; valor: string } {
    switch (chave) {
      case "periodo":
        return { titulo: t("Período"), valor: filtro.periodo ? textoDoPeriodoDoPainel(filtro.periodo, t) : "" };
      case "usuarios":
        return {
          titulo: t("Usuário"),
          valor:
            n === 1
              ? ((membros.data ?? []).find((m) => m.user_id === filtro.usuarios?.[0])?.full_name ?? t("Sem nome"))
              : selecionados(n),
        };
      case "gruposDeOrigem":
        return {
          titulo: t("Grupo de origem"),
          valor: n === 1 ? ((grupos.data ?? []).find((g) => g.id === filtro.gruposDeOrigem?.[0])?.nome ?? selecionados(1)) : selecionados(n),
        };
      case "origens":
        return {
          titulo: t("Origem"),
          valor: n === 1 ? (opcoes.origens.find((o) => o.id === filtro.origens?.[0])?.nome ?? selecionados(1)) : selecionados(n),
        };
      case "tags":
        return { titulo: t("Tags"), valor: contagem(n, "{count} tag", "{count} tags") };
      case "campos":
        return { titulo: t("Campos"), valor: contagem(n, "{count} campo", "{count} campos") };
    }
  }

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-casca-divisoria px-6 py-2">
      {chipsDoPainel(filtro).map((chip) => {
        const { titulo, valor } = texto(chip.chave, chip.quantidade);
        return (
          <span
            key={chip.chave}
            className="inline-flex h-8 items-center rounded-[6px] bg-casca-raia text-[13px] text-casca-suave"
          >
            <button type="button" onClick={() => aoAbrir(chip.secao)} className="inline-flex h-full items-center gap-1 px-3">
              {titulo} <span className="font-medium text-casca-texto">{valor}</span>
            </button>
            <span aria-hidden className="h-4 w-px bg-casca-borda" />
            <button
              type="button"
              aria-label={`${t("Remover filtro")} ${titulo}`}
              onClick={() => aoMudar(removerChipDoPainel(filtro, chip.chave))}
              className="grid h-full w-8 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={() => aoAbrir(null)}
        className="inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda bg-surface px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
      >
        <Plus size={14} aria-hidden />
        {t("Filtro")}
      </button>
      {podeResetar ? (
        <button type="button" onClick={aoResetar} className="h-8 px-2 text-[13px] font-medium text-casca-marca">
          {t("Resetar")}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t("Recolher filtros")}
        title={t("Recolher filtros")}
        onClick={aoRecolher}
        className="ml-auto grid size-8 place-items-center rounded-casca-gatilho border border-casca-borda text-casca-suave hover:bg-casca-raia"
      >
        <ChevronUp size={14} aria-hidden />
      </button>
    </div>
  );
}
