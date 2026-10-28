"use client";
import { useState } from "react";

import { ATIVO, LinhaDoFiltroSalvo, ROTULO_DO_GRUPO } from "@/components/escale/contatos/filtros/LinhaDoFiltroSalvo";
import { BalaoDoFiltro } from "@/components/escale/contatos/filtros/BalaoDoFiltro";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { FiltroDaLista } from "@/lib/escale/listas/filtros-salvos";
import { rotuloDoSeletor, mesmosFiltrosDoPainel, FILTRO_PADRAO } from "@/lib/escale/indicadores/painel/filtro";
import type { FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";
import { Calendar, Check, ChevronDown, ChevronUp, Plus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Salvo = FiltroDaLista<"paineis">;

/**
 * O SELETOR DE FILTRO SALVO DO PAINEL (print 10-007): "PADRÃO / Este mês", "MEUS FILTROS" (com ⋮),
 * "COMPARTILHADOS" e "+ Criar filtro". Alterado o filtro salvo aplicado, o topo avisa e oferece
 * "Salvar como novo" (provisório: a Clint não mostra o estado alterado).
 */
export function SeletorDeFiltrosDoPainel({
  filtro,
  filtroSalvoId,
  salvos,
  aoAplicarPadrao,
  aoAplicarSalvo,
  aoCriarFiltro,
  aoSalvarComoNovo,
  aoRenomear,
  aoCompartilhar,
  aoExcluir,
}: {
  filtro: FiltroDoPainel;
  filtroSalvoId: string | null;
  salvos: readonly Salvo[];
  aoAplicarPadrao: () => void;
  aoAplicarSalvo: (f: Salvo) => void;
  aoCriarFiltro: () => void;
  aoSalvarComoNovo: (nome: string, compartilhado: boolean) => Promise<string | null>;
  aoRenomear: (id: string, nome: string) => Promise<string | null>;
  aoCompartilhar: (id: string, compartilhado: boolean) => void;
  aoExcluir: (id: string) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState<Salvo | null>(null);
  const aplicado = salvos.find((s) => s.id === filtroSalvoId) ?? null;
  const texto = rotuloDoSeletor(filtro, aplicado, t);
  const alterado = aplicado !== null && !mesmosFiltrosDoPainel(filtro, aplicado.criterios);
  const padraoAtivo = aplicado === null && mesmosFiltrosDoPainel(filtro, FILTRO_PADRAO);
  const meus = salvos.filter((s) => s.meu);
  const daEquipe = salvos.filter((s) => !s.meu);
  const Seta = aberto ? ChevronUp : ChevronDown;

  return (
    <>
      <DropdownMenu open={aberto} onOpenChange={setAberto}>
        <DropdownMenuTrigger
          className={cn(
            "flex h-8 max-w-[240px] items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia",
            aberto && "border-casca-marca",
          )}
        >
          <Calendar size={14} aria-hidden className="shrink-0 text-casca-marca" />
          <span className="truncate">{texto}</span>
          <Seta size={14} aria-hidden className="shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={cn(CONTEUDO_DO_MENU, "w-[220px]")}>
          {alterado ? (
            <div className="bg-casca-raia px-3 py-2">
              <p className="text-[11px] text-casca-suave">{t("Você alterou os filtros deste filtro salvo")}</p>
              <BalaoDoFiltro
                aoSalvar={aoSalvarComoNovo}
                gatilho={
                  <button type="button" className="text-[11px] font-medium text-casca-marca">
                    {t("Salvar como novo")}
                  </button>
                }
              />
            </div>
          ) : null}
          <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Padrão")}</DropdownMenuLabel>
          <DropdownMenuItem className={cn(ITEM_DO_MENU, padraoAtivo && ATIVO)} onSelect={aoAplicarPadrao}>
            <Calendar size={14} aria-hidden className="shrink-0" />
            {t("Este mês")}
            {padraoAtivo ? <Check size={14} aria-hidden className="ml-auto text-casca-marca" /> : null}
          </DropdownMenuItem>
          {meus.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Meus filtros")}</DropdownMenuLabel>
              {meus.map((f) => (
                <LinhaDoFiltroSalvo<"paineis">
                  key={f.id}
                  filtro={f}
                  ativo={f.id === filtroSalvoId}
                  aoAplicar={aoAplicarSalvo}
                  aoRenomear={aoRenomear}
                  aoCompartilhar={aoCompartilhar}
                  aoPedirExclusao={setExcluindo}
                />
              ))}
            </>
          ) : null}
          {daEquipe.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Compartilhados")}</DropdownMenuLabel>
              {daEquipe.map((f) => (
                <LinhaDoFiltroSalvo<"paineis">
                  key={f.id}
                  filtro={f}
                  ativo={f.id === filtroSalvoId}
                  aoAplicar={aoAplicarSalvo}
                  aoRenomear={aoRenomear}
                  aoCompartilhar={aoCompartilhar}
                  aoPedirExclusao={setExcluindo}
                />
              ))}
            </>
          ) : null}
          <DropdownMenuItem className={cn(ITEM_DO_MENU, "text-casca-marca")} onSelect={aoCriarFiltro}>
            <Plus size={14} aria-hidden />
            {t("Criar filtro")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaDeConfirmacao
        aberta={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        perigo
        rotuloDoConfirmar={t("Excluir filtro")}
        aoConfirmar={() => {
          if (excluindo) aoExcluir(excluindo.id);
          setExcluindo(null);
        }}
      >
        <p>{t('Tem certeza que deseja excluir o filtro "{name}"?').replace("{name}", excluindo?.nome ?? "")}</p>
      </JanelaDeConfirmacao>
    </>
  );
}
