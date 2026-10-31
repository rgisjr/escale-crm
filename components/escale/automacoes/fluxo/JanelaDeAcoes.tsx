"use client";
import { useState } from "react";

import type { ActionType } from "@/app/app/webhooks/_components/labels";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { ABAS_DAS_ACOES, type AbaDasAcoes } from "@/lib/escale/automacoes/fluxo/paleta";
import { acoesQueFechamLaco, MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";
import { cn } from "@/lib/utils";

import { ICONE_DA_ACAO } from "./visual-do-fluxo";

function Conteudo({
  evento,
  aoFechar,
  aoRealizar,
}: {
  evento: string;
  aoFechar: () => void;
  aoRealizar: (tipo: ActionType) => void;
}) {
  const t = useT();
  const [aba, setAba] = useState<AbaDasAcoes>("crm");
  const [escolhida, setEscolhida] = useState<ActionType | null>(null);
  const atual = ABAS_DAS_ACOES.find((a) => a.aba === aba) ?? ABAS_DAS_ACOES[0]!;

  return (
    <>
      <div className="flex h-14 items-center border-b border-casca-divisoria px-5">
        <DialogTitle className="text-[14px] font-medium text-casca-texto">{t("Ações")}</DialogTitle>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">
        <AbasDaCasca
          aria-label={t("Ações")}
          valor={aba}
          aoMudar={setAba}
          abas={ABAS_DAS_ACOES.map((a) => ({ valor: a.aba, rotulo: t(a.titulo) }))}
        />
        <div>
          <p className="text-[14px] font-semibold text-casca-texto">{t(atual.titulo)}</p>
          <p className="text-[12px] text-casca-suave">{t(atual.descricao)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {atual.cartoes.map((c) => {
            const Icone = ICONE_DA_ACAO[c.tipo];
            const travado = acoesQueFechamLaco(evento, [{ type: c.tipo }]).length > 0;
            const marcado = escolhida === c.tipo;
            return (
              <button
                key={c.tipo}
                type="button"
                aria-pressed={marcado}
                disabled={travado}
                title={travado ? t(MENSAGEM_DO_LACO_DE_LEAD) : undefined}
                onClick={() => setEscolhida(c.tipo)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-casca-divisoria p-4 text-left disabled:cursor-not-allowed disabled:opacity-50",
                  marcado ? "border-casca-marca bg-casca-marca-suave" : "hover:bg-casca-raia",
                )}
              >
                <span className="grid size-[34px] shrink-0 place-items-center rounded-md bg-casca-fluxo-acoes-suave">
                  <Icone size={18} className="text-casca-fluxo-acoes" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-casca-texto">{t(c.titulo)}</span>
                  <span className="block text-[12px] text-casca-suave">{t(c.descricao)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex h-[72px] items-center justify-end gap-3 border-t border-casca-divisoria px-6">
        <button
          type="button"
          onClick={aoFechar}
          className="inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
        >
          {t("Cancelar")}
        </button>
        <BotaoDaCasca variante="marca" disabled={escolhida === null} onClick={() => escolhida && aoRealizar(escolhida)}>
          {t("Realizar ação")}
        </BotaoDaCasca>
      </div>
    </>
  );
}

/**
 * O MODAL "AÇÕES" (D10; sem print, provisório): abas CRM, Contatos e Integrações,
 * cartões de ação e "Realizar ação". Escolher uma ação cria UMA caixa: o motor
 * tem uma ação por passo.
 */
export function JanelaDeAcoes({
  aberta,
  evento,
  aoFechar,
  aoRealizar,
}: {
  aberta: boolean;
  evento: string;
  aoFechar: () => void;
  aoRealizar: (tipo: ActionType) => void;
}) {
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(720px,calc(100vw-2rem))] gap-0 rounded-xl p-0">
      {aberta && <Conteudo evento={evento} aoFechar={aoFechar} aoRealizar={aoRealizar} />}
    </JanelaDaCasca>
  );
}
