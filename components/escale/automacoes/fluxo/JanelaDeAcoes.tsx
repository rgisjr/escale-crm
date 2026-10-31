"use client";
import { useState } from "react";

import type { ActionType } from "@/app/app/webhooks/_components/labels";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { ABAS_DAS_ACOES, type AbaDasAcoes } from "@/lib/escale/automacoes/fluxo/paleta";
import { acoesQueFechamLaco, MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";
import { Briefcase, UserRound, Webhook } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ICONE_DA_ACAO } from "./visual-do-fluxo";

const ICONE_DA_ABA = { contatos: UserRound, integracoes: Webhook, crm: Briefcase } as const;

function Conteudo({ evento, aoEscolher }: { evento: string; aoEscolher: (tipo: ActionType) => void }) {
  const t = useT();
  const [aba, setAba] = useState<AbaDasAcoes>("contatos");
  const atual = ABAS_DAS_ACOES.find((a) => a.aba === aba) ?? ABAS_DAS_ACOES[0]!;

  return (
    <>
      <DialogTitle className="px-7 pt-6 text-[14px] font-medium text-casca-texto">{t("Realizar ação")}</DialogTitle>
      <div className="flex gap-7 px-7 pt-5 pb-8">
        <nav aria-label={t("Realizar ação")} role="tablist" aria-orientation="vertical" className="flex w-[200px] shrink-0 flex-col gap-2">
          {ABAS_DAS_ACOES.map((a) => {
            const Icone = ICONE_DA_ABA[a.aba];
            const ativa = a.aba === aba;
            return (
              <button
                key={a.aba}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(a.aba)}
                className={cn(
                  "relative flex h-[54px] items-center gap-3 rounded-md px-3 text-left text-[13px] whitespace-nowrap",
                  ativa ? "bg-casca-marca-suave text-casca-marca-forte" : "text-casca-texto hover:bg-casca-raia",
                )}
              >
                {ativa ? <span aria-hidden className="absolute inset-y-0 -left-7 w-[3px] bg-casca-marca" /> : null}
                <span className="grid size-[34px] shrink-0 place-items-center rounded-md border border-casca-divisoria bg-surface">
                  <Icone size={16} aria-hidden />
                </span>
                {t(a.titulo)}
              </button>
            );
          })}
        </nav>
        <div role="tabpanel" className="min-w-0 flex-1">
          <p className="text-[13px] text-casca-texto">{t(atual.titulo)}</p>
          <p className="mb-5 text-[12px] text-casca-suave">{t(atual.descricao)}</p>
          <div className="flex max-w-[500px] flex-col gap-3">
            {atual.cartoes.map((c) => {
              const Icone = ICONE_DA_ACAO[c.tipo];
              const travado = acoesQueFechamLaco(evento, [{ type: c.tipo }]).length > 0;
              return (
                <button
                  key={c.tipo}
                  type="button"
                  disabled={travado}
                  title={travado ? t(MENSAGEM_DO_LACO_DE_LEAD) : undefined}
                  onClick={() => aoEscolher(c.tipo)}
                  className="flex items-center gap-4 rounded-md border border-casca-divisoria px-3 py-2.5 text-left hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icone size={22} className="shrink-0 text-casca-texto" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-casca-texto">{t(c.titulo)}</span>
                    <span className="block text-[12px] text-casca-texto-2">{t(c.descricao)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * O MODAL "REALIZAR AÇÃO" (Clint, ao vivo): abas na vertical à esquerda, a lista de
 * cartões da aba à direita, sem rodapé. Clicar num cartão já escolhe a ação e o painel
 * do passo "Ações" a acrescenta à lista. Só as ações que o nosso motor tem.
 */
export function JanelaDeAcoes({
  aberta,
  evento,
  aoFechar,
  aoEscolher,
}: {
  aberta: boolean;
  evento: string;
  aoFechar: () => void;
  aoEscolher: (tipo: ActionType) => void;
}) {
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(896px,calc(100vw-2rem))] gap-0 rounded-xl p-0">
      {aberta && <Conteudo evento={evento} aoEscolher={aoEscolher} />}
    </JanelaDaCasca>
  );
}
