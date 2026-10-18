"use client";
import { useState, type ReactNode } from "react";

import { RotuloDoGrupo } from "@/components/escale/filtros/controles";
import { AlternanciaDaCasca } from "@/components/escale/ui/AlternanciaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { CONDICOES_POR_GRUPO_MAX, GRUPOS_MAX } from "@/lib/escale/contatos/filtros";
import { ArrowLeft, Plus, Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Um grupo da seção (prints 2b-06 e 2b-11): o rótulo maiúsculo da Clint ("TELEFONE") e o controle. */
export function GrupoDoFiltro({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <RotuloDoGrupo>{rotulo}</RotuloDoGrupo>
      {children}
    </div>
  );
}

/** A pílula da Clint ("Qualquer tag", "Sem tag"; print 2b-16): 24px, borda, texto na cor da marca. */
export function Pilula({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={cn(
        "h-6 rounded-full border px-2.5 text-[11px] font-medium",
        ativa
          ? "border-casca-marca bg-casca-marca-suave text-casca-marca"
          : "border-casca-borda bg-surface text-casca-marca hover:bg-casca-marca-suave",
      )}
    >
      {children}
    </button>
  );
}

/** O "rádio" da Clint sem o controle nativo: bolinha de 14px; marcada, com o miolo na cor da marca. */
export function OpcaoDeRadio({
  marcada,
  onClick,
  children,
}: {
  marcada: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      onClick={onClick}
      className="flex h-8 w-full items-center gap-2 rounded-[4px] px-2 text-left text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-3.5 place-items-center rounded-full border",
          marcada ? "border-casca-marca" : "border-casca-borda",
        )}
      >
        {marcada ? <span className="size-2 rounded-full bg-casca-marca" /> : null}
      </span>
      {children}
    </button>
  );
}

/** O "← Voltar" da Clint (prints 2b-17 e 2b-23). */
export function BotaoVoltar({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] text-casca-suave hover:text-casca-texto"
    >
      <ArrowLeft size={14} aria-hidden />
      {t("Voltar")}
    </button>
  );
}

/** O botão largo com borda da Clint: "+ Adicionar condição" no vazio e "+ Adicionar grupo" (prints 2b-15 e 2b-18). */
const BOTAO_LARGO =
  "flex h-8 w-full items-center justify-center gap-1.5 rounded-[6px] border border-casca-borda bg-surface text-[13px] font-medium text-casca-marca hover:bg-casca-marca-suave disabled:cursor-not-allowed disabled:text-casca-meta";

export type GrupoGenerico<C> = { modo: "e" | "ou"; condicoes: readonly C[] };

/**
 * OS GRUPOS DE CONDIÇÕES DA CLINT (Tags e Campos; prints 2b-15 a 2b-23). Sem grupo,
 * o botão largo "+ Adicionar condição". Com grupos, cada um num cartão com "GRUPO N",
 * E | OU e a lixeira; as condições "• texto ×"; o "+ Adicionar condição" do grupo;
 * "combinar grupos por E | OU" entre os cartões; e o botão largo "+ Adicionar grupo".
 * A condição nasce no seletor suspenso que a seção monta (`seletor`): escolher
 * fecha o seletor e grava (no grupo, ou num grupo novo). Padrões da Clint: E dentro
 * do grupo, OU entre grupos.
 */
