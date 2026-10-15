"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { BarraDoQuadro } from "@/components/escale/filtros/BarraDoQuadro";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useFiltrosDoQuadro } from "@/hooks/escale/useFiltrosDoQuadro";
import { useQuadrosDaVisualizacao } from "@/hooks/escale/useQuadrosDaVisualizacao";
import { useT } from "@/hooks/i18n/useT";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
import { settingsDaVisualizacao } from "@/lib/escale/visualizacoes/regras";
import { Plus } from "@/lib/ui/icons";

import { LoteDaVisualizacao } from "./LoteDaVisualizacao";
import { QuadroCombinado } from "./QuadroCombinado";

/**
 * A PÁGINA DE UMA VISUALIZAÇÃO (fork Escale, Fases 1C e 1D): o mesmo esqueleto
 * da página do funil — título, "Novo Lead", a barra do quadro, quadro e lote —
 * com as origens da visualização no lugar de um funil só.
 *
 * Os filtros rodam POR ORIGEM: a categoria de um motivo de perda e as colunas de
 * ganho e de perda são da origem do card. Os filtros salvos são da VISUALIZAÇÃO
 * (o `alvo` da barra), não das origens.
 */
export function QuadroDaVisualizacao({
  id,
  nome,
  origens,
}: {
  id: string;
  nome: string;
  origens: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const searchParams = useSearchParams();
  const { filtros, filtroSalvoId, mudar } = useFiltrosDoQuadro();
  const orgAtiva = useActiveOrg();

  // Estável entre renders: o `combine` do hook depende deste array.
  const ids = useMemo(() => origens.map((o) => o.id), [origens]);
  const { quadros, carregando, indisponiveis, atualizar, atualizando } = useQuadrosDaVisualizacao(ids);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [novoEm, setNovoEm] = useState<string | null>(null);

  const campos = useMemo(() => camposFiltraveis(quadros.map((q) => q.pipeline.settings)), [quadros]);
  const recortes = useMemo(
    () => quadros.map((q) => ({ quadro: q, ...recortarQuadro(q, filtros, { moeda: orgAtiva?.currency ?? null, campos }) })),
    [quadros, filtros, orgAtiva?.currency, campos],
  );
  // As colunas do quadro combinado saem só das etapas visíveis de cada origem.
  const quadrosVisiveis = useMemo(() => recortes.map((r) => ({ ...r.quadro, stages: r.stages })), [recortes]);
  const filtrados = useMemo(() => recortes.flatMap((r) => r.leads), [recortes]);
  const ordemDosCards = useMemo(() => comparadorDaOrdem(filtros.ordem, campos), [filtros.ordem, campos]);
  const todosOsLeads = useMemo(() => quadros.flatMap((q) => q.leads), [quadros]);
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

      <BarraDoQuadro
        alvo={{ tipo: "visualizacao", id }}
        filtros={filtros}
        filtroSalvoId={filtroSalvoId}
        onMudar={mudar}
        leads={todosOsLeads}
        campos={campos}
        settings={settings}
        contagem={filtrados.length}
        onAtualizar={atualizar}
        atualizando={atualizando}
      />

      {carregando && quadros.length === 0 ? (
        <div className="flex flex-1 animate-pulse items-center justify-center text-muted-foreground">{t("Carregando…")}</div>
      ) : (
        <QuadroCombinado
          quadros={quadrosVisiveis}
          leads={filtrados}
          selecionados={selecionados}
          onSelecao={setSelecionados}
          leadInicial={searchParams.get("lead")}
          ordemDosCards={ordemDosCards}
        />
      )}

      <LoteDaVisualizacao selecionados={selecionados} quadros={quadros} onLimpar={() => setSelecionados([])} />
    </div>
  );
}
