"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { BarraDoQuadro } from "@/components/escale/filtros/BarraDoQuadro";
import { BotaoNegocioMais, CabecalhoDaCasca } from "@/components/escale/quadro/CabecalhoDaCasca";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
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
import { moedaDaOrigem } from "@/lib/escale/configuracoes/tipos";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
import { settingsDaVisualizacao } from "@/lib/escale/visualizacoes/regras";

import { LoteDaVisualizacao } from "./LoteDaVisualizacao";
import { QuadroCombinado } from "./QuadroCombinado";
import { rotaDoNegocio } from "@/lib/escale/negocio/regras";

/**
 * A PÁGINA DE UMA VISUALIZAÇÃO (fork Escale, Fases 1C e 1D; visual da Clint na
 * Casca V4): o mesmo esqueleto da página do funil — cabeçalho com "Negócio +",
 * a barra, o quadro e o lote — com as origens da visualização no lugar de um
 * funil só. A sobrelinha é "NEGÓCIOS DA VISUALIZAÇÃO" (D15; sem print).
 *
 * Os filtros rodam POR ORIGEM: a categoria de um motivo de perda e as colunas de
 * ganho e de perda são da origem do card. Os filtros salvos são da VISUALIZAÇÃO.
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
  const router = useRouter();
  const { filtros, filtroSalvoId, mudar } = useFiltrosDoQuadro();
  const orgAtiva = useActiveOrg();

  // Estável entre renders: o `combine` do hook depende deste array.
  const ids = useMemo(() => origens.map((o) => o.id), [origens]);
  const { quadros, carregando, indisponiveis, atualizar, atualizando } =
    useQuadrosDaVisualizacao(ids);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [novoEm, setNovoEm] = useState<string | null>(null);

  const campos = useMemo(
    () => camposFiltraveis(quadros.map((q) => q.pipeline.settings)),
    [quadros],
  );
  const recortes = useMemo(
    () =>
      quadros.map((q) => ({
        quadro: q,
        // Fase 1F: cada origem filtra o valor na própria moeda.
        ...recortarQuadro(q, filtros, { moeda: moedaDaOrigem(q.pipeline.settings) ?? orgAtiva?.currency ?? null, campos }),
      })),
    [quadros, filtros, orgAtiva?.currency, campos],
  );
  // As colunas do quadro combinado saem só das etapas visíveis de cada origem.
  const quadrosVisiveis = useMemo(
    () => recortes.map((r) => ({ ...r.quadro, stages: r.stages })),
    [recortes],
  );
  const filtrados = useMemo(() => recortes.flatMap((r) => r.leads), [recortes]);
  const ordemDosCards = useMemo(
    () => comparadorDaOrdem(filtros.ordem, campos),
    [filtros.ordem, campos],
  );
  const todosOsLeads = useMemo(() => quadros.flatMap((q) => q.leads), [quadros]);
  const settings = useMemo(() => settingsDaVisualizacao(quadros), [quadros]);
  const quadroDoNovo = quadros.find((q) => q.pipeline.id === novoEm);

  if (origens.length === 0) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        {t(
          "Nenhuma origem desta visualização está ativa. Edite as origens pelo ⋮ da visualização.",
        )}
      </p>
    );
  }

  return (
    // A mesma altura da página do funil (ver o comentário longo lá): o quadro
    // cabe na tela e quem rola é ele. A última classe desconta o topo de 44px da
    // casca (V2) do md para cima; sem a casca e no celular vale a de 3.5rem.
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col gap-4 md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      <CabecalhoDaCasca
        sobrelinha={t("Negócios da visualização")}
        titulo={nome}
        acao={
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <BotaoNegocioMais disabled={quadros.length === 0} />
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
        }
      />

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
        <p
          role="status"
          className="rounded-casca-gatilho bg-casca-raia px-3 py-2 text-xs text-casca-suave"
        >
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
        <div className="flex flex-1 animate-pulse items-center justify-center text-casca-suave">
          {t("Carregando…")}
        </div>
      ) : (
        <QuadroCombinado
          quadros={quadrosVisiveis}
          leads={filtrados}
          selecionados={selecionados}
          onSelecao={setSelecionados}
          leadInicial={searchParams.get("lead")}
          // Fase 1G (N3, Q13): o card da Visualização também abre a ficha do negócio.
          aoAbrirNegocio={(id) => router.push(rotaDoNegocio(id, searchParams.toString()))}
          ordemDosCards={ordemDosCards}
        />
      )}

      <LoteDaVisualizacao
        selecionados={selecionados}
        quadros={quadros}
        onLimpar={() => setSelecionados([])}
      />
    </div>
  );
}
