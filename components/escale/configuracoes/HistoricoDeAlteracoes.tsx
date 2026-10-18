"use client";
import { useMemo } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAlteracoesDaDistribuicao } from "@/hooks/escale/useDistribuicao";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  dataBr,
  horaBr,
  textoDoPercentual,
  versoesDaDistribuicao,
  type AlteracaoDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";
import {
  History,
  Percent,
  RefreshCw,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { membrosAtivosDaEquipe } from "./ListaDePessoas";

const ESTILO: Record<AlteracaoDaDistribuicao["evento"], { Icone: LucideIcon; cor: string }> = {
  percentual_alterado: { Icone: Percent, cor: "text-casca-marca" },
  pessoa_entrou: { Icone: UserPlus, cor: "text-(--escale-status-ganho)" },
  pessoa_saiu: { Icone: UserMinus, cor: "text-casca-alerta" },
  contagem_reiniciada: { Icone: RefreshCw, cor: "text-casca-meta" },
};

/**
 * A GAVETA "HISTÓRICO DE ALTERAÇÕES" (fork Escale, Fase 1K; código `Ms` da Clint,
 * sem print). Versões da mais nova para a mais velha (o mesmo autor em até 2 s
 * é uma versão), com o selo "Versão atual" na primeira.
 */
export function HistoricoDeAlteracoes({
  aberta,
  aoFechar,
  pipelineId,
  origem,
}: {
  aberta: boolean;
  aoFechar: () => void;
  pipelineId: string;
  origem: string;
}) {
  const t = useT();
  const consulta = useAlteracoesDaDistribuicao(pipelineId, aberta);
  const equipe = useTeamMembers();
  const membros = useMemo(
    () => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")),
    [equipe.data, t],
  );
  const nomeDe = (id: string | null) =>
    (id && membros.find((m) => m.id === id)?.nome) || t("Usuário desconhecido");
  const versoes = versoesDaDistribuicao(consulta.data ?? []);

  function texto(a: AlteracaoDaDistribuicao): string {
    const pct = (n: number | null) => (n === null ? "" : textoDoPercentual(n));
    const nome = nomeDe(a.pessoaId);
    switch (a.evento) {
      case "percentual_alterado":
        return t("Percentual de {nome} alterado de {de}% para {para}%")
          .split("{nome}")
          .join(nome)
          .split("{de}")
          .join(pct(a.percentualAntes))
          .split("{para}")
          .join(pct(a.percentualDepois));
      case "pessoa_entrou":
        return t("{nome} entrou na distribuição com {percentual}%")
          .split("{nome}")
          .join(nome)
          .split("{percentual}")
          .join(pct(a.percentualDepois));
      case "pessoa_saiu":
        return t("{nome} saiu da distribuição").split("{nome}").join(nome);
      case "contagem_reiniciada":
        return t("Contagem de negócios reiniciada");
    }
  }

  return (
    <Sheet open={aberta} onOpenChange={(a) => !a && aoFechar()}>
      <SheetContent
        side="right"
        className="flex w-[92vw] max-w-[400px] flex-col gap-0 bg-surface p-0 text-casca-texto"
      >
        <SheetHeader className="border-b border-casca-borda px-5 py-4 text-left">
          <SheetTitle className="text-[16px] font-medium text-casca-texto">
            {t("Histórico de alterações")}
          </SheetTitle>
          <SheetDescription className="text-[12px] text-casca-suave">{`${t("Distribuição de dono")} · ${origem}`}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {consulta.isPending ? (
            <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>
          ) : consulta.isError ? (
            <p role="alert" className="text-[13px] text-casca-alerta">
              {t("Não consegui ler o histórico.")}
            </p>
          ) : versoes.length === 0 ? (
            <div className="grid place-items-center gap-2 py-12 text-casca-suave">
              <History size={24} aria-hidden />
              <p className="text-[13px]">{t("Nenhuma alteração registrada ainda.")}</p>
            </div>
          ) : (
            <ol className="grid gap-6">
              {versoes.map((v, i) => (
                <li key={v.itens[0]!.id} className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-casca-texto">
                      {dataBr(v.em)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        i === 0
                          ? "bg-casca-marca-suave text-casca-marca"
                          : "bg-casca-raia text-casca-suave",
                      )}
                    >
                      {i === 0 ? t("Versão atual") : t("Versão anterior")}
                    </span>
                  </div>
                  <p
                    className="text-[12px] text-casca-suave"
                    title={`${nomeDe(v.autorId)} · ${dataBr(v.em)} ${horaBr(v.em)}`}
                  >
                    {`${nomeDe(v.autorId)} · ${horaBr(v.em)}`}
                  </p>
                  <ul className="grid gap-2">
                    {v.itens.map((a) => {
                      const { Icone, cor } = ESTILO[a.evento];
                      return (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 text-[13px] text-casca-texto"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-full bg-casca-raia",
                              cor,
                            )}
                          >
                            <Icone size={13} />
                          </span>
                          {texto(a)}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
