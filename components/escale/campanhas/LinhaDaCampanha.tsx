"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useAcoesDaCampanha } from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { botaoDaLinha } from "@/lib/escale/campanhas/acoes-da-linha";
import {
  dataDoDisparo,
  dataEHoraBr,
  subtituloDaCampanha,
} from "@/lib/escale/campanhas/apresentacao";
import { rotaDoDetalhe, rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { CirclePause, Play, Send } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BarraDeResultado } from "./BarraDeResultado";
import { MenuDaCampanha } from "./MenuDaCampanha";
import { SeloDoStatus } from "./SeloDoStatus";

/**
 * A LINHA DA CAMPANHA (002; PRD A5, A8, A10): clicar abre (rascunho na edição,
 * as outras no detalhe; N11); a última célula não propaga o clique.
 */
export function LinhaDaCampanha({
  linha,
  agora,
  fuso,
  nomeDoNumero,
}: {
  linha: LinhaDeCampanha;
  agora: Date;
  fuso?: string;
  nomeDoNumero: string;
}) {
  const t = useT();
  const router = useRouter();
  const abrir = () =>
    router.push(linha.status === "draft" ? rotaDoRascunho(linha.id) : rotaDoDetalhe(linha.id));
  const data = dataDoDisparo(linha);
  return (
    <tr
      onClick={abrir}
      className="h-[54px] cursor-pointer border-b border-casca-divisoria transition-colors hover:bg-casca-busca has-[[data-state=open]]:bg-casca-busca"
    >
      <td className="pr-3 pl-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-[34px] shrink-0 place-items-center rounded-[8px] bg-casca-marca-suave text-casca-marca"
          >
            <Send size={16} />
          </span>
          <div className="min-w-0">
            <button
              type="button"
              title={linha.nome}
              onClick={(e) => {
                e.stopPropagation();
                abrir();
              }}
              className="block max-w-[200px] truncate text-left text-[13px] font-medium text-casca-texto hover:underline focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:outline-hidden"
            >
              {linha.nome}
            </button>
            <p className="truncate text-[11px] text-casca-meta">
              {subtituloDaCampanha(linha, agora, t, fuso)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 text-[11px] text-casca-texto">{data ? dataEHoraBr(data, fuso) : "—"}</td>
      <td className="truncate px-3 text-[11px] text-casca-texto">{nomeDoNumero}</td>
      <td className="px-3">
        <BarraDeResultado linha={linha} fuso={fuso} />
      </td>
      <td className="px-3">
        <SeloDoStatus status={linha.status} />
      </td>
      <td className="pr-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <BotaoDePausa linha={linha} />
          <MenuDaCampanha linha={linha} />
        </div>
      </td>
    </tr>
  );
}

/** Pausar/Retomar na linha (material 2.1; provisório, sem print). */
function BotaoDePausa({ linha }: { linha: LinhaDeCampanha }) {
  const t = useT();
  const acao = useAcoesDaCampanha();
  const qual = botaoDaLinha(linha.status);
  if (!qual) return null;
  const pausar = qual === "pausar";
  const rotulo = pausar ? t("Pausar campanha") : t("Retomar campanha");
  const executar = () =>
    acao.mutate(
      { id: linha.id, acao: qual },
      {
        onSuccess: () =>
          toast.success(
            pausar ? t("Campanha pausada com sucesso!") : t("Campanha retomada com sucesso!"),
          ),
        onError: (err) =>
          err instanceof ApiError
            ? showApiError(err)
            : toast.error(
                pausar
                  ? t("Falha ao pausar a campanha. Tente novamente.")
                  : t("Falha ao retomar a campanha. Tente novamente."),
              ),
      },
    );
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={executar}
      disabled={acao.isPending}
      className={cn(
        "grid size-7 place-items-center rounded-casca-gatilho transition-colors disabled:opacity-50",
        pausar
          ? "border border-casca-borda text-casca-texto-2 hover:bg-casca-raia"
          : "bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte",
      )}
    >
      {pausar ? <CirclePause size={16} aria-hidden /> : <Play size={14} aria-hidden />}
    </button>
  );
}
