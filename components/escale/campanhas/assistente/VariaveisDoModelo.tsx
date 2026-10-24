"use client";

import { useState } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { MensagemDeModelo, VariavelDoModelo } from "@/lib/escale/campanhas/assistente";
import {
  CAMPOS_BASICOS,
  contagemResolvida,
  trechoDaVariavel,
  variaveisDoCorpo,
} from "@/lib/escale/campanhas/modelo";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";
import { cn } from "@/lib/utils";

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
  const campos = [
    ...CAMPOS_BASICOS.map((c) => ({ valor: c.campo, rotulo: t(c.rotulo) })),
    ...personalizados.map((c) => ({ valor: c.campo, rotulo: c.rotulo })),
  ];
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
                            : { fonte: "campo", campo: "primeiro_nome", alternativo: null },
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
                  <SeletorDaCasca
                    valor={v?.fonte === "campo" ? v.campo : ""}
                    opcoes={campos}
                    vazio={t("Selecione...")}
                    aria-label={t("Campo do CRM")}
                    aoMudar={(campo) =>
                      campo &&
                      mudar(chave, {
                        fonte: "campo",
                        campo,
                        alternativo: v?.fonte === "campo" ? v.alternativo : null,
                      })
                    }
                    className="h-7 w-56"
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
                        campo: v?.fonte === "campo" ? v.campo : "primeiro_nome",
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
