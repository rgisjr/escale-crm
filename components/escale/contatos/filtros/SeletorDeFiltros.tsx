"use client";
import { useState } from "react";

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
import { mesmosFiltros, temFiltros, type FiltrosDeContatos } from "@/lib/escale/contatos/filtros";
import {
  ROTULO_DA_VISAO,
  VISOES_DE_CONTATOS,
  type VisaoDeContatos,
} from "@/lib/escale/contatos/regras";
import type { FiltroDaLista } from "@/lib/escale/listas/filtros-salvos";
import {
  Bookmark,
  Briefcase,
  Check,
  ChevronDown,
  Plus,
  SlidersHorizontal,
  User,
  UserX,
  Users,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ATIVO, LinhaDoFiltroSalvo, ROTULO_DO_GRUPO } from "./LinhaDoFiltroSalvo";

/** O ícone de cada visão (print 2b-02): pessoas, maleta, pessoa com ×; "Pessoais" (do original) com uma pessoa. */
const ICONE_DA_VISAO: Record<VisaoDeContatos, LucideIcon> = {
  todos: Users,
  com_negocio: Briefcase,
  sem_negocio: UserX,
  pessoais: User,
};

export type RotuloDoSeletor =
  | { tipo: "visao"; visao: VisaoDeContatos }
  | { tipo: "salvo"; id: string; nome: string }
  | { tipo: "personalizado" };

/** O que o seletor mostra (Clint `usePresetDirtySync`): o salvo enquanto os critérios batem; senão "Personalizado"; sem filtro, a visão. */
export function rotuloDoSeletor({
  visao,
  filtros,
  filtroSalvoId,
  salvos,
}: {
  visao: VisaoDeContatos;
  filtros: FiltrosDeContatos;
  filtroSalvoId: string | null;
  salvos: readonly FiltroDaLista[];
}): RotuloDoSeletor {
  const salvo = salvos.find((s) => s.id === filtroSalvoId);
  if (salvo && mesmosFiltros(salvo.criterios, filtros))
    return { tipo: "salvo", id: salvo.id, nome: salvo.nome };
  if (temFiltros(filtros)) return { tipo: "personalizado" };
  return { tipo: "visao", visao };
}

/**
 * O SELETOR DE FILTROS (Clint `index-BH0q213O` + `useFilterPresets`; prints 2b-02 a
 * 2b-04): "Padrão" (as visões prontas), "Meus filtros" (com ⋮: "Renomear", que vira
 * um campo na própria linha com ✓ e ✕, o nosso "Compartilhar com a equipe" e
 * "Excluir filtro"), "Compartilhados" (os das outras pessoas, Q2) e "Criar filtro".
 */
export function SeletorDeFiltros({
  visao,
  filtros,
  filtroSalvoId,
  salvos,
  aoEscolherVisao,
  aoAplicarSalvo,
  aoCriarFiltro,
  aoRenomear,
  aoCompartilhar,
  aoExcluir,
}: {
  visao: VisaoDeContatos;
  filtros: FiltrosDeContatos;
  filtroSalvoId: string | null;
  salvos: readonly FiltroDaLista[];
  aoEscolherVisao: (v: VisaoDeContatos) => void;
  aoAplicarSalvo: (f: FiltroDaLista) => void;
  aoCriarFiltro: () => void;
  aoRenomear: (id: string, nome: string) => Promise<string | null>;
  aoCompartilhar: (id: string, compartilhado: boolean) => void;
  aoExcluir: (id: string) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState<FiltroDaLista | null>(null);
  const ativo = rotuloDoSeletor({ visao, filtros, filtroSalvoId, salvos });
  const texto =
    ativo.tipo === "salvo"
      ? ativo.nome
      : ativo.tipo === "personalizado"
        ? t("Personalizado")
        : t(ROTULO_DA_VISAO[ativo.visao]);
  const IconeDoGatilho =
    ativo.tipo === "salvo"
      ? Bookmark
      : ativo.tipo === "personalizado"
        ? SlidersHorizontal
        : ICONE_DA_VISAO[ativo.visao];
  const meus = salvos.filter((s) => s.meu);
  const daEquipe = salvos.filter((s) => !s.meu);
  const marca = <Check size={14} aria-hidden className="ml-auto text-casca-marca" />;

  const linha = (f: FiltroDaLista) => (
    <LinhaDoFiltroSalvo
      key={f.id}
      filtro={f}
      ativo={ativo.tipo === "salvo" && ativo.id === f.id}
      aoAplicar={aoAplicarSalvo}
      aoRenomear={aoRenomear}
      aoCompartilhar={aoCompartilhar}
      aoPedirExclusao={setExcluindo}
    />
  );

  return (
    <>
      <DropdownMenu
        open={aberto}
        onOpenChange={setAberto}
      >
        <DropdownMenuTrigger className="flex h-8 max-w-[240px] items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia data-[state=open]:border-casca-marca">
          <IconeDoGatilho size={15} aria-hidden className="shrink-0 text-casca-marca" />
          <span className="truncate">{texto}</span>
          <ChevronDown size={14} aria-hidden className="shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={cn(CONTEUDO_DO_MENU, "w-64")}>
          <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Padrão")}</DropdownMenuLabel>
          {VISOES_DE_CONTATOS.map((v) => {
            const Icone = ICONE_DA_VISAO[v];
            const estaAtiva = ativo.tipo === "visao" && ativo.visao === v;
            return (
              <DropdownMenuItem
                key={v}
                className={cn(ITEM_DO_MENU, estaAtiva && ATIVO)}
                onSelect={() => aoEscolherVisao(v)}
              >
                <Icone size={14} aria-hidden className="shrink-0" />
                {t(ROTULO_DA_VISAO[v])}
                {estaAtiva ? marca : null}
              </DropdownMenuItem>
            );
          })}
          {meus.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Meus filtros")}</DropdownMenuLabel>
              {meus.map(linha)}
            </>
          ) : null}
          {daEquipe.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={ROTULO_DO_GRUPO}>
                {t("Compartilhados")}
              </DropdownMenuLabel>
              {daEquipe.map(linha)}
            </>
          ) : null}
          <DropdownMenuItem
            className={cn(ITEM_DO_MENU, "text-casca-marca")}
            onSelect={aoCriarFiltro}
          >
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
        <p>
          {t('Tem certeza que deseja excluir o filtro "{name}"?').replace(
            "{name}",
            excluindo?.nome ?? "",
          )}
        </p>
      </JanelaDeConfirmacao>
    </>
  );
}
