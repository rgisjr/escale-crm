"use client";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCriarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { FunilDaOrigem, GrupoNaArvore, Origens } from "@/lib/escale/origens/regras";
import { estadoDoGrupo } from "@/lib/escale/visualizacoes/regras";
import { CaretDown, CaretRight, DotsThree, Plus } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { IconeDoGrupo } from "./IconeDoGrupo";
import { textoDoErro } from "./texto-do-erro";

export type AcaoDoGrupo = "configurar" | "selecionar" | "customizar" | "ocultar" | "arquivar" | "excluir";
export type AcaoDaOrigem = "configurar" | "selecionar" | "arquivar" | "excluir";

/** O modo seleção do painel (Fase 1C): o que está marcado e como marcar/desmarcar várias de uma vez. */
export interface SelecaoNoPainel {
  marcadas: ReadonlySet<string>;
  onAlternar: (ids: string[], marcar: boolean) => void;
}

export const BOTAO_DE_ICONE =
  "grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground";
/** Os botões de gerente aparecem ao passar o mouse ou ao chegar pelo teclado, como na Clint. */
export const SO_NO_FOCO = "flex items-center opacity-0 transition-opacity focus-within:opacity-100";

export function Tres({ rotulo }: { rotulo: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={rotulo} className={BOTAO_DE_ICONE}>
        <DotsThree size={16} weight="bold" className="rotate-90" aria-hidden />
      </button>
    </DropdownMenuTrigger>
  );
}

