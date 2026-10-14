"use client";
import Link from "next/link";

import { BOTAO_DE_ICONE, SO_NO_FOCO, Tres } from "@/components/escale/origens/LinhasDoPainel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { Origens } from "@/lib/escale/origens/regras";
import { origensVivasDaVisualizacao, type Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { Plus } from "@/lib/ui/icons";
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
 * sem ⋮.
 */
export function SecaoVisualizacoes({
  visualizacoes,
  origens,
  ativa,
  podeGerenciar,
  onCriar,
  onAcao,
}: {
  visualizacoes: Visualizacao[];
  origens: Origens;
  ativa: string | null;
  podeGerenciar: boolean;
  onCriar: () => void;
  onAcao: (id: string, acao: AcaoDaVisualizacao) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t("Visualizações")} className="mt-3 border-t pt-2">
      <div className="flex items-center gap-1 px-2">
        <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Visualizações")}
        </h3>
        {podeGerenciar && (
          <button type="button" aria-label={t("Criar visualização")} onClick={onCriar} className={BOTAO_DE_ICONE}>
            <Plus size={14} aria-hidden />
          </button>
        )}
      </div>
      {visualizacoes.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">{t("Nenhuma visualização ainda.")}</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
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
                    "flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-sm",
                    atual ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
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
