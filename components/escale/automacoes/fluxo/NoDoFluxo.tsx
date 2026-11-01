"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { ACTION_LABELS, type ActionType } from "@/app/app/webhooks/_components/labels";
import { useT } from "@/hooks/i18n/useT";
import { ehGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import { tipoDoNo, tituloDaAcaoNoFluxo } from "@/lib/escale/automacoes/fluxo/paleta";
import { cn } from "@/lib/utils";

import { BarraDoNo } from "./BarraDoNo";
import { CorpoDaAcao, CorpoDasCondicoes, CorpoDoGatilho, CorpoDoGrupo, CorpoDoWhatsapp } from "./CorposDoNo";
import { useInsightsDoNo } from "./insights/contexto";
import { VisaoGeralDoNo } from "./insights/VisaoGeralDoNo";
import { VISUAL_DO_NO } from "./visual-do-fluxo";

/**
 * O NÓ DO FLUXO DA CASCA (07-013, 07-025, 07-027): cartão branco de 352 px,
 * entrada à esquerda e saída à direita, na altura do "Próximo passo". Selecionado
 * ganha a borda da cor do tipo; com problema depois de um Salvar recusado, a
 * borda de alerta e o primeiro problema na dica.
 */
export function NoDoFluxo({ id, data, selected }: NodeProps<NoDaAutomacao>) {
  const t = useT();
  const tipo = tipoDoNo(data);
  const visual = VISUAL_DO_NO[tipo];
  const Icone = visual.icone;
  const problemas = data.problemas ?? [];
  const temProblema = problemas.length > 0;
  const grupo = ehGrupo(data);
  // FORK ESCALE · Fase 5C: dentro da aba Insights o nó é só de leitura (sem barra, sem seleção, sem alerta).
  const nosInsights = useInsightsDoNo() !== null;

  let titulo = "";
  if (data.kind === "acao") {
    if (data.acao.type === "ai_decide") titulo = t("A IA decide");
    else if (tipo === "whatsapp") titulo = t("Enviar mensagem");
    else if (tipo === "email") titulo = t("Enviar e-mail");
    else titulo = t(tituloDaAcaoNoFluxo(data.acao.type) ?? ACTION_LABELS[data.acao.type as ActionType] ?? data.acao.type);
  }

  return (
    <div
      className={cn(
        "group relative w-[352px] rounded-xl border border-casca-divisoria bg-surface shadow-[0_1px_3px_rgb(17_24_39/0.08)]",
        !nosInsights && selected && cn("border-2", visual.borda),
        !nosInsights && temProblema && "border-2 border-casca-alerta",
      )}
      data-testid={`no-${id}`}
      title={temProblema ? t(problemas[0]!.mensagem) : undefined}
    >
      {data.kind !== "gatilho" && <Handle type="target" position={Position.Left} />}
      {data.kind !== "gatilho" && !nosInsights && <BarraDoNo id={id} podeDuplicar={data.kind === "acao"} selecionado={!!selected} />}
      {/* FORK ESCALE · Fase 5C: o "Overview de resultados" no topo do nó, só nos Insights. */}
      {nosInsights && <VisaoGeralDoNo id={id} dados={data} />}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Icone size={18} className={cn("shrink-0", visual.texto)} aria-hidden />
        {data.kind === "gatilho" ? (
          <p className={cn("text-[18px] font-semibold", visual.texto)}>{t("Iniciar quando...")}</p>
        ) : data.kind === "condicoes" || grupo ? (
          <p className={cn("text-[18px] font-semibold", visual.texto)}>{grupo ? t("Ações") : t("Condições")}</p>
        ) : (
          <div className="min-w-0">
            {visual.rotulo ? <p className="text-[11px] text-casca-suave">{t(visual.rotulo)}</p> : null}
            <p className="truncate text-[14px] font-semibold text-casca-texto">{titulo}</p>
          </div>
        )}
      </div>
      <div className="px-5 pb-3">
        {data.kind === "gatilho" ? (
          <CorpoDoGatilho dados={data} />
        ) : data.kind === "condicoes" ? (
          <CorpoDasCondicoes dados={data} evento={data.eventoDaRegra ?? ""} />
        ) : grupo ? (
          <CorpoDoGrupo dados={data} />
        ) : tipo === "whatsapp" ? (
          <CorpoDoWhatsapp dados={data} />
        ) : (
          <CorpoDaAcao dados={data} />
        )}
      </div>
      <p className="px-5 pt-1 pb-4 text-right text-[13px] text-casca-texto-2">{t("Próximo passo")}</p>
      <Handle type="source" position={Position.Right} style={{ top: "auto", bottom: 22 }} />
    </div>
  );
}
