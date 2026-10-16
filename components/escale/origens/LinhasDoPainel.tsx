"use client";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useCriarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { FunilDaOrigem, GrupoNaArvore, Origens } from "@/lib/escale/origens/regras";
import { estadoDoGrupo } from "@/lib/escale/visualizacoes/regras";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ListChecks,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DicaEscura } from "./DicaEscura";
import {
  BOTAO_DE_ICONE,
  LINHA,
  LINHA_ATUAL,
  LINHA_COM_HOVER,
  RECUO_DO_TEXTO,
  SO_NO_HOVER,
} from "./estilos-do-painel";
import { IconeDoGrupo } from "./IconeDoGrupo";
import { ConteudoDoMenu, ItemDoMenu, SeparadorDoMenu, Tres } from "./MenuDoPainel";
import { textoDoErro } from "./texto-do-erro";

export type AcaoDoGrupo = "configurar" | "selecionar" | "customizar" | "ocultar" | "arquivar" | "excluir";
export type AcaoDaOrigem = "configurar" | "selecionar" | "arquivar" | "excluir";

/** O modo seleção do painel (Fase 1C): o que está marcado e como marcar/desmarcar várias de uma vez. */
export interface SelecaoNoPainel {
  marcadas: ReadonlySet<string>;
  onAlternar: (ids: string[], marcar: boolean) => void;
}

/** O ⋮ do grupo: os itens, a ordem, os ícones e a divisória de 01-032; "Excluir" em vermelho. */
function MenuDoGrupo({ nome, oculto, onAcao }: { nome: string; oculto: boolean; onAcao: (a: AcaoDoGrupo) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <ConteudoDoMenu>
        <ItemDoMenu icone={Settings} onSelect={() => onAcao("configurar")}>
          {t("Configurações")}
        </ItemDoMenu>
        <ItemDoMenu icone={ListChecks} onSelect={() => onAcao("selecionar")}>
          {t("Selecionar origens")}
        </ItemDoMenu>
        <ItemDoMenu icone={Pencil} onSelect={() => onAcao("customizar")}>
          {t("Customizar")}
        </ItemDoMenu>
        <ItemDoMenu icone={oculto ? Eye : EyeOff} onSelect={() => onAcao("ocultar")}>
          {oculto ? t("Mostrar na minha barra lateral") : t("Ocultar da minha barra lateral")}
        </ItemDoMenu>
        <SeparadorDoMenu />
        <ItemDoMenu icone={Archive} onSelect={() => onAcao("arquivar")}>
          {t("Arquivar")}
        </ItemDoMenu>
        <ItemDoMenu icone={Trash2} perigo onSelect={() => onAcao("excluir")}>
          {t("Excluir")}
        </ItemDoMenu>
      </ConteudoDoMenu>
    </DropdownMenu>
  );
}

/** O ⋮ da origem: os itens de 01-033. */
function MenuDaOrigem({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaOrigem) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <ConteudoDoMenu>
        <ItemDoMenu icone={Settings} onSelect={() => onAcao("configurar")}>
          {t("Configurações")}
        </ItemDoMenu>
        <ItemDoMenu icone={ListChecks} onSelect={() => onAcao("selecionar")}>
          {t("Selecionar origem")}
        </ItemDoMenu>
        <SeparadorDoMenu />
        <ItemDoMenu icone={Archive} onSelect={() => onAcao("arquivar")}>
          {t("Arquivar")}
        </ItemDoMenu>
        <ItemDoMenu icone={Trash2} perigo onSelect={() => onAcao("excluir")}>
          {t("Excluir")}
        </ItemDoMenu>
      </ConteudoDoMenu>
    </DropdownMenu>
  );
}

/**
 * A linha da origem (01-032/033), de 34px e de borda a borda, só com texto.
 * - O texto fica a 43px quando a origem está dentro de um grupo.
 * - A origem aberta ganha o fundo #EFF3FF e a barra de 3px da marca.
 * - O hover pinta de #F3F3F3 e mostra o ⋮.
 * - No modo seleção, a caixinha da casca vem antes do nome; clicar no nome também marca.
 */
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
      <li className={cn(LINHA, LINHA_COM_HOVER, "gap-2 pr-3", recuo ? RECUO_DO_TEXTO : "pl-4")}>
        <CaixaDaCasca
          marcada={marcada}
          aoMudar={(marcar) => selecao.onAlternar([funil.id], marcar)}
          aria-label={funil.name}
        />
        <span
          className="min-w-0 flex-1 cursor-pointer truncate"
          onClick={() => selecao.onAlternar([funil.id], !marcada)}
        >
          {funil.name}
        </span>
      </li>
    );
  }
  const atual = funil.id === ativo;
  return (
    <li className={cn("group/origem", LINHA, atual ? LINHA_ATUAL : LINHA_COM_HOVER, "pr-1")}>
      <Link
        href={`/app/pipelines/${funil.id}`}
        aria-current={atual ? "page" : undefined}
        className={cn("flex h-full min-w-0 flex-1 items-center pr-2", recuo ? RECUO_DO_TEXTO : "pl-4")}
      >
        <span className="truncate">{funil.name}</span>
      </Link>
      {podeGerenciar && (
        <span className={cn(SO_NO_HOVER, "group-hover/origem:opacity-100")}>
          <MenuDaOrigem nome={funil.name} onAcao={onAcao} />
        </span>
      )}
    </li>
  );
}

