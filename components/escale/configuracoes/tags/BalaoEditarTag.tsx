"use client";
import { useState, type ReactElement } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { useTagsDaCasca } from "@/hooks/escale/useTagsDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTag, TAMANHO_MAXIMO_DA_TAG } from "@/lib/contacts/tag-normalizada";
import { tomDaTag } from "@/lib/escale/tags/paleta";
import { DESCRICAO_MAX } from "@/lib/escale/tags/schema";
import type { LinhaDaTela } from "@/lib/escale/tags/tela";
import { Trash2 } from "@/lib/ui/icons-da-casca";

import { SeletorDeCorDaCasca } from "./SeletorDeCorDaCasca";

/** "Editar" do ⋮ (print 04): Nome, Cor (16), Descrição 0/160, lixeira, Cancelar e Atualizar. */
export function BalaoEditarTag({
  linha,
  aberto,
  aoFechar,
  ancora,
  comecaRemovendo = false,
}: {
  linha: LinhaDaTela;
  aberto: boolean;
  aoFechar: () => void;
  ancora: ReactElement;
  /** O "Remover" do ⋮ abre o balão já na confirmação. */
  comecaRemovendo?: boolean;
}) {
  const t = useT();
  const { gravar, renomear, remover } = useTagsDaCasca();
  const [nome, setNome] = useState(linha.tag);
  const [cor, setCor] = useState(tomDaTag(linha.cor, linha.tag).chave);
  const [descricao, setDescricao] = useState(linha.descricao ?? "");
  const [confirmando, setConfirmando] = useState(comecaRemovendo);
  const [salvando, setSalvando] = useState(false);
  const novoNome = normalizarTag(nome);
  const mudou =
    novoNome !== linha.tag || cor !== tomDaTag(linha.cor, linha.tag).chave || descricao.trim() !== (linha.descricao ?? "");

  async function atualizar() {
    if (!novoNome || !mudou) return;
    setSalvando(true);
    const renomeou = novoNome === linha.tag || (await renomear(linha.tag, novoNome));
    const deu = renomeou && (await gravar(novoNome, cor, descricao.trim() || null));
    setSalvando(false);
    if (deu) aoFechar();
  }

  return (
    <Popover open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <PopoverAnchor asChild>{ancora}</PopoverAnchor>
      <PainelSuspenso align="start" sideOffset={4} className="w-[300px] space-y-3 p-3">
        <label className="block text-[13px] text-casca-texto">
          {t("Nome")}
          <span className="relative mt-2 block">
            <span aria-hidden className="absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full" style={{ backgroundColor: cor }} />
            <input
              aria-label={t("Nome")}
              value={nome}
              maxLength={TAMANHO_MAXIMO_DA_TAG}
              onChange={(e) => setNome(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-casca-marca bg-surface pr-2 pl-7 text-[13px] text-casca-texto outline-hidden"
            />
          </span>
        </label>
        <div>
          <p className="mb-2 text-[13px] text-casca-texto">{t("Cor")}</p>
          <SeletorDeCorDaCasca valor={cor} aoMudar={setCor} />
        </div>
        <label className="block text-[13px] text-casca-texto">
          {t("Descrição")}
          <textarea
            value={descricao}
            maxLength={DESCRICAO_MAX}
            placeholder={t("Para que serve esta tag? (opcional)")}
            onChange={(e) => setDescricao(e.target.value)}
            className="mt-2 h-12 w-full resize-none rounded-[4px] bg-casca-busca px-2.5 py-2 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <span className="block text-right text-[11px] text-casca-suave">{`${descricao.length}/${DESCRICAO_MAX}`}</span>
        </label>
        {confirmando ? (
          <div className="flex items-center justify-between gap-2">
            <p role="alert" className="text-[12px] text-casca-texto">{t("Remover esta tag de todos os contatos?")}</p>
            <button type="button" onClick={() => setConfirmando(false)} className="text-[12px] text-casca-texto">
              {t("Cancelar")}
            </button>
            <button
              type="button"
              onClick={async () => (await remover(linha.tag)) && aoFechar()}
              className="h-7 rounded-[4px] bg-casca-alerta px-2.5 text-[12px] font-medium text-white"
            >
              {t("Remover")}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button type="button" aria-label={t("Remover tag")} onClick={() => setConfirmando(true)} className="text-casca-alerta">
              <Trash2 size={16} aria-hidden />
            </button>
            <span className="flex gap-2">
              <button type="button" onClick={aoFechar} className="h-7 rounded-[4px] border border-casca-borda px-2.5 text-[12px] text-casca-texto">
                {t("Cancelar")}
              </button>
              <button
                type="button"
                disabled={!novoNome || !mudou || salvando}
                onClick={() => void atualizar()}
                className="h-7 rounded-[4px] bg-casca-marca px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {t("Atualizar")}
              </button>
            </span>
          </div>
        )}
      </PainelSuspenso>
    </Popover>
  );
}
