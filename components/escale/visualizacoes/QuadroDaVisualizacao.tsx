"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { FilterBar } from "@/components/kanban/FilterBar";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuadrosDaVisualizacao } from "@/hooks/escale/useQuadrosDaVisualizacao";
import { useT } from "@/hooks/i18n/useT";
import { settingsDaVisualizacao } from "@/lib/escale/visualizacoes/regras";
import { applyFilters, filtersFromParams, filtersToParams, type LeadFilters } from "@/lib/kanban/filters";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import { Plus } from "@/lib/ui/icons";

import { LoteDaVisualizacao } from "./LoteDaVisualizacao";
import { QuadroCombinado } from "./QuadroCombinado";

/**
 * A PÁGINA DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C): o mesmo esqueleto da
 * página do funil (`app/app/pipelines/[id]/_client.tsx`) — título, "Novo Lead",
 * filtros na URL, quadro e lote — com as origens da visualização no lugar de um
 * funil só.
 *
 * O filtro é o MESMO `FilterBar` do funil e roda POR ORIGEM: a categoria de um
 * motivo de perda é da origem do card (#1537), e um `categoriaDo` único
 * classificaria o card de uma origem pela régua da outra.
 */
export function QuadroDaVisualizacao({ nome, origens }: { nome: string; origens: Array<{ id: string; name: string }> }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next: LeadFilters) => {
      const qs = filtersToParams(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Estável entre renders: o `combine` do hook depende deste array.
  const ids = useMemo(() => origens.map((o) => o.id), [origens]);
  const { quadros, carregando, indisponiveis } = useQuadrosDaVisualizacao(ids);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [novoEm, setNovoEm] = useState<string | null>(null);

  const todosOsLeads = useMemo(() => quadros.flatMap((q) => q.leads), [quadros]);
  const filtrados = useMemo(
    () =>
      quadros.flatMap((q) =>
        applyFilters(q.leads, filters, { categoriaDo: (motivo) => categoriaDoMotivo(motivo, q.pipeline.settings) }),
      ),
    [quadros, filters],
  );
  const settings = useMemo(() => settingsDaVisualizacao(quadros), [quadros]);
  const quadroDoNovo = quadros.find((q) => q.pipeline.id === novoEm);

  if (origens.length === 0) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        {t("Nenhuma origem desta visualização está ativa. Edite as origens pelo ⋮ da visualização.")}
      </p>
    );
  }

  return (
    // A mesma altura da página do funil (ver o comentário longo lá): o quadro
    // cabe na tela e quem rola é ele.
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Visualização")}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{nome}</h1>
          <p className="text-xs text-muted-foreground">
            {(origens.length === 1 ? t("{n} origem") : t("{n} origens")).replace("{n}", String(origens.length))}
          </p>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button disabled={quadros.length === 0} className="shrink-0">
              <Plus size={16} className="mr-2" /> {t("Novo Lead")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("Em qual origem?")}</DropdownMenuLabel>
            {quadros.map((q) => (
              <DropdownMenuItem key={q.pipeline.id} onSelect={() => setNovoEm(q.pipeline.id)}>
                {q.pipeline.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {quadroDoNovo && (
        <NewLeadDialog
          open
          onOpenChange={(aberto: boolean) => !aberto && setNovoEm(null)}
          pipelineId={quadroDoNovo.pipeline.id}
          stages={quadroDoNovo.stages}
          leads={quadroDoNovo.leads}
        />
      )}

      {indisponiveis.length > 0 && (
        <p role="status" className="rounded-md border border-border bg-surface-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {(indisponiveis.length === 1
            ? t("{n} origem desta visualização não abriu para você.")
            : t("{n} origens desta visualização não abriram para você.")
          ).replace("{n}", String(indisponiveis.length))}
        </p>
      )}

      <FilterBar filters={filters} onChange={setFilters} leads={todosOsLeads} settings={settings} />

      {carregando && quadros.length === 0 ? (
        <div className="flex flex-1 animate-pulse items-center justify-center text-muted-foreground">{t("Carregando…")}</div>
      ) : (
        <QuadroCombinado
          quadros={quadros}
          leads={filtrados}
          selecionados={selecionados}
          onSelecao={setSelecionados}
          leadInicial={searchParams.get("lead")}
        />
      )}

      <LoteDaVisualizacao selecionados={selecionados} quadros={quadros} onLimpar={() => setSelecionados([])} />
    </div>
  );
}