/**
 * Criar a origem ali mesmo, pelo "+" do grupo. A Clint não mostra o formulário
 * (01-034; item 13 de "Prints que faltam"): fica o campo de hoje, no visual do
 * campo de busca da casca.
 */
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
    <li className={cn("py-1 pr-3", RECUO_DO_TEXTO)}>
      <input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={teclar}
        aria-label={t("Nome da nova origem")}
        placeholder={t("Nome da nova origem")}
        disabled={criar.isPending}
        maxLength={80}
        className="h-7 w-full rounded-casca-gatilho bg-casca-busca px-2 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-1 focus:ring-casca-marca disabled:opacity-60"
      />
      {erro ? (
        <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
          {erro}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-casca-suave">{t("Enter cria · Esc cancela")}</p>
      )}
    </li>
  );
}

/**
 * A linha do grupo (01-010, 01-032, 01-034), de 34px, com o quadradinho de 20px
 * a 16px da borda e o nome a 43px.
 * - Em repouso, só ícone e nome, em peso normal. O grupo da origem aberta fica em 600.
 * - No hover, a linha fica #F3F3F3 e aparecem a seta (na margem esquerda), o "+"
 *   (com a dica "Nova origem") e o ⋮.
 * - Aberto, o grupo fica assim mesmo sem o mouse em cima, como em 01-032/033.
 */
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
  const temAOrigemAberta = grupo.funis.some((f) => f.id === ativo);
  return (
    <li>
      <div
        className={cn(
          "group/grupo",
          LINHA,
          LINHA_COM_HOVER,
          "gap-[7px] pr-1 pl-4",
          aberto && "bg-(--escale-painel-hover)",
        )}
      >
        <button
          type="button"
          aria-expanded={aberto}
          aria-label={`${aberto ? t("Fechar") : t("Abrir")} ${grupo.name}`}
          onClick={onAlternar}
          className={cn(
            "absolute inset-y-0 left-0 grid w-4 place-items-center text-casca-meta opacity-0 transition-opacity group-hover/grupo:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-casca-marca",
            aberto && "opacity-100",
          )}
        >
          {aberto ? <ChevronDown size={11} aria-hidden /> : <ChevronRight size={11} aria-hidden />}
        </button>
        {selecao && (
          <CaixaDaCasca
            marcada={estado === "marcada" ? true : estado === "parcial" ? "indeterminada" : false}
            aoMudar={() =>
              selecao.onAlternar(
                grupo.funis.map((f) => f.id),
                estado !== "marcada",
              )
            }
            aria-label={`${t("Selecionar")} ${grupo.name}`}
            desabilitada={grupo.funis.length === 0}
          />
        )}
        <IconeDoGrupo grupo={grupo} />
        <button
          type="button"
          tabIndex={-1}
          onClick={onAlternar}
          className={cn("h-full min-w-0 flex-1 truncate text-left", temAOrigemAberta && "font-semibold")}
        >
          {grupo.name}
          {oculto && <span className="ml-1 text-[11px] font-normal text-casca-suave">({t("oculto")})</span>}
        </button>
        {podeGerenciar && !selecao && (
          <span className={cn(SO_NO_HOVER, "group-hover/grupo:opacity-100", aberto && "opacity-100")}>
            <DicaEscura texto={t("Nova origem")}>
              <button
                type="button"
                aria-label={`${t("Nova origem em")} ${grupo.name}`}
                onClick={onNovaOrigem}
                className={BOTAO_DE_ICONE}
              >
                <Plus size={14} aria-hidden />
              </button>
            </DicaEscura>
            <MenuDoGrupo nome={grupo.name} oculto={oculto} onAcao={onAcao} />
          </span>
        )}
      </div>
      {aberto && (
        <ul>
          {criandoAqui && !selecao && (
            <NovaOrigemNoGrupo grupoId={grupo.id} onCriada={onCriada} onCancelar={onCancelarCriacao} />
          )}
          {grupo.funis.length === 0 && !criandoAqui ? (
            <li className={cn("flex h-[34px] items-center pr-3 text-[11px] text-casca-suave", RECUO_DO_TEXTO)}>
              {t("Nenhum funil neste grupo.")}
            </li>
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
