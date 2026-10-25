"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { estadoDaJanela } from "@/lib/channels/janela";
import { emEsperaDaCasca } from "@/lib/escale/conversas/espera";
import { seloDaJanela } from "@/lib/escale/conversas/janela";
import { CheckCircle2, Clock, Hourglass, RotateCcw } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const TOM: Record<"aberta" | "fechada" | "aguardando", string> = {
  aberta: "bg-casca-marca-suave text-casca-marca",
  fechada: "bg-casca-atraso text-casca-alerta",
  aguardando: "bg-casca-raia text-casca-suave",
};

/**
 * A BARRA DE STATUS (c05, c56, c58, c60, c73; C2): o selo da janela à
 * esquerda e, à direita, espera e encerrar. Os eventos nascem nas rotas do
 * fork (N3, N4), nunca nos hooks do original.
 */
export function BarraDeStatus({
  conversa,
  ultimaFoiTemplate,
  agora,
}: {
  conversa: ConversationWithContact;
  ultimaFoiTemplate: boolean;
  agora: Date;
}) {
  const t = useT();
  const acoes = useConversaDaCasca(conversa.id);
  const provider = conversa.channel_sessions?.provider ?? null;
  const selo = seloDaJanela(
    estadoDaJanela(provider, conversa.last_inbound_at ?? null, agora),
    provider,
    ultimaFoiTemplate,
    t,
  );
  const emEspera = emEsperaDaCasca({
    snooze_until: conversa.snooze_until ?? null,
    metadata: conversa.metadata ?? null,
  });
  const fechada = conversa.status === "closed";
  const ocupado =
    acoes.entrarEmEspera.isPending ||
    acoes.sairDaEspera.isPending ||
    acoes.encerrar.isPending ||
    acoes.reabrir.isPending;

  return (
    <div
      className="flex h-10 shrink-0 items-center gap-2 border-b border-casca-borda px-4"
      data-testid="barra-de-status"
    >
      {selo ? (
        <span
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[14px] font-medium",
            TOM[selo.tom],
          )}
        >
          <Clock size={14} aria-hidden />
          {selo.texto}
        </span>
      ) : null}
      <span className="flex-1" />
      {!fechada ? (
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          disabled={ocupado}
          aria-pressed={emEspera}
          aria-label={emEspera ? t("Remover espera") : t("Colocar em espera")}
          title={emEspera ? t("Remover espera") : t("Colocar em espera")}
          className={emEspera ? "text-casca-marca" : undefined}
          onClick={() => (emEspera ? acoes.sairDaEspera.mutate() : acoes.entrarEmEspera.mutate())}
        >
          <Hourglass size={16} aria-hidden />
        </BotaoDaCasca>
      ) : null}
      <BotaoDaCasca
        variante="icone"
        tamanho="sm"
        disabled={ocupado}
        aria-label={fechada ? t("Reabrir atendimento") : t("Encerrar atendimento")}
        title={fechada ? t("Reabrir atendimento") : t("Encerrar atendimento")}
        onClick={() =>
          fechada
            ? acoes.reabrir.mutate()
            : acoes.encerrar.mutate({ expected_revision: conversa.service_revision })
        }
      >
        {fechada ? <RotateCcw size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
      </BotaoDaCasca>
    </div>
  );
}
