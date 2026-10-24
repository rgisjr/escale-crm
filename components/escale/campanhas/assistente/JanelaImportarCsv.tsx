"use client";

import { useState } from "react";

import { JanelaDeImportacao } from "@/components/escale/importacao/JanelaDeImportacao";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { csvDeExemplo, nomeDoExemplo } from "@/lib/escale/importacao/exemplo";
import { Download } from "@/lib/ui/icons-da-casca";

import { BOTAO_DA_MARCA } from "../molde/estilos";

function baixarExemplo() {
  const url = URL.createObjectURL(
    new Blob([csvDeExemplo("contato")], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeDoExemplo("contato");
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * "IMPORTAR TELEFONES .CSV" (fork Escale, Fase 8B; 09-037; N10): o passo 1 da
 * Clint (instruções e o exemplo) e, em "Importar agora", a janela de importação
 * da 2F com o tipo Contato travado. Os passos 2 e 3 da Clint (sem print) são os
 * da 2F.
 */
export function JanelaImportarCsv({
  aberta,
  aoFechar,
  aoImportar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  aoImportar: (importacaoId: string) => void;
}) {
  const t = useT();
  const [importando, setImportando] = useState(false);
  return (
    <>
      <JanelaDaCasca
        aberta={aberta && !importando}
        onFechar={aoFechar}
        className="w-[min(896px,calc(100vw-2rem))] max-w-none gap-0 rounded-[12px] p-0"
      >
        <div className="border-b border-casca-divisoria px-5 py-4">
          <p className="text-[12px] font-semibold tracking-wide text-casca-texto-2 uppercase">
            {t("PASSO 1 DE 3")}
          </p>
          <DialogTitle className="text-[16px] font-semibold text-casca-texto">
            {t("Escolha o arquivo .CSV que você quer enviar WhatsApp em massa")}
          </DialogTitle>
        </div>
        <div className="flex gap-8 p-6">
          <div className="flex-1 pt-6">
            <p className="text-[13px] text-casca-texto">{t("Instruções")}</p>
            <p className="mt-1 text-[13px] text-casca-texto-2">
              {t(
                "Baixe o arquivo de modelos de preenchimento abaixo para ajudá-lo no mapeamento de campos do seu arquivo. Lembre-se de mapear os campos conforme as variáveis que você utiliza no modelo de mensagem que quer enviar.",
              )}
            </p>
            <button
              type="button"
              onClick={baixarExemplo}
              className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-casca-marca"
            >
              <Download className="size-4" aria-hidden />
              {t("Baixar arquivo de exemplo .CSV")}
            </button>
            <button
              type="button"
              onClick={() => setImportando(true)}
              className={`${BOTAO_DA_MARCA} mt-5`}
            >
              {t("Importar agora")}
            </button>
          </div>
          <div
            aria-hidden
            className="hidden w-[374px] shrink-0 rounded-[16px] bg-casca-marca-suave p-6 sm:block"
          >
            <div className="mx-auto w-fit rounded-[8px] bg-casca-marca px-3 py-1.5 text-[13px] font-semibold text-white">
              {"Nome = {{1}}"}
            </div>
            <div className="mt-3 rounded-[8px] bg-surface p-3 text-[12px] text-casca-texto-2 shadow-xs">
              {t("Oi {{1}}, tudo bem?")}
            </div>
          </div>
        </div>
      </JanelaDaCasca>
      {importando && (
        <JanelaDeImportacao
          aberta
          tipoInicial="contato"
          travarTipo
          aoFechar={() => {
            setImportando(false);
            aoFechar();
          }}
          aoImportar={(id) => {
            setImportando(false);
            aoImportar(id);
            aoFechar();
          }}
        />
      )}
    </>
  );
}