export function GruposDoFiltro<C>({
  grupos,
  combinar,
  aoMudar,
  textoDaCondicao,
  seletor,
}: {
  grupos: ReadonlyArray<GrupoGenerico<C>>;
  combinar: "e" | "ou";
  aoMudar: (grupos: Array<GrupoGenerico<C>>, combinar: "e" | "ou") => void;
  textoDaCondicao: (c: C) => ReactNode;
  seletor: (aoEscolher: (c: C) => void) => ReactNode;
}) {
  const t = useT();
  /** Onde o seletor está aberto: o índice do grupo, ou `grupos.length` para um grupo novo. */
  const [aberto, setAberto] = useState<number | null>(null);
  const nomeDoGrupo = (i: number) => t("Grupo {number}").replace("{number}", String(i + 1));
  const E_OU = [
    { valor: "e" as const, rotulo: t("E") },
    { valor: "ou" as const, rotulo: t("OU") },
  ];

  function escolher(grupo: number, c: C) {
    const novos =
      grupo < grupos.length
        ? grupos.map((g, i) => (i === grupo ? { ...g, condicoes: [...g.condicoes, c] } : g))
        : [...grupos, { modo: "e" as const, condicoes: [c] }];
    aoMudar(novos, combinar);
    setAberto(null);
  }

  const tirar = (grupo: number, indice: number) =>
    aoMudar(
      grupos
        .map((g, i) =>
          i === grupo ? { ...g, condicoes: g.condicoes.filter((_, j) => j !== indice) } : g,
        )
        .filter((g) => g.condicoes.length > 0),
      combinar,
    );

  const comSeletor = (lugar: number, gatilho: ReactNode) => (
    <Popover open={aberto === lugar} onOpenChange={(a) => setAberto(a ? lugar : null)}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso align="start" sideOffset={6} className="w-[308px] p-0">
        {seletor((c) => escolher(lugar, c))}
      </PainelSuspenso>
    </Popover>
  );

  if (grupos.length === 0) {
    return comSeletor(
      0,
      <button type="button" className={BOTAO_LARGO}>
        <Plus size={14} aria-hidden />
        {t("Adicionar condição")}
      </button>,
    );
  }

  const grupoCheio = (g: GrupoGenerico<C>) => g.condicoes.length >= CONDICOES_POR_GRUPO_MAX;

  return (
    <div className="space-y-3">
      {grupos.map((g, i) => (
        <div key={i} className="space-y-3">
          {i > 0 ? (
            <div className="flex items-center justify-center gap-2 text-[11px] text-casca-suave">
              {t("combinar grupos por")}
              <AlternanciaDaCasca
                valor={combinar}
                opcoes={E_OU}
                aoMudar={(v) => aoMudar([...grupos], v)}
                aria-label={t("combinar grupos por")}
              />
            </div>
          ) : null}
          <div className="rounded-[6px] border border-casca-borda bg-surface p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex-1 text-[11px] font-semibold tracking-[0.04em] text-casca-meta uppercase">
                {nomeDoGrupo(i)}
              </span>
              <AlternanciaDaCasca
                valor={g.modo}
                opcoes={E_OU}
                aoMudar={(v) =>
                  aoMudar(
                    grupos.map((x, j) => (j === i ? { ...x, modo: v } : x)),
                    combinar,
                  )
                }
                aria-label={nomeDoGrupo(i)}
              />
              <button
                type="button"
                aria-label={`${t("Excluir grupo")} ${nomeDoGrupo(i)}`}
                onClick={() =>
                  aoMudar(
                    grupos.filter((_, j) => j !== i),
                    combinar,
                  )
                }
                className="grid size-6 place-items-center text-casca-suave hover:text-casca-alerta"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
            <ul className="space-y-1">
              {g.condicoes.map((c, j) => (
                <li key={j} className="flex items-center gap-2 text-[12px] text-casca-texto">
                  <span aria-hidden className="size-1 shrink-0 rounded-full bg-casca-marca" />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                    {textoDaCondicao(c)}
                  </span>
                  <button
                    type="button"
                    aria-label={t("Remover filtro")}
                    onClick={() => tirar(i, j)}
                    className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {comSeletor(
              i,
              <button
                type="button"
                disabled={grupoCheio(g)}
                title={grupoCheio(g) ? t("Limite de 10 condições por grupo atingido.") : undefined}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-casca-marca disabled:text-casca-meta"
              >
                <Plus size={12} aria-hidden />
                {t("Adicionar condição")}
              </button>,
            )}
          </div>
        </div>
      ))}
      {comSeletor(
        grupos.length,
        <button
          type="button"
          disabled={grupos.length >= GRUPOS_MAX}
          title={grupos.length >= GRUPOS_MAX ? t("Limite de 5 grupos atingido.") : undefined}
          className={BOTAO_LARGO}
        >
          <Plus size={14} aria-hidden />
          {t("Adicionar grupo")}
        </button>,
      )}
    </div>
  );
}
