"use client";
import Link from "next/link";

import { CabecalhoDaSecao } from "@/components/escale/origens/CabecalhoDaSecao";
import { BOTAO_DE_ICONE, SO_NO_FOCO, Tres } from "@/components/escale/origens/LinhasDoPainel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { iniciais, type Origens } from "@/lib/escale/origens/regras";
import { origensVivasDaVisualizacao, type Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { CaretDown, CaretUp, FrameCorners, Plus } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

export type AcaoDaVisualizacao = "editar-origens" | "configurar" | "excluir";

function MenuDaVisualizacao({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaVisualizacao) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuItem onSelect={() => onAcao("editar-origens")}>{t("Editar origens")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("configurar")}>{t("Configurações")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAcao("excluir")} className="text-destructive">
          {t("Excluir")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A SEÇÃO VISUALIZAÇÕES do painel Origens (fork Escale, Fase 1C), como na
 * Clint: cada visualização com quantas origens vivas junta. O `+` entra no modo
 * seleção (as caixinhas nas origens) e o ⋮ edita as origens, o nome e o acesso,
 * ou exclui. Quem não é gerente vê só as que o acesso deixa (RLS), sem `+` e
 * sem ⋮. É seção irmã de Origens, com o mesmo cabeçalho em destaque e o seu
 * próprio `^`: recolher a lista de origens não esconde as visualizações.
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
      <CabecalhoDaSecao icone={<FrameCorners size={18} />} titulo={t("Visualizações")}>
        {podeGerenciar && (
          <button type="button" aria-label={t("Criar visualização")} onClick={onCriar} className={BOTAO_DE_ICONE}>
            <Plus size={15} aria-hidden />
          </button>
        )}
        <button
          type="button"
          aria-label={aberta ? t("Recolher as visualizações") : t("Abrir as visualizações")}
          aria-expanded={aberta}
          onClick={onAlternar}
          className={BOTAO_DE_ICONE}
        >
          {aberta ? <CaretUp size={14} aria-hidden /> : <CaretDown size={14} aria-hidden />}
        </button>
      </CabecalhoDaSecao>
      {aberta && visualizacoes.length === 0 && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">{t("Nenhuma visualização ainda.")}</p>
      )}
      {aberta && visualizacoes.length > 0 && (
        <ul className="space-y-0.5 px-2 pb-2">
          {visualizacoes.map((v) => {
            const quantas = origensVivasDaVisualizacao(v, origens).length;
            const atual = v.id === ativa;
            return (
              <li
                key={v.id}
                className={cn("group/vis flex items-center rounded-md pr-1", atual ? "bg-accent-soft" : "hover:bg-accent-soft")}
              >
                <Link
                  href={`/app/pipelines/visualizacoes/${v.id}`}
                  aria-current={atual ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-sm text-foreground",
                    atual && "font-semibold",
                  )}
                >
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-background"
                  >
                    {iniciais(v.name)}
                  </span>
                  <span className="truncate">{v.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {(quantas === 1 ? t("{n} origem") : t("{n} origens")).replace("{n}", String(quantas))}
                  </span>
                </Link>
                {podeGerenciar && (
                  <span className={cn(SO_NO_FOCO, "group-hover/vis:opacity-100")}>
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