function MenuDoGrupo({ nome, oculto, onAcao }: { nome: string; oculto: boolean; onAcao: (a: AcaoDoGrupo) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuItem onSelect={() => onAcao("configurar")}>{t("Configurações")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("selecionar")}>{t("Selecionar origens")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("customizar")}>{t("Customizar")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("ocultar")}>
          {oculto ? t("Mostrar na minha barra lateral") : t("Ocultar da minha barra lateral")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAcao("arquivar")}>{t("Arquivar")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("excluir")} className="text-destructive">
          {t("Excluir")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuDaOrigem({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaOrigem) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuItem onSelect={() => onAcao("configurar")}>{t("Configurações")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("selecionar")}>{t("Selecionar origem")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAcao("arquivar")}>{t("Arquivar")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("excluir")} className="text-destructive">
          {t("Excluir")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LinhaDaOrigem({
  funil,
  ativo,
  podeGerenciar,
  recuo,
  selecao,
  onAcao,
}: {
  funil: FunilDaOrigem;
  ativo: string | null;
  podeGerenciar: boolean;
  recuo: boolean;
  /** Presente no modo seleção: a linha vira caixinha (clicar marca, não abre o quadro). */
  selecao?: SelecaoNoPainel;
  onAcao: (a: AcaoDaOrigem) => void;
}) {
  if (selecao) {
    const marcada = selecao.marcadas.has(funil.id);
    return (
      <li className={cn("flex items-center rounded-md hover:bg-accent-soft", recuo && "ml-8")}>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1 text-sm">
          <input
            type="checkbox"
            checked={marcada}
            onChange={() => selecao.onAlternar([funil.id], !marcada)}
            className="size-4 shrink-0 cursor-pointer accent-accent"
          />
          <span className="truncate">{funil.name}</span>
        </label>
      </li>
    );
  }
  const atual = funil.id === ativo;
  return (
    <li
      className={cn(
        "group/origem flex items-center rounded-md pr-1",
        recuo && "ml-8",
        atual ? "bg-accent-soft" : "hover:bg-accent-soft",
      )}
    >
      <Link
        href={`/app/pipelines/${funil.id}`}
        aria-current={atual ? "page" : undefined}
        className={cn(
          "min-w-0 flex-1 truncate px-2 py-1 text-sm",
          atual ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {funil.name}
      </Link>
      {podeGerenciar && (
        <span className={cn(SO_NO_FOCO, "group-hover/origem:opacity-100")}>
          <MenuDaOrigem nome={funil.name} onAcao={onAcao} />
        </span>
      )}
    </li>
  );
}

function NovaOrigemNoGrupo({
  grupoId,
  onCriada,
  onCancelar,
}: {
  grupoId: string;
  onCriada: (origens: Origens, id: string) => void;
  onCancelar: () => void;
}) {
  const t = useT();
  const criar = useCriarOrigem();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelar();
      return;
    }
    if (e.key !== "Enter" || !nome.trim() || criar.isPending) return;
    e.preventDefault();
    criar.mutate(
      { name: nome, groupId: grupoId },
      {
        onSuccess: (r) => onCriada(r.origens, r.id),
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <li className="ml-8 py-1 pr-2">
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={teclar}
        aria-label={t("Nome da nova origem")}
        placeholder={t("Nome da nova origem")}
        disabled={criar.isPending}
        maxLength={80}
        className="h-8"
      />
      {erro ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {erro}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{t("Enter cria · Esc cancela")}</p>
      )}
    </li>
  );
}

export function LinhaDoGrupo({
  grupo,
  aberto,
  oculto,
  ativo,
  podeGerenciar,
  criandoAqui,
  selecao,
  onAlternar,
  onNovaOrigem,
  onAcao,
  onAcaoDaOrigem,
  onCriada,
  onCancelarCriacao,
}: {
  grupo: GrupoNaArvore;
  aberto: boolean;
  oculto: boolean;
  ativo: string | null;
  podeGerenciar: boolean;
  criandoAqui: boolean;
  /** Presente no modo seleção: caixinha no grupo (marca todas) e nas origens; sem + e sem ⋮. */
  selecao?: SelecaoNoPainel;
  onAlternar: () => void;
  onNovaOrigem: () => void;
  onAcao: (a: AcaoDoGrupo) => void;
  onAcaoDaOrigem: (funilId: string, a: AcaoDaOrigem) => void;
  onCriada: (origens: Origens, id: string) => void;
  onCancelarCriacao: () => void;
}) {
  const t = useT();
  const estado = selecao ? estadoDoGrupo(grupo, selecao.marcadas) : "vazia";
  return (
    <li>
      <div className="group/grupo flex items-center gap-1.5 rounded-md py-1 pl-0.5 pr-1 hover:bg-accent-soft">
        <button
          type="button"
          aria-expanded={aberto}
          aria-label={`${aberto ? t("Fechar") : t("Abrir")} ${grupo.name}`}
          onClick={onAlternar}
          className={BOTAO_DE_ICONE}
        >
          {aberto ? <CaretDown size={12} aria-hidden /> : <CaretRight size={12} aria-hidden />}
        </button>
        {selecao && (
          <input
            type="checkbox"
            aria-label={`${t("Selecionar")} ${grupo.name}`}
            checked={estado === "marcada"}
            ref={(el) => {
              if (el) el.indeterminate = estado === "parcial";
            }}
            disabled={grupo.funis.length === 0}
            onChange={() => selecao.onAlternar(grupo.funis.map((f) => f.id), estado !== "marcada")}
            className="size-4 shrink-0 cursor-pointer accent-accent"
          />
        )}
        <IconeDoGrupo grupo={grupo} />
        <button
          type="button"
          tabIndex={-1}
          onClick={onAlternar}
          className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
        >
          {grupo.name}
          {oculto && <span className="ml-1 text-xs font-normal text-muted-foreground">({t("oculto")})</span>}
        </button>
        {podeGerenciar && !selecao && (
          <span className={cn(SO_NO_FOCO, "group-hover/grupo:opacity-100")}>
            <button
              type="button"
              aria-label={`${t("Nova origem em")} ${grupo.name}`}
              onClick={onNovaOrigem}
              className={BOTAO_DE_ICONE}
            >
              <Plus size={14} aria-hidden />
            </button>
            <MenuDoGrupo nome={grupo.name} oculto={oculto} onAcao={onAcao} />
          </span>
        )}
      </div>
      {aberto && (
        <ul className="space-y-0.5">
          {criandoAqui && !selecao && (
            <NovaOrigemNoGrupo grupoId={grupo.id} onCriada={onCriada} onCancelar={onCancelarCriacao} />
          )}
          {grupo.funis.length === 0 && !criandoAqui ? (
            <li className="ml-10 py-1 text-xs text-muted-foreground">{t("Nenhum funil neste grupo.")}</li>
          ) : (
            grupo.funis.map((f) => (
              <LinhaDaOrigem
                key={f.id}
                funil={f}
                ativo={ativo}
                podeGerenciar={podeGerenciar}
                recuo
                selecao={selecao}
                onAcao={(a) => onAcaoDaOrigem(f.id, a)}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}
