"use client";

import { useState } from "react";

import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { useT } from "@/hooks/i18n/useT";
import type { MensagemDeModelo, VariavelDoModelo } from "@/lib/escale/campanhas/assistente";
import {
  contagemResolvida,
  tokenDaCampanha,
  trechoDaVariavel,
  variaveisDoCorpo,
} from "@/lib/escale/campanhas/modelo";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";
import { cn } from "@/lib/utils";
import { rotuloDoToken, TOKEN_DA_SAUDACAO } from "@/lib/variaveis/catalogo";
import { tokenDoCampoAntigo } from "@/lib/variaveis/mapeamento";

import { CAMPO } from "../molde/estilos";

/**
 * "VARIÁVEIS DO MODELO" (fork Escale, Fase 8B; 09-025, 09-026; N5, N6): para
 * cada `{{n}}` do corpo, o trecho em volta, "Campo do CRM" ou "Valor fixo", e o
 * texto alternativo opcional; em cima, "N de M resolvida(s)".
 */
export function VariaveisDoModelo({
  mensagem,
  personalizados,
  aoMudar,
}: {
  mensagem: MensagemDeModelo;
  personalizados: readonly CampoPersonalizado[];
  aoMudar: (variaveis: Record<string, VariavelDoModelo>) => void;
}) {
  const t = useT();
  const chaves = variaveisDoCorpo(mensagem.corpo);
  const [comAlternativo, setComAlternativo] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        Object.entries(mensagem.variaveis).flatMap(([k, v]) =>
          v.fonte === "campo" && v.alternativo ? [k] : [],
        ),
      ),
  );
  if (chaves.length === 0) return null;
  const { feitas, total } = contagemResolvida(chaves, mensagem.variaveis);
  // O rótulo do campo escolhido: o personalizado pelo catálogo, o resto pela lista única.
  const rotuloDoCampo = (campo: string): string => {
    const token = tokenDoCampoAntigo(campo);
    const personalizado = personalizados.find((c) => tokenDoCampoAntigo(c.campo) === token);
    if (personalizado) return personalizado.rotulo;
    return t(rotuloDoToken(token)?.rotulo ?? campo);
  };
  const mudar = (chave: string, v: VariavelDoModelo) =>
    aoMudar({ ...mensagem.variaveis, [chave]: v });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium text-casca-texto">{t("Variáveis do modelo")}</span>
        <span className="text-[12px] text-casca-suave">
          {(total === 1 ? t("{n} de {m} resolvida") : t("{n} de {m} resolvidas"))
            .replace("{n}", String(feitas))
            .replace("{m}", String(total))}
        </span>
      </div>
      <div className="space-y-3">
        {chaves.map((chave) => {
          const v = mensagem.variaveis[chave];
          const trecho = trechoDaVariavel(mensagem.corpo, chave);
          const [antes, depois] = trecho.split(`{{${chave}}}`);
          return (
            <div key={chave} className="rounded-[8px] border border-casca-borda p-3">
              <p className="text-[13px] text-casca-texto">
                “{antes}
                <span className="font-semibold text-casca-marca">{`{{${chave}}}`}</span>
                {depois}”
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div
                  role="radiogroup"
                  aria-label={t("Origem do valor")}
                  className="flex h-7 items-center rounded-[6px] bg-casca-busca p-0.5 text-[12px]"
                >
                  {(["campo", "fixo"] as const).map((fonte) => (
                    <button
                      key={fonte}
                      type="button"
                      role="radio"
                      aria-checked={(v?.fonte ?? "campo") === fonte}
                      onClick={() =>
                        mudar(
                          chave,
                          fonte === "fixo"
                            ? { fonte: "fixo", valor: "" }
                            : { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: null },
                        )
                      }
                      className={cn(
                        "h-6 rounded-[5px] px-2.5",
                        (v?.fonte ?? "campo") === fonte
                          ? "bg-surface text-casca-texto shadow-xs"
                          : "text-casca-texto-2",
                      )}
                    >
                      {fonte === "campo" ? t("Campo do CRM") : t("Valor fixo")}
                    </button>
                  ))}
                </div>
                {v?.fonte === "fixo" ? (
                  <input
                    aria-label={t("Valor fixo")}
                    value={v.valor}
                    onChange={(e) => mudar(chave, { fonte: "fixo", valor: e.target.value })}
                    className={cn(CAMPO, "h-7 w-60")}
                  />
                ) : (
                  <SeletorDeVariaveis
                    extras={["saudacao"]}
                    permitir={tokenDaCampanha}
                    aoEscolher={(token) =>
                      mudar(chave, {
                        fonte: "campo",
                        campo: token === TOKEN_DA_SAUDACAO ? "saudacao" : token,
                        alternativo: v?.fonte === "campo" ? v.alternativo : null,
                      })
                    }
                    gatilho={
                      <button
                        type="button"
                        aria-label={t("Campo do CRM")}
                        className={cn(CAMPO, "flex h-7 w-56 items-center text-left")}
                      >
                        {v?.fonte === "campo" ? (
                          <span className="truncate rounded-[4px] bg-casca-marca-suave px-1.5 text-[12px] text-casca-marca">
                            {rotuloDoCampo(v.campo)}
                          </span>
                        ) : (
                          <span className="text-casca-meta">{t("Selecione...")}</span>
                        )}
                      </button>
                    }
                  />
                )}
              </div>
              {v?.fonte !== "fixo" &&
                (comAlternativo.has(chave) ? (
                  <input
                    aria-label={t("Texto alternativo")}
                    placeholder={t("Texto usado quando o contato não tem o dado")}
                    value={v?.fonte === "campo" ? (v.alternativo ?? "") : ""}
                    onChange={(e) =>
                      mudar(chave, {
                        fonte: "campo",
                        campo: v?.fonte === "campo" ? v.campo : "[CONTACT.FIRST_NAME]",
                        alternativo: e.target.value || null,
                      })
                    }
                    className={cn(CAMPO, "mt-2 h-7")}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setComAlternativo(new Set([...comAlternativo, chave]))}
                    className="mt-2 text-[11px] font-medium text-casca-marca"
                  >
                    {t("+ Definir texto alternativo")}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
