"use client";
import { useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  ROTULO_DO_STATUS_DA_ACAO,
  STATUS_DA_ACAO,
} from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { X } from "@/lib/ui/icons-da-casca";

import { CampoDeTagComCriar } from "./CampoDeTagComCriar";
import type { AcaoEscolhida } from "./CentroDeAcoesEmMassa";

const SEM = "__sem_atendente__";
const TITULO: Record<AcaoEscolhida, string> = {
  status: "Alterar status",
  atendente: "Alterar atendente",
  setor: "Alterar setor",
  incluir_tag: "Incluir tag",
  remover_tag: "Remover tag",
};
const CAMPO: Record<AcaoEscolhida, string> = {
  status: "Status",
  atendente: "Atendente",
  setor: "Equipe",
  incluir_tag: "Tag",
  remover_tag: "Tag",
};

/** A janela de cada ação (c26–c29): um campo e "Executar ação em massa", sem "tem certeza". */
export function JanelaDaAcaoEmMassa({
  acao,
  aoFechar,
  aoExecutar,
  executando,
}: {
  acao: AcaoEscolhida | null;
  aoFechar: () => void;
  aoExecutar: (parametros: Record<string, unknown>) => void;
  executando: boolean;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const [valor, setValor] = useState("");
  const { data: membros = [] } = useAssignableMembers(acao === "atendente");
  const { data: setores = [] } = useSetores();
  const vocabulario = useContactTagVocabulary(
    acao === "incluir_tag" || acao === "remover_tag" ? (activeOrg?.orgId ?? null) : null,
  );
  if (!acao) return null;
  const opcoes =
    acao === "status"
      ? STATUS_DA_ACAO.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS_DA_ACAO[s]) }))
      : acao === "atendente"
        ? [
            { valor: SEM, rotulo: t("Sem atendente") },
            ...membros.map((m) => ({
              valor: m.user_id,
              rotulo: m.full_name?.trim() || t("Sem nome"),
            })),
          ]
        : acao === "setor"
          ? setores.map((s) => ({ valor: s.id, rotulo: s.nome }))
          : (vocabulario.data ?? []).map((tag) => ({ valor: tag, rotulo: tag }));
  const parametros = (): Record<string, unknown> =>
    acao === "status"
      ? { status: valor }
      : acao === "atendente"
        ? { user_id: valor === SEM ? null : valor }
        : acao === "setor"
          ? { setor_id: valor }
          : { tag: valor };
  const fechar = () => {
    setValor("");
    aoFechar();
  };
  return (
    <JanelaDaCasca aberta onFechar={fechar} className="w-[448px] p-0">
      <div className="flex h-14 items-center justify-between border-b border-casca-borda px-5">
        <span className="text-[15px] font-medium text-casca-texto">{t(TITULO[acao])}</span>
        <button
          type="button"
          aria-label={t("Fechar")}
          onClick={fechar}
          className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 px-6 py-5">
        <span className="text-[13px] text-casca-texto">{t(CAMPO[acao])}</span>
        {acao === "incluir_tag" ? (
          <CampoDeTagComCriar
            vocabulario={vocabulario.data ?? []}
            valor={valor}
            aoMudar={setValor}
          />
        ) : (
          <SeletorDaCasca
            aparencia="janela"
            valor={valor}
            opcoes={opcoes}
            aoMudar={setValor}
            vazio={t("Selecione...")}
            vazioSoNoGatilho
            aria-label={t(CAMPO[acao])}
          />
        )}
      </div>
      <div className="flex h-16 items-center justify-end border-t border-casca-borda px-6">
        <button
          type="button"
          disabled={!valor || executando}
          onClick={() => aoExecutar(parametros())}
          className="h-8 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Executar ação em massa")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
