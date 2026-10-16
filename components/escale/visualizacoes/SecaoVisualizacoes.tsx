"use client";
import Link from "next/link";

import { CabecalhoDaSecao } from "@/components/escale/origens/CabecalhoDaSecao";
import {
  BOTAO_DE_ICONE,
  LINHA,
  LINHA_ATUAL,
  LINHA_COM_HOVER,
  SO_NO_HOVER,
} from "@/components/escale/origens/estilos-do-painel";
import { ConteudoDoMenu, ItemDoMenu, SeparadorDoMenu, Tres } from "@/components/escale/origens/MenuDoPainel";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { COR_DO_ICONE_DA_VISUALIZACAO } from "@/lib/escale/origens/cores-da-casca";
import { iniciais, type Origens } from "@/lib/escale/origens/regras";
import { origensVivasDaVisualizacao, type Visualizacao } from "@/lib/escale/visualizacoes/regras";
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  Plus,
  Settings,
  SquareDashedKanban,
  Trash2,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type AcaoDaVisualizacao = "editar-origens" | "configurar" | "excluir";

/** O ⋮ da visualização, no mesmo menu da casca dos grupos e das origens (01-032/033). */
function MenuDaVisualizacao({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaVisualizacao) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <ConteudoDoMenu>
        <ItemDoMenu icone={ListChecks} onSelect={() => onAcao("editar-origens")}>
          {t("Editar origens")}
        </ItemDoMenu>
        <ItemDoMenu icone={Settings} onSelect={() => onAcao("configurar")}>
          {t("Configurações")}
        </ItemDoMenu>
        <SeparadorDoMenu />
        <ItemDoMenu icone={Trash2} perigo onSelect={() => onAcao("excluir")}>
          {t("Excluir")}
        </ItemDoMenu>
      </ConteudoDoMenu>
    </DropdownMenu>
  );
}

/**
 * A SEÇÃO VISUALIZAÇÕES do painel (fork Escale, Fase 1C; visual da Clint na casca V3).
 *
 * O cabeçalho é o de 01-010: quadro tracejado, título e ^. O "+" de criar só
 * aparece no hover do cabeçalho, porque a variante superior não mostra onde
 * fica (item 10 de "Prints que faltam").
 *
 * Cada linha é a de 34px do painel, com o quadradinho #4A4A4A de iniciais, o
 * nome e "N origens" à direita (01-014). A aberta tem o fundo #EFF3FF e a barra
 * da marca.
 *
 * O "+" e o "Editar origens" do ⋮ entram no modo seleção. Quem não é gerente vê
 * só as visualizações que o acesso deixa (RLS), sem "+" e sem ⋮. É seção irmã de
 * ORIGENS: recolher a lista de origens não esconde as visualizações.
 */
export function SecaoVisualizacoes({
  visualizacoes,
  origens,
  ativa,
  aberta,
  podeGerenciar,
  onAlternar,
  onCriar,
  onAcao,
}: {
  visualizacoes: Visualizacao[];
  origens: Origens;
  ativa: string | null;
  aberta: boolean;
  podeGerenciar: boolean;
  onAlternar: () => void;
  onCriar: () => void;
  onAcao: (id: string, acao: AcaoDaVisualizacao) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t("Visualizações")}>
      <CabecalhoDaSecao icone={<SquareDashedKanban size={16} />} titulo={t("Visualizações")}>
        {podeGerenciar && (
          <span className={cn(SO_NO_HOVER, "group-hover/cabecalho:opacity-100")}>
            <button type="button" aria-label={t("Criar visualização")} onClick={onCriar} className={BOTAO_DE_ICONE}>
              <Plus size={16} aria-hidden />
            </button>
          </span>
        )}
        <button
          type="button"
          aria-label={aberta ? t("Recolher as visualizações") : t("Abrir as visualizações")}
          aria-expanded={aberta}
          onClick={onAlternar}
          className={cn(BOTAO_DE_ICONE, "text-casca-meta")}
        >
          {aberta ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        </button>
      </CabecalhoDaSecao>
      {aberta && visualizacoes.length === 0 && (
        <p className="flex h-[34px] items-center pr-3 pl-4 text-[11px] text-casca-suave">
          {t("Nenhuma visualização ainda.")}
        </p>
      )}
      {aberta && visualizacoes.length > 0 && (
        <ul>
          {visualizacoes.map((v) => {
            const quantas = origensVivasDaVisualizacao(v, origens).length;
            const atual = v.id === ativa;
            return (
              <li key={v.id} className={cn("group/vis", LINHA, atual ? LINHA_ATUAL : LINHA_COM_HOVER, "pr-1")}>
                <Link
                  href={`/app/pipelines/visualizacoes/${v.id}`}
                  aria-current={atual ? "page" : undefined}
                  className="flex h-full min-w-0 flex-1 items-center gap-[7px] pr-2 pl-4"
                >
                  <span
                    aria-hidden
                    data-icone-da-visualizacao=""
                    className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[8px] leading-none font-semibold text-white"
                    style={{ backgroundColor: COR_DO_ICONE_DA_VISUALIZACAO }}
                  >
                    {iniciais(v.name)}
                  </span>
                  <span className="min-w-0 truncate">{v.name}</span>
                  <span className="ml-auto shrink-0 pl-2 text-[11px] text-casca-suave">
                    {(quantas === 1 ? t("{n} origem") : t("{n} origens")).replace("{n}", String(quantas))}
                  </span>
                </Link>
                {podeGerenciar && (
                  <span className={cn(SO_NO_HOVER, "group-hover/vis:opacity-100")}>
                    <MenuDaVisualizacao nome={v.name} onAcao={(a) => onAcao(v.id, a)} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
