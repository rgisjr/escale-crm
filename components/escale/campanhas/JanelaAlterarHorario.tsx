"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useAcoesDaCampanha } from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

const UMA_HORA_MS = 3_600_000;

/**
 * "ALTERAR HORÁRIO DO DISPARO" (material 2.2; provisório, sem print): os textos
 * da Clint e o seletor de data e hora da casca no lugar do `datetime-local`
 * nativo (regra 2 do CLAUDE.md).
 */
export function JanelaAlterarHorario({
  linha,
  aoFechar,
}: {
  linha: LinhaDeCampanha;
  aoFechar: () => void;
}) {
  const t = useT();
  const acao = useAcoesDaCampanha();
  const [quando, setQuando] = useState(() =>
    linha.agendadaPara ? new Date(linha.agendadaPara) : new Date(Date.now() + UMA_HORA_MS),
  );
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    if (Number.isNaN(quando.getTime()))
      return setErro(t("Selecione uma data e um horário válidos."));
    if (quando.getTime() <= Date.now()) return setErro(t("O novo horário precisa ser no futuro."));
    acao.mutate(
      { id: linha.id, acao: "reagendar", quando: quando.toISOString() },
      {
        onSuccess: () => {
          toast.success(t("Horário do disparo atualizado com sucesso!"));
          aoFechar();
        },
        onError: (err) =>
          err instanceof ApiError
            ? showApiError(err)
            : toast.error(t("Não foi possível alterar o horário. Tente novamente.")),
      },
    );
  }

  return (
    <JanelaDeConfirmacao
      aberta
      aoFechar={aoFechar}
      titulo={t("Alterar horário do disparo")}
      rotuloDoConfirmar={t("Salvar novo horário")}
      aoConfirmar={salvar}
      ocupado={acao.isPending}
    >
      <p>{t("Escolha a nova data e horário para o disparo desta campanha.")}</p>
      <p className="text-[13px] font-medium text-casca-texto">{t("Data e horário")}</p>
      <SeletorDeDataEHora
        valor={quando}
        aoMudar={(d) => {
          setQuando(d);
          setErro(null);
        }}
      />
      {erro ? (
        <p role="alert" className="text-[12px] text-casca-alerta">
          {erro}
        </p>
      ) : null}
    </JanelaDeConfirmacao>
  );
}
