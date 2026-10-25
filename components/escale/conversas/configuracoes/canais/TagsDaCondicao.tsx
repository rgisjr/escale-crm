"use client";
import { useState } from "react";

import { LinhaCriarTag } from "@/components/escale/ui/LinhaCriarTag";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { ChipDeEtiqueta } from "@/components/tags/ChipDeEtiqueta";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { TAGS_DA_CONDICAO_MAX } from "@/lib/escale/conversas/criacao-de-negocio";
import { tagNovaDoTexto } from "@/lib/escale/tag-nova";
import { Plus, X } from "@/lib/ui/icons-da-casca";

/** "Adicionar tags ao contato" (16/10-01): a pílula "+ Adicionar tag" com o vocabulário e "criar" pelo texto. */
export function TagsDaCondicao({
  valores,
  aoMudar,
  desabilitado,
}: {
  valores: string[];
  aoMudar: (v: string[]) => void;
  desabilitado: boolean;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null).data ?? [];
  const [texto, setTexto] = useState("");
  const termo = texto.trim().toLowerCase();
  const opcoes = vocabulario
    .filter((x) => x.toLowerCase().includes(termo) && !valores.includes(x))
    .slice(0, 30);
  const nova = tagNovaDoTexto(texto, vocabulario, valores);
  const incluir = (tag: string) => {
    const [limpa] = normalizarTags([tag]);
    if (limpa && !valores.includes(limpa) && valores.length < TAGS_DA_CONDICAO_MAX)
      aoMudar([...valores, limpa]);
    setTexto("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {valores.map((tag) => (
        <span key={tag} className="flex items-center gap-0.5">
          <ChipDeEtiqueta tag={tag} className="h-5 px-1.5 text-[11px]" />
          {!desabilitado ? (
            <button
              type="button"
              aria-label={`${t("Remover")} ${tag}`}
              onClick={() => aoMudar(valores.filter((x) => x !== tag))}
              className="text-casca-suave hover:text-casca-texto"
            >
              <X size={12} aria-hidden />
            </button>
          ) : null}
        </span>
      ))}
      {!desabilitado && valores.length < TAGS_DA_CONDICAO_MAX ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-6 items-center gap-1 rounded-full border border-casca-borda px-2 text-[11px] text-casca-texto hover:bg-casca-raia"
            >
              <Plus size={12} aria-hidden />
              {t("Adicionar tag")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" className="w-[240px] p-2">
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && termo) incluir(texto);
              }}
              placeholder={t("Buscar por...")}
              className="mb-2 h-8 w-full rounded-casca-gatilho bg-casca-busca px-2.5 text-[12px] outline-hidden placeholder:text-casca-meta"
            />
            <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
              {nova ? <LinhaCriarTag tag={nova} aoCriar={incluir} /> : null}
              {opcoes.map((tag) => (
                <button key={tag} type="button" onClick={() => incluir(tag)}>
                  <ChipDeEtiqueta tag={tag} className="h-5 px-1.5 text-[11px]" />
                </button>
              ))}
            </div>
          </PainelSuspenso>
        </Popover>
      ) : null}
    </div>
  );
}
