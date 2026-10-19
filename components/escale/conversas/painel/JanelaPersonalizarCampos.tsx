"use client";
import { useMemo, useState } from "react";

import {
  BotaoDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_DO_CARTAO_PADRAO,
  camposDisponiveis,
  type CampoDisponivel,
} from "@/lib/escale/conversas/campos-do-cartao";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Pipeline } from "@/lib/kanban/types";
import { ChevronDown, ChevronUp, GripVertical, Search, X } from "@/lib/ui/icons-da-casca";

const EYEBROW = "text-[11px] font-semibold tracking-wide text-casca-sobrelinha uppercase";

/**
 * "PERSONALIZAR CAMPOS · Negócio" (02-005): busca, os disponíveis com
 * caixinhas (Informações básicas + os campos do CRM da origem), os exibidos
 * em ordem (arraste pelo ponteiro ou ↑↓), "Restaurar padrão", Cancelar e
 * "Salvar campos". Nada vale sem "Salvar campos".
 */
export function JanelaPersonalizarCampos({
  aberta,
  aoFechar,
  pipeline,
  campos,
  aoSalvar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  pipeline: Pipeline;
  campos: readonly string[];
  aoSalvar: (lista: string[]) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<string[]>([...campos]);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [visto, setVisto] = useState(aberta);
  if (visto !== aberta) {
    setVisto(aberta);
    if (aberta) setLista([...campos]);
  }
  const disponiveis = useMemo(
    () => camposDisponiveis(camposDoFunil(pipeline.settings ?? null), t),
    [pipeline.settings, t],
  );
  const rotuloDe = (chave: string) => disponiveis.find((c) => c.chave === chave)?.rotulo ?? chave;
  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? disponiveis.filter((c) => c.rotulo.toLowerCase().includes(termo))
    : disponiveis;
  const basicos = filtrados.filter((c) => c.grupo === "basico");
  const doCrm = filtrados.filter((c) => c.grupo === "crm");

  const alternar = (c: CampoDisponivel, marcar: boolean) =>
    setLista((atual) =>
      marcar
        ? atual.includes(c.chave)
          ? atual
          : [...atual, c.chave]
        : atual.filter((x) => x !== c.chave),
    );
  const mover = (chave: string, para: number) =>
    setLista((atual) => {
      const de = atual.indexOf(chave);
      if (de === -1 || para < 0 || para >= atual.length) return atual;
      const sem = atual.filter((x) => x !== chave);
      return [...sem.slice(0, para), chave, ...sem.slice(para)];
    });

  const grupo = (titulo: string, itens: CampoDisponivel[]) =>
    itens.length === 0 ? null : (
      <div className="flex flex-col gap-1">
        <p className={`${EYEBROW} pt-2 pb-1`}>{titulo}</p>
        {itens.map((c) => (
          <div key={c.chave} className="flex h-10 items-center gap-3">
            <CaixaDaCasca
              marcada={lista.includes(c.chave)}
              aoMudar={(v) => alternar(c, v)}
              rotulo={c.rotulo}
            />
          </div>
        ))}
      </div>
    );

  return (
    <JanelaDaCasca
      aberta={aberta}
      onFechar={aoFechar}
      className="w-[min(950px,calc(100vw-2rem))] gap-0 p-0"
    >
      <div className="px-6 pt-6 pb-4">
        <p className="text-[11px] font-semibold tracking-wide text-casca-marca uppercase">
          {t("Personalizar campos")}
        </p>
        <h2 className="text-[18px] font-medium text-casca-texto">{t("Negócio")}</h2>
        <label className="relative mt-4 block">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por nome do campo…")}
            aria-label={t("Buscar por nome do campo…")}
            className="h-10 w-full rounded-casca-gatilho bg-casca-busca pr-9 pl-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
          />
          <Search
            size={16}
            aria-hidden
            className="absolute top-1/2 right-3 -translate-y-1/2 text-casca-suave"
          />
        </label>
      </div>
      <div className="grid h-[480px] grid-cols-[minmax(0,1fr)_360px] border-t border-casca-borda">
        <div className="overflow-y-auto px-6 py-4">
          <p className={EYEBROW}>{t("Campos disponíveis")}</p>
          {grupo(t("Informações básicas"), basicos)}
          {grupo(t("Campos do CRM"), doCrm)}
          {filtrados.length === 0 ? (
            <p className="pt-4 text-[13px] text-casca-suave">{t("Nenhum campo encontrado.")}</p>
          ) : null}
        </div>
        <div className="overflow-y-auto border-l border-casca-borda px-4 py-4">
          <div className="flex items-center justify-between">
            <p className={EYEBROW}>{t("Exibidos · arraste")}</p>
            <span className="text-[12px] text-casca-suave">{`${lista.length} ${t("campos")}`}</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {lista.map((chave, i) => (
              <li
                key={chave}
                draggable
                onDragStart={() => setArrastando(chave)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (arrastando) mover(arrastando, i);
                  setArrastando(null);
                }}
                className="flex h-11 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3 text-[13px] text-casca-texto"
              >
                <GripVertical size={14} aria-hidden className="text-casca-meta" />
                <span className="flex-1 truncate">{rotuloDe(chave)}</span>
                <button
                  type="button"
                  aria-label={`${t("Subir")} ${rotuloDe(chave)}`}
                  disabled={i === 0}
                  title={i === 0 ? t("Já é o primeiro") : undefined}
                  onClick={() => mover(chave, i - 1)}
                  className="grid size-5 place-items-center text-casca-suave disabled:opacity-30"
                >
                  <ChevronUp size={12} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`${t("Descer")} ${rotuloDe(chave)}`}
                  disabled={i === lista.length - 1}
                  title={i === lista.length - 1 ? t("Já é o último") : undefined}
                  onClick={() => mover(chave, i + 1)}
                  className="grid size-5 place-items-center text-casca-suave disabled:opacity-30"
                >
                  <ChevronDown size={12} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`${t("Remover campo")} ${rotuloDe(chave)}`}
                  onClick={() => setLista((a) => a.filter((x) => x !== chave))}
                  className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <RodapeDaJanela>
        <button
          type="button"
          onClick={() => setLista([...CAMPOS_DO_CARTAO_PADRAO])}
          className="mr-auto text-[13px] text-casca-marca hover:underline"
        >
          {t("Restaurar padrão")}
        </button>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela
          variante="salvar"
          onClick={() => {
            aoSalvar(lista);
            aoFechar();
          }}
        >
          {t("Salvar campos")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
