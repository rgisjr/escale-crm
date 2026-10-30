"use client";
import { useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { NOME_MAXIMO } from "@/lib/escale/automacoes/regras";

/** O cabeçalho de 56 px das janelas de nome (07-006): título 14 px/500; o X é o da `JanelaDaCasca`. */
export function CabecalhoDaJanelaDeNome({ titulo }: { titulo: string }) {
  return (
    <div className="flex h-14 items-center border-b border-casca-divisoria px-5">
      <DialogTitle className="text-[14px] font-medium text-casca-texto">{titulo}</DialogTitle>
    </div>
  );
}

/**
 * O estado e o campo "Nome da automação" das janelas de criar e renomear: foco automático,
 * "Salvar" desligado com o nome vazio, e o aviso da Clint passando de 80 caracteres (Q11).
 */
export function useCampoDoNome(inicial: string) {
  const t = useT();
  const [nome, setNome] = useState(inicial);
  const limpo = nome.trim();
  /** Devolve o nome pronto para gravar, ou `null` (e avisa) se não pode. */
  function validar(): string | null {
    if (limpo === "") return null;
    if (limpo.length > NOME_MAXIMO) {
      toast.error(t("O nome deve ter no máximo 80 caracteres"));
      return null;
    }
    return limpo;
  }
  return { nome, setNome, vazio: limpo === "", validar };
}

export function CampoDoNome({
  valor,
  aoMudar,
  aoEnter,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  aoEnter: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="nome-da-automacao" className="text-[12px] font-medium text-casca-texto">
        {t("Nome da automação")}
      </label>
      <input
        id="nome-da-automacao"
        autoFocus
        value={valor}
        placeholder={t("Digite o nome da automação")}
        onChange={(e) => aoMudar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            aoEnter();
          }
        }}
        className="h-8 w-full rounded-[4px] border-0 bg-casca-raia px-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
      />
    </div>
  );
}

/** O rodapé de 72 px: "Cancelar" (contorno) e "Salvar" (marca). */
export function RodapeDaJanelaDeNome({
  aoCancelar,
  aoSalvar,
  desabilitado,
  ocupado = false,
}: {
  aoCancelar: () => void;
  aoSalvar: () => void;
  desabilitado: boolean;
  ocupado?: boolean;
}) {
  const t = useT();
  return (
    <div className="flex h-[72px] items-center justify-end gap-3 border-t border-casca-divisoria px-6">
      <button
        type="button"
        onClick={aoCancelar}
        disabled={ocupado}
        className="inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
      >
        {t("Cancelar")}
      </button>
      <BotaoDaCasca variante="marca" onClick={aoSalvar} disabled={desabilitado || ocupado}>
        {t("Salvar")}
      </BotaoDaCasca>
    </div>
  );
}
