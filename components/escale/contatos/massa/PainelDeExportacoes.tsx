"use client";
import { useState } from "react";
import { toast } from "sonner";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAcoesEmMassa, useDecidirExportacao } from "@/hooks/escale/useAcoesEmMassa";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import type { PedidoParaAprovar, ResumoDaAcao } from "@/lib/escale/massa/tipos";
import { Download } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Estado = "aguardando" | "gerando" | "pronta" | "recusada" | "expirada" | "falhou";

/** O estado de uma exportação como a pessoa entende (nosso, Q4). O arquivo vencido (24 h) também é "Expirada". */
export function estadoDaExportacao(a: ResumoDaAcao): Estado {
  if (a.status === "aguardando_aprovacao") return "aguardando";
  if (a.status === "recusada") return "recusada";
  if (a.status === "expirada") return "expirada";
  if (a.status === "falhou") return "falhou";
  if (a.status === "concluida") return a.tem_arquivo ? "pronta" : "expirada";
  return "gerando";
}

const ROTULO_DO_ESTADO: Record<Estado, string> = {
  aguardando: "Aguardando aprovação",
  gerando: "Gerando",
  pronta: "Pronta",
  recusada: "Recusada",
  expirada: "Expirada",
  falhou: "Falhou",
};
const CLASSE_DO_ESTADO: Record<Estado, string> = {
  aguardando: "bg-casca-marca-suave text-casca-marca",
  gerando: "bg-casca-raia text-casca-texto",
  pronta: "bg-casca-marca text-white",
  recusada: "border border-casca-alerta text-casca-alerta",
  expirada: "border border-casca-borda text-casca-meta",
  falhou: "border border-casca-alerta text-casca-alerta",
};
const ROTULO_DO_GRUPO =
  "px-4 pt-3 pb-1 text-[10px] font-semibold tracking-[0.06em] text-casca-meta uppercase";
const BOTAO =
  "h-7 rounded-[5px] px-2.5 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-60";

/** A data e a hora no idioma de quem lê (24 h, no fuso do navegador). */
function Quando({ iso }: { iso: string }) {
  return <>{quando(iso, useTagDeIdioma())}</>;
}

/** "17/10/2026 12:00" (formato brasileiro, 24 h, no fuso do navegador). */
function quando(iso: string, tag: string): string {
  return new Intl.DateTimeFormat(tag, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(", ", " ");
}

/**
 * O BOTÃO "EXPORTAÇÕES" DO CABEÇALHO (fork Escale, Fase 2B; Q4 — sem equivalente na
 * Clint, que manda um código em vez de pedir aprovação). Para gerente ou acima: as
 * minhas exportações dos últimos 8 dias, com o estado ("Aguardando aprovação",
 * "Gerando", "Pronta" com "Baixar exportação", "Recusada", "Expirada"); para o admin,
 * também "Para aprovar" (quem pediu, quantos contatos, quando, "Aprovar" e "Recusar").
 * Pergunta a cada 30 s; aberto, a cada 5 s.
 */
export function PainelDeExportacoes({ ehAdmin }: { ehAdmin: boolean }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const acoes = useAcoesEmMassa(true, aberto ? 5000 : 30_000);
  const membros = useAssignableMembers(ehAdmin);
  const decidir = useDecidirExportacao();
  const exportacoes = (acoes.data?.minhas ?? []).filter((a) => a.acao === "exportar");
  const paraAprovar: PedidoParaAprovar[] = ehAdmin ? (acoes.data?.para_aprovar ?? []) : [];
  const prontas = exportacoes.filter((a) => estadoDaExportacao(a) === "pronta").length;
  const selo = paraAprovar.length + prontas;
  const nome = (id: string) =>
    membros.data?.find((m) => m.user_id === id)?.full_name ?? t("Alguém da equipe");
  const contatos = (n: number) => t("{n} contatos").replace("{n}", n.toLocaleString("pt-BR"));

  function decidirPedido(p: PedidoParaAprovar, aprovar: boolean) {
    decidir.mutate(
      { id: p.id, aprovar },
      {
        onSuccess: () =>
          toast.success(aprovar ? t("Exportação aprovada.") : t("Exportação recusada.")),
        onError: (e) =>
          toast.error(
            e instanceof Error && e.message
              ? e.message
              : t("Não consegui completar essa ação. Tente de novo."),
          ),
      },
    );
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Ver exportações")}
          title={t("Ver exportações")}
          className="relative grid size-8 place-items-center rounded-casca-gatilho border border-casca-borda text-casca-texto hover:bg-casca-raia"
        >
          <Download size={16} aria-hidden />
          {selo > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-casca-marca px-1 text-[10px] font-semibold text-white">
              {selo}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" className="w-[360px] p-0">
        <div className="flex h-11 items-center border-b border-casca-borda px-4 text-[13px] font-medium text-casca-texto">
          {t("Exportações")}
        </div>
        <div className="max-h-[60vh] overflow-y-auto pb-1">
          {ehAdmin ? (
            <section aria-label={t("Para aprovar")}>
              <p className={ROTULO_DO_GRUPO}>{t("Para aprovar")}</p>
              {paraAprovar.length === 0 ? (
                <p className="px-4 py-2 text-[12px] text-casca-suave">
                  {t("Nenhum pedido aguardando aprovação.")}
                </p>
              ) : (
                <ul>
                  {paraAprovar.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 border-b border-casca-borda px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1 text-[12px]">
                        <p className="font-medium text-casca-texto">
                          {t("{nome} pediu {n} contatos")
                            .replace("{nome}", nome(p.solicitante_id))
                            .replace("{n}", p.total.toLocaleString("pt-BR"))}
                        </p>
                        <p className="text-casca-suave"><Quando iso={p.created_at} /></p>
                      </div>
                      <button
                        type="button"
                        disabled={decidir.isPending}
                        title={decidir.isPending ? t("Aguarde…") : undefined}
                        onClick={() => decidirPedido(p, false)}
                        className={cn(
                          BOTAO,
                          "border border-casca-borda text-casca-texto hover:bg-casca-raia",
                        )}
                      >
                        {t("Recusar")}
                      </button>
                      <button
                        type="button"
                        disabled={decidir.isPending}
                        title={decidir.isPending ? t("Aguarde…") : undefined}
                        onClick={() => decidirPedido(p, true)}
                        className={cn(
                          BOTAO,
                          "bg-casca-marca text-white hover:bg-casca-marca-forte",
                        )}
                      >
                        {t("Aprovar")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
          <section aria-label={t("Minhas exportações")}>
            <p className={ROTULO_DO_GRUPO}>{t("Minhas exportações")}</p>
            {exportacoes.length === 0 ? (
              <p className="px-4 py-2 text-[12px] text-casca-suave">
                {t("Nenhuma exportação nos últimos dias.")}
              </p>
            ) : (
              <ul>
                {exportacoes.map((a) => {
                  const estado = estadoDaExportacao(a);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 border-b border-casca-borda px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1 text-[12px]">
                        <p className="font-medium text-casca-texto">{contatos(a.total)}</p>
                        <p className="text-casca-suave"><Quando iso={a.created_at} /></p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          CLASSE_DO_ESTADO[estado],
                        )}
                      >
                        {t(ROTULO_DO_ESTADO[estado])}
                      </span>
                      {estado === "pronta" ? (
                        <a
                          href={`/api/v1/acoes-em-massa/${a.id}/arquivo`}
                          target="_blank"
                          rel="noopener"
                          className="text-[12px] font-medium text-casca-marca hover:underline"
                        >
                          {t("Baixar exportação")}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
