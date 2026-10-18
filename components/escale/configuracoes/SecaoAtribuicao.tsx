"use client";
import { Fragment, useState } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import {
  CONDICAO_VAZIA,
  TIPOS_NA_ATRIBUICAO,
  type AtribuicaoNaTela,
  type CondicaoNaTela,
} from "@/lib/escale/ganho/regras";
import type { TipoDeAtividade } from "@/lib/escale/playbook/regras";
import { ReceiptText, Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";

const BOTAO_DA_MARCA =
  "h-8 rounded-[6px] bg-casca-marca px-3 text-[13px] font-medium text-white hover:brightness-95";

/**
 * ATRIBUIÇÃO DE GANHO (fork Escale, Fase 1K, D14; prints 01-012 e 01-027, código `Ks`).
 * A caixa "Atribuição de ganho pelo sistema" (só o admin põe em Ganho) e as
 * regras do crédito (atividade com vezes e tipo, ou tag do contato), com um
 * E/OU único. Só o admin muda (N11); para os outros, tudo desligado.
 */
export function SecaoAtribuicao({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const org = useActiveOrg();
  const tags = useContactTagVocabulary(org?.orgId ?? null);
  const [escolhendo, setEscolhendo] = useState(false);
  const a = rascunho.atribuicao;
  const desligado = !config.podeAdministrar;
  const dica = desligado ? t("Só o administrador altera a atribuição do ganho.") : undefined;

  const mudarA = (f: (x: AtribuicaoNaTela) => AtribuicaoNaTela) =>
    mudar((r) => ({ ...r, atribuicao: f(r.atribuicao) }));
  const trocar = (i: number, c: CondicaoNaTela) =>
    mudarA((x) => ({ ...x, condicoes: x.condicoes.map((y, j) => (j === i ? c : y)) }));
  const tirar = (i: number) =>
    mudarA((x) => ({ ...x, condicoes: x.condicoes.filter((_, j) => j !== i) }));
  const somar = (c: CondicaoNaTela) => {
    mudarA((x) => ({ ...x, condicoes: [...x.condicoes, c] }));
    setEscolhendo(false);
  };

  return (
    <div className="grid max-w-[784px] gap-8">
      <CabecaDaSecao
        icone={ReceiptText}
        descricao={t("Configure aqui as regras de atribuição de ganho.")}
      />
      {dica ? <p className="-mt-6 text-[11px] text-casca-suave">{dica}</p> : null}

      <section className="grid gap-3">
        <h3 className="text-[13px] font-medium text-casca-texto">
          {t("Atribuição de ganho pelo sistema")}
        </h3>
        <div className="text-[13px] text-casca-texto">
          <CaixaDaCasca
            marcada={a.soAdmin}
            aoMudar={(v) => mudarA((x) => ({ ...x, soAdmin: v }))}
            rotulo={t(
              "Se marcado, somente o administrador poderá alterar o status do negócio para ganho.",
            )}
            desabilitada={desligado}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-[13px] font-medium text-casca-texto">
          {t("Regras de atribuição de ganho")}
        </h3>
        {a.condicoes.map((c, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <div
                role="radiogroup"
                aria-label={t("Como as regras se combinam")}
                className="flex gap-1"
              >
                {(["e", "ou"] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    role="radio"
                    aria-checked={a.operador === op}
                    disabled={desligado}
                    title={dica}
                    onClick={() => mudarA((x) => ({ ...x, operador: op }))}
                    className={cn(
                      "h-7 rounded-[6px] px-3 text-[12px] font-medium disabled:opacity-60",
                      a.operador === op
                        ? "bg-casca-marca text-white"
                        : "border border-casca-marca text-casca-marca",
                    )}
                  >
                    {op === "e" ? t("E") : t("Ou")}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex h-16 items-center gap-2 rounded-[8px] border border-casca-borda px-6 text-[12px] text-casca-texto">
              {c.tipo === "atividade" ? (
                <>
                  <span>{t("Ter realizado")}</span>
                  <CampoDeTexto
                    aria-label={t("Quantidade de vezes")}
                    inputMode="numeric"
                    value={c.vezes}
                    disabled={desligado}
                    onChange={(e) =>
                      trocar(i, { ...c, vezes: e.target.value.replace(/\D/g, "").slice(0, 3) })
                    }
                    className="h-9 w-[60px] px-2 text-center"
                  />
                  <span>{t("vezes a atividade do tipo")}</span>
                  <div className="w-[328px]">
                    <SeletorDaCasca
                      aparencia="janela"
                      valor={c.atividade}
                      vazio={t("Selecione...")}
                      vazioSoNoGatilho
                      opcoes={TIPOS_NA_ATRIBUICAO.map((x) => ({
                        valor: x.valor,
                        rotulo: t(x.rotulo),
                      }))}
                      aoMudar={(v) => trocar(i, { ...c, atividade: v as TipoDeAtividade })}
                      aria-label={t("Tipo de atividade")}
                      desabilitado={desligado}
                      dica={dica}
                    />
                  </div>
                </>
              ) : (
                <>
                  <span>{t("Possuir a tag")}</span>
                  <div className="w-[328px]">
                    <SeletorDaCasca
                      aparencia="janela"
                      valor={c.tag}
                      vazio={t("Selecione...")}
                      vazioSoNoGatilho
                      buscaAPartirDe={8}
                      opcoes={(tags.data ?? []).map((x) => ({ valor: x, rotulo: x }))}
                      aoMudar={(v) => trocar(i, { tipo: "tag", tag: v })}
                      aria-label={t("Tag")}
                      desabilitado={desligado}
                      dica={dica}
                    />
                  </div>
                </>
              )}
              {desligado ? null : (
                <button
                  type="button"
                  aria-label={t("Remover condição")}
                  onClick={() => tirar(i)}
                  className="ml-auto rounded-[4px] p-1 text-casca-alerta hover:brightness-90"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              )}
            </div>
          </Fragment>
        ))}

        {desligado ? null : escolhendo ? (
          <div className="flex items-center gap-2 text-[13px] text-casca-texto">
            <span>{t("Escolha o tipo da condição:")}</span>
            <button type="button" className={BOTAO_DA_MARCA} onClick={() => somar(CONDICAO_VAZIA)}>
              {t("Atividade")}
            </button>
            <button
              type="button"
              className={BOTAO_DA_MARCA}
              onClick={() => somar({ tipo: "tag", tag: "" })}
            >
              {t("Tags")}
            </button>
            <button
              type="button"
              aria-label={t("Fechar")}
              onClick={() => setEscolhendo(false)}
              className="rounded-[4px] p-1 text-casca-meta hover:text-casca-texto"
            >
              <X size={12} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEscolhendo(true)}
            className="h-10 w-fit rounded-[6px] bg-casca-marca-suave px-4 text-[13px] font-medium text-casca-texto hover:brightness-95"
          >
            {t("Nova condição")}
          </button>
        )}
      </section>
    </div>
  );
}
