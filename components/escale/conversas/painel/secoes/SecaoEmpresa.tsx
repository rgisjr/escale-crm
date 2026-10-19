"use client";
import { useT } from "@/hooks/i18n/useT";

import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";
import { CampoDaSecao } from "./CampoDaSecao";

/** A seção Empresa (c18): só a moldura; o vínculo chega com a 2D (D9). */
export function SecaoEmpresa({ aoVoltar }: { aoVoltar: () => void }) {
  const t = useT();
  return (
    <SecaoAberta titulo={t("Empresa")} icone={ICONE_DA_SECAO.empresa} aoVoltar={aoVoltar}>
      <CampoDaSecao rotulo={t("Nome da empresa")}>
        <button
          type="button"
          disabled
          title={t("Em breve")}
          className="flex h-9 w-full items-center rounded-casca-gatilho bg-casca-busca px-3 text-left text-[13px] text-casca-meta disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("Clique aqui para adicionar")}
        </button>
      </CampoDaSecao>
    </SecaoAberta>
  );
}
