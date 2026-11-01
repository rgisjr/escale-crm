"use client";
import Link from "next/link";
import { toast } from "sonner";

import { ACTION_LABELS, type ActionType } from "@/app/app/webhooks/_components/labels";
import { explicacaoDe } from "@/app/app/webhooks/_components/ActivityTab";
import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useResendAutomationRun } from "@/hooks/webhooks/useAutomationRules";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { ROTULO_DO_STATUS_DA_EXECUCAO } from "@/lib/escale/automacoes/insights/csv";
import { podeReenviar, primeiroPassoComProblema } from "@/lib/escale/automacoes/insights/regras";
import type { LinhaDaExecucao } from "@/lib/escale/automacoes/insights/tipos";
import { rotaDoNegocio } from "@/lib/escale/negocio/regras";
import { Mail, MessageCircle, Send } from "@/lib/ui/icons-da-casca";

const SELO: Record<LinhaDaExecucao["status"], string> = {
  success: "bg-success-bg text-success-fg",
  failed: "bg-error-bg text-error-fg",
  partial: "bg-warning-bg text-warning-fg",
  adiado: "bg-info-bg text-info-fg",
};

/**
 * O CARTÃO DE UMA EXECUÇÃO (07-029; fork Escale, Fase 5C; I10, I11): contato, telefone e e-mail,
 * data, selo do status, "Ver negócio" e "Reenviar". Quando não deu certo, a 2ª linha diz em que
 * passo e por quê. Diferença da Clint: cada linha é uma execução, com o status no lugar das tags.
 */
export function CartaoDaExecucao({
  linha,
  acoes,
  fuso,
}: {
  linha: LinhaDaExecucao;
  acoes: readonly { type: string }[];
  fuso: string;
}) {
  const t = useT();
  const reenviar = useResendAutomationRun();
  const contato = linha.contato;
  const problema = primeiroPassoComProblema(linha.resultados);
  const tipo = problema ? (acoes[problema.indice]?.type ?? problema.resultado.type) : "";
  const rotuloDaAcao = ACTION_LABELS[tipo as ActionType] ?? tipo;

  return (
    <li className="rounded-lg border border-casca-divisoria bg-surface px-6 py-3 shadow-sm">
      <div className="grid grid-cols-[minmax(0,2fr)_1px_minmax(0,2fr)_auto_auto_auto] items-center gap-6">
        <div className="flex min-w-0 items-center gap-3">
          {contato ? (
            <>
              <FotoDaLinha id={contato.id} nome={contato.nome} temFoto={contato.temFoto} />
              <span className="truncate text-[13px] font-medium text-casca-texto">{contato.nome}</span>
            </>
          ) : (
            <>
              <span aria-hidden className="size-8 shrink-0 rounded-full bg-casca-raia" />
              <span className="truncate text-[13px] text-casca-suave">{t("Contato não identificado")}</span>
            </>
          )}
        </div>
        <span aria-hidden className="h-10 w-px bg-casca-divisoria" />
        <div className="flex min-w-0 flex-col gap-1 text-[12px] text-casca-texto-2">
          {contato?.telefone ? (
            <span className="flex items-center gap-1.5">
              <MessageCircle size={13} className="shrink-0 text-casca-marca" aria-hidden />
              {formatarTelefone(contato.telefone)}
            </span>
          ) : null}
          {contato?.email ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail size={13} className="shrink-0 text-casca-marca" aria-hidden />
              <span className="truncate">{contato.email}</span>
            </span>
          ) : null}
        </div>
        <span className="text-[12px] text-casca-texto-2">{dataEHoraBr(linha.criadaEm, fuso)}</span>
        <span className={`rounded px-1.5 py-0.5 text-[11px] ${SELO[linha.status]}`}>
          {t(ROTULO_DO_STATUS_DA_EXECUCAO[linha.status])}
        </span>
        <div className="flex items-center gap-3 text-[13px]">
          {linha.negocio ? (
            <Link href={rotaDoNegocio(linha.negocio.id)} className="text-casca-texto hover:underline">
              {t("Ver negócio")}
            </Link>
          ) : null}
          {podeReenviar(linha) ? (
            <BotaoDaCasca
              variante="texto"
              tamanho="sm"
              disabled={reenviar.isPending}
              onClick={() => reenviar.mutate(linha.id, { onSuccess: () => toast.success(t("Reenviado.")) })}
            >
              <Send size={13} aria-hidden />
              {t("Reenviar")}
            </BotaoDaCasca>
          ) : null}
        </div>
      </div>
      {problema ? (
        <p className="mt-2 text-[12px] text-casca-texto-2">
          <span className="font-medium">
            {t("Passo")} {problema.indice + 1} · {t(rotuloDaAcao)}:
          </span>{" "}
          {explicacaoDe(problema.resultado, t) ?? problema.resultado.error ?? t("Essa ação não funcionou.")}
        </p>
      ) : null}
    </li>
  );
}
