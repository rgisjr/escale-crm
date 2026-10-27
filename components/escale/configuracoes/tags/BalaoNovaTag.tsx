"use client";
import { useState, type ReactElement } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useTagsDaCasca } from "@/hooks/escale/useTagsDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTag, TAMANHO_MAXIMO_DA_TAG } from "@/lib/contacts/tag-normalizada";
import { chaveAutomatica, tomDaTag } from "@/lib/escale/tags/paleta";

/** "Adicionar tag" (print 02): Nome com a bolinha da cor automática; Cancelar e Criar. */
export function BalaoNovaTag({ gatilho, existentes }: { gatilho: ReactElement; existentes: readonly string[] }) {
  const t = useT();
  const { gravar } = useTagsDaCasca();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const tag = normalizarTag(nome);
  const repetida = tag !== "" && existentes.some((e) => normalizarTag(e) === tag);
  const ponto = tomDaTag(null, tag || "a").texto;

  function mudar(v: boolean) {
    setAberto(v);
    if (!v) setNome("");
  }
  async function criar() {
    if (!tag || repetida) return;
    setSalvando(true);
    const deu = await gravar(tag, chaveAutomatica(tag), null);
    setSalvando(false);
    if (deu) mudar(false);
  }

  return (
    <Popover open={aberto} onOpenChange={mudar}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso align="end" sideOffset={8} className="w-[300px] p-3">
        <label className="block text-[13px] text-casca-texto">
          {t("Nome")}
          <span className="relative mt-2 block">
            <span aria-hidden className="absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full" style={{ backgroundColor: ponto }} />
            <input
              autoFocus
              value={nome}
              maxLength={TAMANHO_MAXIMO_DA_TAG}
              placeholder={t("nome da tag")}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void criar();
                }
              }}
              className="h-8 w-full rounded-[4px] border border-casca-marca bg-surface pr-2 pl-7 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
          </span>
        </label>
        {repetida ? (
          <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
            {t("Já existe uma tag com esse nome.")}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => mudar(false)} className="h-7 rounded-[4px] border border-casca-borda px-2.5 text-[12px] text-casca-texto">
            {t("Cancelar")}
          </button>
          <button
            type="button"
            disabled={!tag || repetida || salvando}
            onClick={() => void criar()}
            className="h-7 rounded-[4px] bg-casca-marca px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            {t("Criar")}
          </button>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
