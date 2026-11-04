"use client";
import { useRef } from "react";

import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { useT } from "@/hooks/i18n/useT";
import { useDefaultPipeline } from "@/hooks/pipelines/useDefaultPipeline";
import type { BotaoDoItem, ItemDaSequencia } from "@/lib/escale/automacoes/fluxo/sequencia";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { Plus } from "@/lib/ui/icons-da-casca";

import { BotoesDaMensagem } from "./BotoesDaMensagem";

type Texto = Extract<ItemDaSequencia, { tipo: "texto" }>;

/** Um texto da sequência: caixa de texto com "Adicionar variáveis" e, no último texto, os botões. */
export function ItemDeTexto({
  item,
  comBotoes,
  novoIdDeBotao,
  aoMudar,
}: {
  item: Texto;
  /** Só o último texto da mensagem tem botões: as saídas do canvas são as dele. */
  comBotoes: boolean;
  novoIdDeBotao: () => string;
  aoMudar: (item: Texto) => void;
}) {
  const t = useT();
  const pipeline = useDefaultPipeline(true);
  const campos = camposDoFunil(pipeline.data?.pipeline.settings ?? null).map((f) => ({ chave: f.key, rotulo: f.label }));
  const ref = useRef<HTMLTextAreaElement>(null);

  function inserir(token: string) {
    const el = ref.current;
    const inicio = el?.selectionStart ?? item.texto.length;
    const fim = el?.selectionEnd ?? item.texto.length;
    aoMudar({ ...item, texto: item.texto.slice(0, inicio) + token + item.texto.slice(fim) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(inicio + token.length, inicio + token.length);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <SeletorDeVariaveis
        aoEscolher={inserir}
        adicionais={{ negocio: campos }}
        gatilho={
          <button type="button" className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-casca-marca hover:underline">
            <Plus size={14} aria-hidden />
            {t("Adicionar variáveis")}
          </button>
        }
      />
      <textarea
        ref={ref}
        rows={5}
        aria-label={t("Mensagem")}
        value={item.texto}
        onChange={(e) => aoMudar({ ...item, texto: e.target.value })}
        placeholder="Oi [CONTACT.FIRST_NAME], tudo bem?"
        className="w-full resize-y rounded-[4px] border-0 bg-casca-raia p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
      />
      {comBotoes ? (
        <BotoesDaMensagem
          botoes={item.botoes}
          novoId={novoIdDeBotao}
          aoMudar={(botoes: BotaoDoItem[]) => aoMudar({ ...item, botoes })}
        />
      ) : null}
    </div>
  );
}
