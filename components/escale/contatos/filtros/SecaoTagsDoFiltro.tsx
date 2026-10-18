"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU, CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import {
  ROTULO_DA_OP_DE_TAG,
  type CondicaoDeTag,
  type FiltrosDeContatos,
  type GrupoDeTags,
} from "@/lib/escale/contatos/filtros";
import { Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BotaoVoltar, GruposDoFiltro, OpcaoDeRadio, Pilula } from "./PecasDoFiltro";

/**
 * O SELETOR DE UMA CONDIÇÃO DE TAG (Clint `TagFilterBuilder`; prints 2b-16 e 2b-17):
 * "Buscar por...", as pílulas "Qualquer tag" e "Sem tag" (aplicam na hora) e a
 * lista de tags; escolhida a tag, "← Voltar", o chip, "Possui a tag" (já marcado)
 * ou "Não possui a tag" e "Aplicar" embaixo à esquerda.
 */
function SeletorDeTag({ aoEscolher }: { aoEscolher: (c: CondicaoDeTag) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null);
  const [busca, setBusca] = useState("");
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [op, setOp] = useState<"possui" | "nao_possui">("possui");
  const termo = busca.trim().toLowerCase();
  const opcoes = (vocabulario.data ?? [])
    .filter((tg) => tg.toLowerCase().includes(termo))
    .slice(0, 50);

  if (escolhida) {
    return (
      <div role="region" aria-label={t("Escolher tag")} className="space-y-3 p-3">
        <BotaoVoltar onClick={() => setEscolhida(null)} />
        <div>
          <ChipDaTag tag={escolhida} />
        </div>
        <div role="radiogroup" aria-label={t("Condição da tag")}>
          {(["possui", "nao_possui"] as const).map((o) => (
            <OpcaoDeRadio key={o} marcada={op === o} onClick={() => setOp(o)}>
              {t(ROTULO_DA_OP_DE_TAG[o])}
            </OpcaoDeRadio>
          ))}
        </div>
        <BotaoDaCasca
          type="button"
          variante="marca"
          tamanho="sm"
          onClick={() => aoEscolher({ op, tag: escolhida })}
        >
          {t("Aplicar")}
        </BotaoDaCasca>
      </div>
    );
  }

  return (
    <div role="region" aria-label={t("Escolher tag")} className="space-y-2 p-2">
      <label className="relative block">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar por...")}
          aria-label={t("Buscar tag")}
          className={cn(CLASSE_DO_CAMPO, "pr-8")}
        />
        <Search
          size={14}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
        />
      </label>
      <div className="flex gap-2 px-1">
        <Pilula ativa={false} onClick={() => aoEscolher({ op: "qualquer" })}>
          {t("Qualquer tag")}
        </Pilula>
        <Pilula ativa={false} onClick={() => aoEscolher({ op: "sem" })}>
          {t("Sem tag")}
        </Pilula>
      </div>
      {vocabulario.isLoading ? (
        <p className="px-1 text-[12px] text-casca-suave">{t("Buscando tags...")}</p>
      ) : opcoes.length === 0 ? (
        <p className="px-1 text-[12px] text-casca-suave">{t("Nenhuma tag correspondente")}</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto">
          {opcoes.map((tg) => (
            <li key={tg}>
              <button
                type="button"
                aria-label={tg}
                onClick={() => {
                  setEscolhida(tg);
                  setOp("possui");
                }}
                className={CLASSE_DA_LINHA_DO_MENU}
              >
                <ChipDaTag tag={tg} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A condição no cartão do grupo: "Possui a tag [chip]", "Qualquer tag" (print 2b-18). */
function TextoDaCondicaoDeTag({ c }: { c: CondicaoDeTag }) {
  const t = useT();
  return (
    <>
      <span>{t(ROTULO_DA_OP_DE_TAG[c.op])}</span>
      {c.op === "possui" || c.op === "nao_possui" ? <ChipDaTag tag={c.tag} /> : null}
    </>
  );
}

/**
 * Seção Tags (Clint `TagFilterBuilder`; prints 2b-15 a 2b-20): grupos de condições,
 * como os Campos. Dentro do grupo, E ou OU; entre grupos, "combinar grupos por".
 */
export function SecaoTagsDoFiltro({
  filtros,
  aoMudar,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
}) {
  const grupos: GrupoDeTags[] = filtros.tags?.grupos ?? [];
  return (
    <GruposDoFiltro
      grupos={grupos}
      combinar={filtros.tags?.combinar ?? "ou"}
      aoMudar={(novos, combinar) =>
        aoMudar({
          ...filtros,
          tags:
            novos.length > 0
              ? {
                  combinar,
                  grupos: novos.map((g) => ({ modo: g.modo, condicoes: [...g.condicoes] })),
                }
              : undefined,
        })
      }
      textoDaCondicao={(c: CondicaoDeTag) => <TextoDaCondicaoDeTag c={c} />}
      seletor={(aoEscolher) => <SeletorDeTag aoEscolher={aoEscolher} />}
    />
  );
}
