"use client";
import { ChipDeEtiqueta } from "@/components/tags/ChipDeEtiqueta";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import {
  aguardandoHa,
  horaDaLinha,
  inicialDoAtendente,
  previaDaLinha,
  ultimaFoiNossa,
} from "@/lib/escale/conversas/linha";
import { corDaEspera, textoDaEspera, type Visualizacao } from "@/lib/escale/conversas/visualizacao";
import { corDoAvatar } from "@/lib/escale/quadro/aparencia";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { AlarmClock, CheckCheck, ChevronDown, Pin, UserX, X } from "@/lib/ui/icons-da-casca";
import { MonogramaDoSetor } from "@/components/escale/conversas/configuracoes/MonogramaDoSetor";
import type { SetorDaConversa } from "@/lib/escale/conversas/setores-banco";
import { cn } from "@/lib/utils";

import { FotoDaConversa } from "./FotoDaConversa";

const COR_DA_ESPERA = {
  cinza: "text-casca-suave",
  amarelo: "text-casca-atencao",
  vermelho: "font-semibold text-casca-alerta",
} as const;

/**
 * A LINHA DA FILA DA CLINT (fork Escale, Fase 3A; A7, A15; c01, c47, c54).
 * A primeira linha é sempre a mesma; a segunda aparece com o que a pessoa
 * ligou em "Personalizar visualização". O setor (3C) e "⏱ n" (3B) entram
 * depois no mesmo lugar.
 */
export function LinhaDaFila({
  conversa,
  selecionada,
  fixada = false,
  aoSelecionar,
  aoSoltar,
  visualizacao,
  agora,
  agendadas = 0,
  setor,
}: {
  conversa: ConversationWithContact;
  selecionada: boolean;
  fixada?: boolean;
  aoSelecionar: (id: string) => void;
  aoSoltar?: () => void;
  visualizacao: Visualizacao;
  agora: Date;
  /** FORK ESCALE · Fase 3B: quantas mensagens agendadas a conversa tem (o "⏱ n"). */
  agendadas?: number;
  /** FORK ESCALE · Fase 3C: o setor da conversa (selo da segunda linha). */
  setor?: SetorDaConversa;
}) {
  const t = useT();
  const nome = rotuloDoContato(conversa.contacts ?? null, t);
  const naoLidas = conversa.unread_count_for_assignee ?? 0;
  const atendente = conversa.assigned_to_user_name ?? null;
  const espera = visualizacao.campos.tempoSemResposta ? aguardandoHa(conversa, agora) : null;
  const tags = visualizacao.campos.tags ? (conversa.contacts?.tags ?? []).slice(0, 3) : [];
  const mostraAgendadas = visualizacao.campos.mensagensAgendadas && agendadas > 0;
  const mostraSetor = visualizacao.campos.setor && !!setor?.setor;
  const segundaLinha = espera !== null || tags.length > 0 || mostraAgendadas || mostraSetor;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => aoSelecionar(conversa.id)}
        aria-current={selecionada ? "true" : undefined}
        data-fixada={fixada ? "" : undefined}
        className={cn(
          "group flex w-full items-start gap-3 border-b border-casca-borda px-3 text-left",
          segundaLinha ? "min-h-24 py-3" : "h-[72px] py-3.5",
          fixada ? "bg-casca-fixada" : selecionada ? "bg-casca-raia" : "hover:bg-casca-raia",
          selecionada && !fixada && "shadow-[inset_3px_0_0_var(--color-casca-marca)]",
        )}
      >
        <FotoDaConversa conversa={conversa} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-medium text-casca-texto">{nome}</span>
            {!fixada ? (
              <span className="shrink-0 text-[11px] text-casca-meta">
                {horaDaLinha(conversa.last_message_at, agora, t)}
              </span>
            ) : null}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 text-[12px] text-casca-suave">
              {ultimaFoiNossa(conversa) ? (
                <CheckCheck size={14} aria-hidden data-testid="enviada" className="shrink-0" />
              ) : null}
              <span className="truncate">{previaDaLinha(conversa, t)}</span>
            </span>
            {!fixada ? (
              <span className="flex shrink-0 items-center gap-1.5">
                {visualizacao.campos.atendente ? (
                  atendente ? (
                    <span
                      title={`${t("Atendente:")} ${atendente}`}
                      className="grid size-5 place-items-center rounded-full text-[10px] font-semibold text-white"
                      style={{
                        backgroundColor: corDoAvatar(conversa.assigned_to_user_id ?? atendente),
                      }}
                    >
                      {inicialDoAtendente(atendente)}
                    </span>
                  ) : (
                    <span
                      title={t("Sem atendente")}
                      className="grid size-5 place-items-center rounded-full bg-casca-raia text-casca-meta"
                    >
                      <UserX size={12} aria-hidden />
                    </span>
                  )
                ) : null}
                {naoLidas > 0 ? (
                  <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-casca-novo px-1 text-[10px] font-semibold text-white tabular-nums">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                ) : null}
                <ChevronDown
                  size={14}
                  aria-hidden
                  className="text-casca-suave opacity-0 group-hover:opacity-100"
                />
              </span>
            ) : null}
          </span>
          {segundaLinha ? (
            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {mostraSetor && setor?.setor ? (
                <span
                  title={
                    setor.em_transferencia
                      ? `${t("Em transferência para")} ${setor.setor.nome}`
                      : `${t("Setor:")} ${setor.setor.nome}`
                  }
                >
                  <MonogramaDoSetor
                    setor={setor.setor}
                    tamanho="linha"
                    tracejado={setor.em_transferencia}
                  />
                </span>
              ) : null}
              {espera !== null ? (
                <span
                  data-cor={corDaEspera(espera, visualizacao)}
                  title={`${t("Aguardando resposta há")} ${textoDaEspera(espera, t)}`}
                  className={cn("text-[11px]", COR_DA_ESPERA[corDaEspera(espera, visualizacao)])}
                >
                  {textoDaEspera(espera, t)}
                </span>
              ) : null}
              {mostraAgendadas ? (
                <span
                  title={`${agendadas} ${t("mensagens agendadas")}`}
                  className="inline-flex items-center gap-0.5 text-[11px] text-casca-suave"
                >
                  <AlarmClock size={12} aria-hidden />
                  {agendadas}
                </span>
              ) : null}
              {tags.map((tag) => (
                <ChipDeEtiqueta key={tag} tag={tag} className="h-4 px-1.5 text-[10px]" />
              ))}
            </span>
          ) : null}
        </span>
      </button>
      {fixada ? (
        <>
          <button
            type="button"
            aria-label={t("Remover")}
            title={t("Remover")}
            onClick={aoSoltar}
            className="absolute top-2 right-2 grid size-5 place-items-center rounded-casca-gatilho text-casca-alerta hover:bg-surface"
          >
            <X size={14} aria-hidden />
          </button>
          <span
            role="img"
            aria-label={t(
              "Esta é a conversa atual e ela não corresponde a visualização dos filtros.",
            )}
            title={t("Esta é a conversa atual e ela não corresponde a visualização dos filtros.")}
            className="absolute right-2 bottom-2 text-casca-marca"
          >
            <Pin size={14} aria-hidden />
          </span>
        </>
      ) : null}
    </div>
  );
}
