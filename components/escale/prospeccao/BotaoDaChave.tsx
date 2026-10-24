"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Settings } from "@/lib/ui/icons-da-casca";

import { Ajuda, CampoDeTexto } from "./campos";

/**
 * A CHAVE DA APIFY (D11; PRD E4): a engrenagem do cabeçalho ou o botão do
 * vazio abrem a janela; salvar usa o `configure` do original (que valida a
 * chave no provedor e cifra no servidor).
 */
export function BotaoDaChave({ forma }: { forma: "icone" | "contorno" }) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  const [chave, setChave] = useState("");
  const acao = useAcaoDaProspeccao();
  const tamanho = chave.trim().length;
  const valida = tamanho >= 10 && tamanho <= 500;

  async function salvar() {
    try {
      await acao.mutateAsync({ action: "configure", api_key: chave.trim() });
      toast.success(t("Chave de busca salva."));
      setChave("");
      setAberta(false);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."),
      );
    }
  }

  return (
    <>
      {forma === "icone" ? (
        <button
          type="button"
          aria-label={t("Configuração da prospecção")}
          title={t("Configuração da prospecção")}
          onClick={() => setAberta(true)}
          className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:bg-casca-raia hover:text-casca-texto"
        >
          <Settings size={16} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAberta(true)}
          className="mt-4 inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
        >
          {t("Configurar chave")}
        </button>
      )}
      <JanelaDeConfirmacao
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo={t("Configuração da prospecção")}
        rotuloDoConfirmar={t("Salvar chave")}
        aoConfirmar={() => void salvar()}
        desabilitado={!valida}
        ocupado={acao.isPending}
        dica={valida ? undefined : t("A chave tem de 10 a 500 caracteres.")}
      >
        <div className="space-y-2">
          <CampoDeTexto
            id="prospeccao-chave"
            tipo="password"
            rotulo={t("Chave da Apify")}
            valor={chave}
            aoMudar={setChave}
          />
          <Ajuda>
            {t("A chave fica cifrada no servidor. Cada busca tem seu próprio limite de gasto.")}
          </Ajuda>
        </div>
      </JanelaDeConfirmacao>
    </>
  );
}
