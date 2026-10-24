"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExcluirNota } from "@/hooks/escale/useNotasDoNegocio";
import type { AlvoDaNota } from "@/lib/escale/negocio/notas";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { grupoDoEvento, textoDoEvento, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import type { Nota } from "@/lib/escale/negocio/notas";
import { haQuantoTempo } from "@/lib/escale/negocio/regras";
import { actorName } from "@/lib/leads/activity-vocabulary";
import type { TimelineItemView } from "@/lib/types/contacts";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListChecks,
  Mail,
  Merge,
  MessageCircle,
  NotebookPen,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  Zap,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O CARTÃO DO HISTÓRICO DA CLINT (fork Escale, Fase 1H; C18; print 07). */
const ICONE: Record<ChaveDoGrupo, LucideIcon> = {
  todos: ListChecks,
  agendamentos: CalendarDays,
  automacoes: Zap,
  atividades: CheckCircle2,
  notas: NotebookPen,
  email: Mail,
  lembretes: Clock,
  ligacao: Phone,
  negocio_criado: Plus,
  clique_whatsapp: MessageCircle,
  alteracoes_negocio: ListChecks,
  alteracao_de_campos: Pencil,
  integracoes: Send,
  campanhas: Send,
  mescla_de_contatos: Merge,
  anexos: Paperclip,
};
/** Q12: verde para atividade/agendamento, marca para o negócio, cinza para o resto. */
function corDoGrupo(grupo: ChaveDoGrupo): string {
  if (grupo === "atividades" || grupo === "agendamentos")
    return "bg-[var(--escale-status-ganho)] text-white";
  if (
    grupo === "alteracoes_negocio" ||
    grupo === "negocio_criado" ||
    grupo === "alteracao_de_campos"
  )
    return "bg-casca-marca text-accent-foreground";
  return "bg-casca-borda text-casca-texto-2";
}

export function CartaoDoHistorico({
  item,
  nota,
  notaRemovida = false,
  nomesDasEtapas,
  alvo,
  podeEditarNota,
}: {
  item: TimelineItemView;
  nota?: Nota;
  /** Só vale "removida" quando a lista de notas carregou e não traz esta; carregando ou com erro, nada aparece. */
  notaRemovida?: boolean;
  nomesDasEtapas: Readonly<Record<string, string>>;
  alvo: AlvoDaNota;
  podeEditarNota: boolean;
}) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const excluir = useExcluirNota(alvo);
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const grupo = grupoDoEvento(item);
  const Icone = item.actor_kind === "ai" ? Bot : ICONE[grupo];
  const { titulo, trechos } = textoDoEvento(item, nomesDasEtapas, t);
  const quem = actorName(
    item.actor_kind ?? null,
    { agente: item.actor_agent_name ?? null, usuario: item.actor_user_name ?? null },
    t,
  );

  async function remover() {
    setRemovendo(false);
    if (!nota) return;
    try {
      await excluir.mutateAsync(nota.id);
      toast.success(t("A nota foi removida com sucesso!"));
    } catch {
      toast.error(t("Ocorreu um erro ao remover a nota!"));
    }
  }

  return (
    <li className="flex gap-3 rounded-lg bg-casca-raia p-3">
      <span
        aria-hidden
        className={cn("grid size-8 shrink-0 place-items-center rounded-md", corDoGrupo(grupo))}
      >
        <Icone size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-casca-texto">{titulo}</p>
        {trechos.length ? (
          <p className="mt-0.5 text-[13px] text-casca-texto-2">
            {trechos.map((x, i) =>
              x.negrito ? (
                <strong key={i} className="font-semibold text-casca-texto">
                  {x.texto}
                </strong>
              ) : (
                <span key={i}>{x.texto}</span>
              ),
            )}
          </p>
        ) : null}
        {nota ? (
          <div className="mt-1">
            <p
              className={cn(
                "text-[13px] whitespace-pre-wrap text-casca-texto-2",
                !aberta && "line-clamp-2",
              )}
            >
              {nota.texto}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAberta((a) => !a)}
                className="text-[12px] text-casca-marca hover:underline"
              >
                {aberta ? t("Ocultar nota") : t("Ver nota")}
              </button>
              {aberta && podeEditarNota ? (
                <>
                  <BotaoDaCasca variante="texto" tamanho="sm" onClick={() => setEditando(true)}>
                    {t("Editar nota")}
                  </BotaoDaCasca>
                  <BotaoDaCasca
                    variante="icone"
                    tamanho="sm"
                    aria-label={t("Remover nota")}
                    onClick={() => setRemovendo(true)}
                  >
                    <Trash2 aria-hidden />
                  </BotaoDaCasca>
                </>
              ) : null}
            </div>
          </div>
        ) : item.type === "note" && notaRemovida ? (
          <p className="mt-0.5 text-[12px] text-casca-meta">{t("Esta nota foi removida.")}</p>
        ) : null}
        <p className="mt-1 flex items-center gap-1 text-[11px] text-casca-suave">
          <Clock size={12} aria-hidden />
          {haQuantoTempo(item.performed_at, new Date(), idioma)} {t("por")}
          <span className="grid size-4 place-items-center rounded-full bg-casca-marca-suave text-[9px] font-semibold text-casca-marca">
            {quem.charAt(0).toUpperCase()}
          </span>
          {quem}
        </p>
      </div>
      {nota ? (
        <>
          <JanelaDeNota
            alvo={alvo}
            aberta={editando}
            onFechar={() => setEditando(false)}
            nota={{ id: nota.id, texto: nota.texto }}
          />
          <AlertDialog open={removendo} onOpenChange={setRemovendo}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Deseja remover a nota?")}</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void remover()}>{t("Remover")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </li>
  );
}
