"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDoDetalhe } from "@/components/escale/campanhas/molde/JanelaDoDetalhe";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { DetalheDaProspeccao as Detalhe } from "@/lib/escale/prospeccao/tipos";
import { CirclePause, Play } from "@/lib/ui/icons-da-casca";

import { SumarioDaProspeccao } from "./SumarioDaProspeccao";
import { EmpresasDaProspeccao } from "./EmpresasDaProspeccao";

type Aba = "sumario" | "detalhes";

function BotaoDePausa({ detalhe }: { detalhe: Detalhe }) {
  const t = useT();
  const acao = useAcaoDaProspeccao();
  const situacao = detalhe.linha.situacao;
  if (situacao !== "em_progresso" && situacao !== "pausada") return null;
  const pausar = situacao === "em_progresso";

  async function executar() {
    try {
      await acao.mutateAsync({ action: pausar ? "pause" : "resume", id: detalhe.linha.id });
      toast.success(pausar ? t("Novas abordagens pausadas.") : t("Prospecção retomada."));
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."),
      );
    }
  }

  return (
    <button
      type="button"
      onClick={() => void executar()}
      disabled={acao.isPending}
      className={
        pausar
          ? "inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-50"
          : "inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
      }
    >
      {pausar ? <CirclePause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
      {pausar ? t("Pausar prospecção") : t("Retomar prospecção")}
    </button>
  );
}

/**
 * A JANELA DE DETALHE DA PROSPECÇÃO (molde 009/012, peças da 8C; D10):
 * "INFORMAÇÕES DA PROSPECÇÃO", o nome, Pausar/Retomar e as abas Sumário e
 * Detalhes. Reconsulta sozinha enquanto busca ou aborda (Task 3).
 */
export function DetalheDaProspeccao({
  id,
  aoFechar,
}: {
  id: string;
  aoFechar: () => void;
  fuso?: string;
}) {
  const t = useT();
  const [aba, setAba] = useState<Aba>("sumario");
  const detalhe = useDetalheDaProspeccao(id);
  const opcoes = useOpcoesDaProspeccao();
  const d = detalhe.data;

  return (
    <JanelaDoDetalhe
      aberta
      aoFechar={aoFechar}
      rotulo={t("INFORMAÇÕES DA PROSPECÇÃO")}
      titulo={d?.linha.nome ?? ""}
      acoes={d ? <BotaoDePausa detalhe={d} /> : undefined}
      abas={[
        { valor: "sumario", rotulo: t("Sumário") },
        { valor: "detalhes", rotulo: t("Detalhes") },
      ]}
      abaAtiva={aba}
      aoTrocarAba={(v) => setAba(v === "detalhes" ? "detalhes" : "sumario")}
    >
      {detalhe.isError ? (
        <div className="py-10 text-center text-[13px] text-casca-suave">
          <p>{t("Não foi possível carregar a prospecção.")}</p>
          <button
            type="button"
            onClick={() => void detalhe.refetch()}
            className="mt-3 text-[12px] font-medium text-casca-marca hover:underline"
          >
            {t("Tentar novamente")}
          </button>
        </div>
      ) : !d ? (
        <p role="status" className="py-10 text-center text-[13px] text-casca-suave">
          {t("Carregando prospecção")}
        </p>
      ) : aba === "sumario" ? (
        <SumarioDaProspeccao detalhe={d} opcoes={opcoes.data} />
      ) : (
        <EmpresasDaProspeccao detalhe={d} />
      )}
    </JanelaDoDetalhe>
  );
}
