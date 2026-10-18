"use client";
import { useState, type KeyboardEvent } from "react";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  EllipsisVertical,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  User,
  UserX,
  Users,
  X,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ROTULO_DO_GRUPO =
  "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.06em] text-casca-meta uppercase";
const ATIVO = "bg-casca-marca-suave text-casca-marca";

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
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
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

  function cancelarRenomear() {
    setRenomeando(null);
    setErro(null);
  }

  async function confirmarRenomear() {
    if (!renomeando || !nome.trim()) return;
    const problema = await aoRenomear(renomeando, nome);
    if (problema) return setErro(problema);
    cancelarRenomear();
  }

  /** O menu do Radix procura item pela letra digitada: dentro do campo, a tecla fica no campo. */
  function teclaNoCampo(e: KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      void confirmarRenomear();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelarRenomear();
    }
  }

  const linha = (f: FiltroDaLista) => {
    if (renomeando === f.id) {
      return (
        <div key={f.id} className="px-1 py-0.5">
          <div className="flex h-8 items-center gap-1.5 rounded-[4px] bg-casca-marca-suave px-2">
            <Bookmark size={14} aria-hidden className="shrink-0 fill-current text-casca-marca" />
            <input
              autoFocus
              value={nome}
              maxLength={60}
              aria-label={t("Nome do filtro")}
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
              onKeyDown={teclaNoCampo}
              className="h-6 min-w-0 flex-1 rounded-[4px] border border-casca-marca bg-surface px-1.5 text-[13px] text-casca-texto outline-hidden"
            />
            <button
              type="button"
              aria-label={t("Salvar nome")}
              disabled={!nome.trim()}
              title={!nome.trim() ? t("Dê um nome ao filtro.") : undefined}
              onClick={() => void confirmarRenomear()}
              className="grid size-6 shrink-0 place-items-center rounded-[4px] bg-casca-marca text-white hover:bg-casca-marca-forte disabled:opacity-50"
            >
              <Check size={14} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t("Cancelar")}
              onClick={cancelarRenomear}
              className="grid size-6 shrink-0 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
          {erro ? (
            <p role="alert" className="px-2 pt-1 text-[12px] text-casca-alerta">
              {erro}
            </p>
          ) : null}
        </div>
      );
    }
    const estaAtivo = ativo.tipo === "salvo" && ativo.id === f.id;
    return (
      <div key={f.id} className="flex items-center">
        <DropdownMenuItem
          className={cn(ITEM_DO_MENU, "min-w-0 flex-1", estaAtivo && ATIVO)}
          onSelect={() => aoAplicarSalvo(f)}
        >
          <Bookmark size={14} aria-hidden className="shrink-0 fill-current text-casca-marca" />
          <span className="truncate">{f.nome}</span>
          {estaAtivo ? marca : null}
        </DropdownMenuItem>
        {f.meu ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              aria-label={`${t("Ações")} ${f.nome}`}
              className="grid size-7 shrink-0 place-items-center rounded-[4px] text-casca-suave [&>svg:last-child]:hidden"
            >
              <EllipsisVertical size={14} aria-hidden />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={CONTEUDO_DO_MENU}>
              <DropdownMenuItem
                className={ITEM_DO_MENU}
                onSelect={(e) => {
                  // O menu continua aberto: o nome vira um campo na própria linha (print 2b-04).
                  e.preventDefault();
                  setNome(f.nome);
                  setErro(null);
                  setRenomeando(f.id);
                }}
              >
                <Pencil size={14} aria-hidden />
                {t("Renomear")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={ITEM_DO_MENU}
                onSelect={() => aoCompartilhar(f.id, !f.compartilhado)}
              >
                <Users size={14} aria-hidden />
                {f.compartilhado ? t("Deixar de compartilhar") : t("Compartilhar com a equipe")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(ITEM_DO_MENU, "text-casca-alerta")}
                onSelect={() => setExcluindo(f)}
              >
                <Trash2 size={14} aria-hidden />
                {t("Excluir filtro")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <DropdownMenu
        open={aberto}
        onOpenChange={(a) => {
          setAberto(a);
          if (!a) cancelarRenomear();
        }}
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
