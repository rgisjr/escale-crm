"use client";
import Link from "next/link";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { AlternanciaDaCasca } from "@/components/escale/ui/AlternanciaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { errosDasRegras, type RegraDeCampo } from "@/lib/escale/configuracoes/campos";
import { TODAS_AS_ETAPAS } from "@/lib/escale/configuracoes/tipos";
import { CirclePlus, ClipboardList, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";

const coluna = "text-[10px] font-semibold tracking-wide text-casca-suave uppercase";

/** CAMPOS OBRIGATÓRIOS (Fase 1F, D6; Clint P10 a P14): uma linha por regra, como na Clint. */
export function SecaoCampos({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const pode = config.podeAdministrar;
  const regras = rascunho.regras;
  const erros = errosDasRegras(regras);
  const abertas = config.etapas.filter((e) => !e.is_won && !e.is_lost);
  const opcoesDeEtapa = [
    { valor: TODAS_AS_ETAPAS, rotulo: t("Todas as etapas") },
    ...abertas.map((e) => ({ valor: e.id, rotulo: e.name })),
  ];
  const opcoesDeStatus = [
    { valor: "ganho" as const, rotulo: t("Ganho") },
    { valor: "perdido" as const, rotulo: t("Perdido") },
  ];
  const rotuloDo = (campo: string) => config.campos.find((c) => c.campo === campo)?.rotulo ?? campo;
  const trocar = (i: number, parcial: Partial<RegraDeCampo>) =>
    mudar((r) => ({ ...r, regras: r.regras.map((x, j) => (j === i ? { ...x, ...parcial } : x)) }));

  return (
    <div className="grid gap-3">
      <CabecaDaSecao
        icone={ClipboardList}
        titulo={t("Campos obrigatórios")}
        descricao={t(
          "Defina campos que devem ser preenchidos para sair de uma etapa, para entrar em uma etapa, ou ao alterar o status para Ganho ou Perdido.",
        )}
      />
      {!pode ? (
        <p className="text-[12px] text-casca-suave">
          {t("Só administrador muda os campos obrigatórios. Você vê as regras como elas estão.")}
        </p>
      ) : null}

      {config.campos.length === 0 ? (
        <div className="py-4 text-[12px] text-casca-suave">
          {/* Fase 1F (F19): os campos são do CRM (1F-a), não da origem. */}
          <p>{t("Ainda não há campos personalizados no CRM.")}</p>
          <Link
            href="/app/settings/tenant/pipelines"
            className="text-casca-marca underline underline-offset-2"
          >
            {t("Criar campos em Configurações › Funis")}
          </Link>
        </div>
      ) : (
        <>
          {regras.length === 0 ? (
            <div className="rounded-[8px] border border-casca-borda py-5 text-center text-[12px] text-casca-texto">
              {t("Nenhum campo obrigatório configurado.")}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 border-b border-casca-borda pb-2">
                <span className={`flex-[3] ${coluna}`}>{t("Campo")}</span>
                <span className={`flex flex-[3] items-center gap-1 ${coluna}`}>
                  {t("Quando")}
                  <AjudaDaCasca
                    texto={t(
                      "Ao sair: precisa estar preenchido para o negócio avançar desta etapa (próxima etapa, ganho, perda ou outro funil). Ao entrar: precisa estar preenchido para o negócio entrar na etapa.",
                    )}
                  />
                </span>
                <span className={`flex flex-[4] items-center gap-1 ${coluna}`}>
                  {t("Etapas")}
                  <AjudaDaCasca texto={t("Etapas às quais a regra se aplica")} />
                </span>
                <span className={`flex flex-[3] items-center gap-1 ${coluna}`}>
                  {t("Status")}
                  <AjudaDaCasca
                    texto={t("Selecione para exigir este campo ao marcar como Ganho ou Perdido")}
                  />
                </span>
                <span className="flex-1" />
              </div>
              {regras.map((regra, i) => {
                const rotulo = rotuloDo(regra.campo);
                return (
                  <div key={`${regra.campo}-${i}`} className="border-b border-casca-borda py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-[3]">
                        <p className="text-[12px] font-medium text-casca-texto">{rotulo}</p>
                        <p className="text-[10px] text-casca-suave">{t("Negócio")}</p>
                      </div>
                      <div className="flex-[3]">
                        <AlternanciaDaCasca
                          aria-label={`${t("Quando")} — ${rotulo}`}
                          valor={regra.quando}
                          desabilitada={!pode}
                          aoMudar={(quando) =>
                            trocar(i, {
                              quando,
                              status: quando === "ao_entrar" ? [] : regra.status,
                            })
                          }
                          opcoes={[
                            { valor: "ao_sair", rotulo: t("Ao sair") },
                            { valor: "ao_entrar", rotulo: t("Ao entrar") },
                          ]}
                        />
                      </div>
                      <div className="flex-[4]">
                        <SeletorMultiploDaCasca
                          aria-label={`${t("Etapas")} — ${rotulo}`}
                          valores={regra.etapas}
                          opcoes={opcoesDeEtapa}
                          exclusiva={TODAS_AS_ETAPAS}
                          vazio={t("Nenhuma etapa")}
                          desabilitado={!pode}
                          aoMudar={(etapas) => trocar(i, { etapas })}
                        />
                      </div>
                      <div className="flex-[3]">
                        <SeletorMultiploDaCasca
                          aria-label={`${t("Status")} — ${rotulo}`}
                          valores={regra.status}
                          opcoes={opcoesDeStatus}
                          vazio={t("Nenhum status")}
                          desabilitado={!pode || regra.quando === "ao_entrar"}
                          aoMudar={(status) => trocar(i, { status })}
                        />
                      </div>
                      <div className="flex flex-1 justify-center">
                        {pode ? (
                          <button
                            type="button"
                            aria-label={`${t("Remover a regra de")} ${rotulo}`}
                            onClick={() =>
                              mudar((r) => ({ ...r, regras: r.regras.filter((_, j) => j !== i) }))
                            }
                            className="text-casca-alerta hover:brightness-90"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {erros[i] ? (
                      <div className="mt-1 flex gap-3">
                        <span className="flex-[6]" />
                        <span className="flex-[8] text-[10px] text-casca-alerta">
                          {t(erros[i]!)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {pode ? (
            <div className="flex items-center gap-2 pt-1">
              <CirclePlus
                size={16}
                strokeWidth={1.5}
                aria-hidden
                className="shrink-0 text-casca-texto"
              />
              <div className="w-[517px] min-w-0">
                <SeletorDaCasca
                  aparencia="janela"
                  valor=""
                  vazio={t("Adicionar campo obrigatório")}
                  opcoes={config.campos.map((c) => ({
                    valor: c.campo,
                    rotulo: c.rotulo,
                    grupo: t("Negócio"),
                  }))}
                  aoMudar={(campo) => {
                    if (!campo) return;
                    mudar((r) => ({
                      ...r,
                      regras: [...r.regras, { campo, quando: "ao_sair", etapas: [], status: [] }],
                    }));
                  }}
                  aria-label={t("Adicionar campo obrigatório")}
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
