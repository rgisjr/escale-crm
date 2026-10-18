"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU, CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { ArrowLeft, ChevronDown, ChevronUp, Tag, Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Passo = "escolher" | "incluir" | "remover";

/**
 * O "TAG" DA BARRA (Clint `index-DCKImOq3`; prints 2b-34 a 2b-36): "Alterar tag" com
 * X e as linhas "Incluir" e "Remover"; depois "← Incluir Tag" (ou "← Remover Tag") e
 * o seletor "Adicione uma tag" (ou "Selecione a tag para remover"), com a lista de
 * chips abrindo para cima. Na inclusão, escolher a tag já aplica (com "Criar" quando
 * ela não existe); na remoção, escolher pede "Tem certeza que deseja remover a tag
 * selecionada?".
 */
export function PainelDeTag({
  classeDoGatilho,
  aoAplicar,
}: {
  classeDoGatilho: string;
  aoAplicar: (acao: "incluir_tag" | "remover_tag", tag: string) => Promise<boolean>;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null);
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>("escolher");
  const [texto, setTexto] = useState("");
  const [listaAberta, setListaAberta] = useState(true);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const termo = texto.trim().toLowerCase();
  const todas = vocabulario.data ?? [];
  const opcoes = todas.filter((x) => x.toLowerCase().includes(termo)).slice(0, 50);
  const nova =
    passo === "incluir" && termo && !todas.some((x) => x.toLowerCase() === termo)
      ? (normalizarTags([termo])[0] ?? null)
      : null;

  const fechar = () => {
    setAberto(false);
    setPasso("escolher");
    setTexto("");
    setListaAberta(true);
    setRemovendo(null);
  };

  async function aplicar(acao: "incluir_tag" | "remover_tag", tag: string) {
    setEnviando(true);
    const deuCerto = await aoAplicar(acao, tag);
    setEnviando(false);
    if (deuCerto) fechar();
  }

  function escolher(tag: string) {
    if (passo === "incluir") void aplicar("incluir_tag", tag);
    else setRemovendo(tag);
  }

  const conteudo = () => {
    if (passo === "escolher") {
      return (
        <div>
          <div className="flex h-11 items-center justify-between border-b border-casca-borda px-4">
            <p className="text-[13px] text-casca-texto">{t("Alterar tag")}</p>
            <button
              type="button"
              aria-label={t("Fechar")}
              onClick={fechar}
              className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
          <div className="p-1">
            <button
              type="button"
              onClick={() => setPasso("incluir")}
              className={CLASSE_DA_LINHA_DO_MENU}
            >
              <Tag size={14} aria-hidden className="fill-current" />
              {t("Incluir")}
            </button>
            <button
              type="button"
              onClick={() => setPasso("remover")}
              className={CLASSE_DA_LINHA_DO_MENU}
            >
              <Trash2 size={14} aria-hidden />
              {t("Remover")}
            </button>
          </div>
        </div>
      );
    }
    if (removendo) {
      return (
        <div className="space-y-3 p-4">
          <ChipDaTag tag={removendo} />
          <p role="alert" className="text-[13px] text-casca-texto">
            {t("Tem certeza que deseja remover a tag selecionada?")}
          </p>
          <div className="flex justify-end gap-2">
            <BotaoDaCasca
              type="button"
              variante="texto"
              tamanho="sm"
              onClick={() => setRemovendo(null)}
            >
              {t("Cancelar")}
            </BotaoDaCasca>
            <BotaoDaCasca
              type="button"
              variante="marca"
              tamanho="sm"
              disabled={enviando}
              title={enviando ? t("Aguarde…") : undefined}
              onClick={() => void aplicar("remover_tag", removendo)}
            >
              {t("Confirmar")}
            </BotaoDaCasca>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 p-4">
        <button
          type="button"
          onClick={() => {
            setPasso("escolher");
            setTexto("");
          }}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-casca-texto"
        >
          <ArrowLeft size={14} aria-hidden />
          {passo === "incluir" ? t("Incluir Tag") : t("Remover Tag")}
        </button>
        {listaAberta ? (
          <div className="max-h-60 overflow-y-auto rounded-[6px] border border-casca-borda bg-surface p-1">
            {opcoes.length === 0 && !nova ? (
              <p className="px-2 py-1.5 text-[12px] text-casca-suave">
                {t("Nenhuma tag correspondente")}
              </p>
            ) : null}
            <ul>
              {opcoes.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    aria-label={o}
                    onClick={() => escolher(o)}
                    className={CLASSE_DA_LINHA_DO_MENU}
                  >
                    <ChipDaTag tag={o} />
                  </button>
                </li>
              ))}
              {nova ? (
                <li>
                  <button
                    type="button"
                    onClick={() => escolher(nova)}
                    className={CLASSE_DA_LINHA_DO_MENU}
                  >
                    {t("Criar")} <ChipDaTag tag={nova} />
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
        <div className="relative">
          <input
            role="combobox"
            aria-expanded={listaAberta}
            aria-label={t("Tag")}
            value={texto}
            onFocus={() => setListaAberta(true)}
            onChange={(e) => {
              setTexto(e.target.value);
              setListaAberta(true);
            }}
            placeholder={
              passo === "incluir" ? t("Adicione uma tag") : t("Selecione a tag para remover")
            }
            className={cn(CLASSE_DO_CAMPO, "border-casca-marca pr-9")}
          />
          <button
            type="button"
            aria-label={t("Mostrar tags")}
            onClick={() => setListaAberta((v) => !v)}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center text-casca-suave"
          >
            {listaAberta ? (
              <ChevronUp size={14} aria-hidden />
            ) : (
              <ChevronDown size={14} aria-hidden />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <Popover open={aberto} onOpenChange={(a) => (a ? setAberto(true) : fechar())}>
      <PopoverTrigger asChild>
        <button type="button" className={classeDoGatilho}>
          {t("Tag")}
        </button>
      </PopoverTrigger>
      <PainelSuspenso side="top" align="center" sideOffset={12} className="w-[300px] p-0">
        {conteudo()}
      </PainelSuspenso>
    </Popover>
  );
}
