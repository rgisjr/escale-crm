"use client";

import { useState } from "react";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ContatoDaEmpresa } from "@/lib/escale/empresas/banco";
import { desfechoDaRemocao } from "@/lib/escale/empresas/regras";

/**
 * "Remover da empresa" (OrgContactsTab da Clint): o contato comum sai direto; o
 * principal pede o novo principal antes; o último avisa que a empresa será excluída.
 */
export function JanelaRemoverDaEmpresa({
  alvo,
  contatos,
  ocupado,
  aoFechar,
  aoConfirmar,
}: {
  alvo: ContatoDaEmpresa | null;
  contatos: ContatoDaEmpresa[];
  ocupado: boolean;
  aoFechar: () => void;
  aoConfirmar: (novoPrincipal: string | null) => void;
}) {
  const t = useT();
  const [novo, setNovo] = useState("");
  const desfecho = alvo ? desfechoDaRemocao(contatos, alvo.id) : "simples";
  const outros = alvo ? contatos.filter((c) => c.id !== alvo.id) : [];

  const fechar = () => {
    setNovo("");
    aoFechar();
  };

  return (
    <JanelaDeConfirmacao
      aberta={alvo !== null}
      aoFechar={fechar}
      titulo={t("Remover da empresa")}
      rotuloDoConfirmar={desfecho === "escolher_principal" ? t("Definir e remover") : t("Remover da empresa")}
      perigo={desfecho === "ultimo"}
      ocupado={ocupado}
      desabilitado={desfecho === "escolher_principal" && !novo}
      dica={desfecho === "escolher_principal" && !novo ? t("Selecione o novo contato principal.") : undefined}
      aoConfirmar={() => aoConfirmar(desfecho === "escolher_principal" ? novo : null)}
    >
      {desfecho === "escolher_principal" ? (
        <div className="flex flex-col gap-3">
          <p>
            {t(
              "Este é o contato principal da empresa. Escolha quem será o novo contato principal antes de removê-lo.",
            )}
          </p>
          <SeletorDaCasca
            aparencia="janela"
            valor={novo}
            opcoes={outros.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            aoMudar={setNovo}
            vazio={t("Selecione o novo contato principal")}
            aria-label={t("Novo contato principal")}
          />
        </div>
      ) : desfecho === "ultimo" ? (
        <p>{t("Este é o último contato da empresa. Ao removê-lo, a empresa será excluída.")}</p>
      ) : (
        <p>{t("Tem certeza que deseja remover {name} da empresa?").replace("{name}", alvo?.nome ?? "")}</p>
      )}
    </JanelaDeConfirmacao>
  );
}
