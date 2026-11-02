"use client";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ContaParaACaixa } from "@/hooks/escale/useComentarios";
import type { OrdemDaCaixa, PeriodoDaCaixa } from "@/lib/escale/comentarios/constantes";
import { NOME_DA_REDE } from "@/lib/escale/comentarios/formato";

export type AbaDaCaixa = "conversas" | "comentarios";

/**
 * FORK ESCALE · Fase 10A (4.2): o topo da coluna da esquerda da caixa de comentários — as abas
 * "Conversas" / "Comentários" (D1), o seletor da conta (D3) e o período e a ordem das publicações (D6).
 */
export function BarraDaCaixa({
  contas,
  conta,
  aoMudarConta,
  periodo,
  aoMudarPeriodo,
  ordem,
  aoMudarOrdem,
  aoMudarAba,
}: {
  contas: ContaParaACaixa[];
  conta: string;
  aoMudarConta: (id: string) => void;
  periodo: PeriodoDaCaixa;
  aoMudarPeriodo: (p: PeriodoDaCaixa) => void;
  ordem: OrdemDaCaixa;
  aoMudarOrdem: (o: OrdemDaCaixa) => void;
  aoMudarAba: (a: AbaDaCaixa) => void;
}) {
  const t = useT();
  return (
    <div className="shrink-0 border-b border-casca-borda">
      <div className="flex h-14 items-end px-4">
        <AbasDaCasca<AbaDaCaixa>
          aria-label={t("Conversas")}
          semBorda
          valor="comentarios"
          aoMudar={aoMudarAba}
          abas={[
            { valor: "conversas", rotulo: t("Conversas") },
            { valor: "comentarios", rotulo: t("Comentários") },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2 border-t border-casca-borda px-4 py-3">
        <SeletorDaCasca
          aria-label={t("Conta do Instagram")}
          valor={conta}
          aoMudar={(v) => v && aoMudarConta(v)}
          opcoes={contas.map((c) => ({
            valor: c.id,
            rotulo: `${c.nome} · ${NOME_DA_REDE[c.plataforma]}${c.conectada ? "" : ` — ${t("desconectada")}`}`,
          }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <SeletorDaCasca<PeriodoDaCaixa>
            aria-label={t("Período")}
            valor={periodo}
            aoMudar={(v) => v && aoMudarPeriodo(v)}
            opcoes={[
              { valor: "7d", rotulo: t("Últimos 7 dias") },
              { valor: "30d", rotulo: t("Últimos 30 dias") },
              { valor: "90d", rotulo: t("Últimos 90 dias") },
              { valor: "tudo", rotulo: t("Tudo") },
            ]}
          />
          <SeletorDaCasca<OrdemDaCaixa>
            aria-label={t("Ordem")}
            valor={ordem}
            aoMudar={(v) => v && aoMudarOrdem(v)}
            opcoes={[
              { valor: "recentes", rotulo: t("Comentário mais recente") },
              { valor: "mais_comentarios", rotulo: t("Mais comentários") },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
