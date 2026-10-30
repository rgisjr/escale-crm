"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  COR_PADRAO_DA_PASTA,
  CORES_DA_PASTA,
  ICONE_PADRAO_DA_PASTA,
  ICONES_DA_PASTA,
  NOME_DA_COR,
  NOME_DO_ICONE,
  corDaPasta,
  type CorDaPasta,
  type IconeDaPasta,
} from "@/lib/escale/automacoes/pastas";
import { cn } from "@/lib/utils";

import { IconeDoSeletor } from "./IconeDaPasta";

export type DadosDaPasta = { nome: string; cor: CorDaPasta; icone: IconeDaPasta };

const NOME_MAXIMO_DA_PASTA = 60;

/**
 * O EDITOR DE PASTA EM LINHA (07-007): nome, as 8 cores, os 8 ícones, Cancelar e Salvar.
 * Enter salva, Esc cancela; nome vazio não salva.
 */
export function EditorDePasta({
  inicial,
  aoSalvar,
  aoCancelar,
  salvando,
}: {
  inicial?: DadosDaPasta;
  aoSalvar: (p: DadosDaPasta) => void;
  aoCancelar: () => void;
  salvando: boolean;
}) {
  const t = useT();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [cor, setCor] = useState<CorDaPasta>(inicial?.cor ?? COR_PADRAO_DA_PASTA);
  const [icone, setIcone] = useState<IconeDaPasta>(inicial?.icone ?? ICONE_PADRAO_DA_PASTA);
  const podeSalvar = nome.trim() !== "" && !salvando;

  function salvar() {
    if (podeSalvar) aoSalvar({ nome: nome.trim(), cor, icone });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-casca-divisoria bg-surface p-2">
      <input
        autoFocus
        value={nome}
        maxLength={NOME_MAXIMO_DA_PASTA}
        placeholder={t("Nome da pasta")}
        aria-label={t("Nome da pasta")}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            salvar();
          } else if (e.key === "Escape") {
            e.preventDefault();
            aoCancelar();
          }
        }}
        className="h-7 rounded-[4px] border border-casca-divisoria bg-surface px-2 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-suave focus:border-casca-marca"
      />
      <div>
        <p className="mb-1 text-[11px] text-casca-suave">{t("Cor")}</p>
        <div className="flex flex-wrap gap-1.5">
          {CORES_DA_PASTA.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t(NOME_DA_COR[c])}
              aria-pressed={cor === c}
              onClick={() => setCor(c)}
              style={{ backgroundColor: corDaPasta(c) }}
              className={cn("size-5 rounded-full border-2", cor === c ? "border-casca-texto" : "border-transparent")}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] text-casca-suave">{t("Ícone")}</p>
        <div className="flex flex-wrap gap-1">
          {ICONES_DA_PASTA.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={t(NOME_DO_ICONE[i])}
              aria-pressed={icone === i}
              onClick={() => setIcone(i)}
              className={cn(
                "grid size-6 place-items-center rounded-md border",
                icone === i
                  ? "border-casca-marca bg-casca-marca-suave text-casca-marca"
                  : "border-casca-divisoria text-casca-suave",
              )}
            >
              <IconeDoSeletor icone={i} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={aoCancelar} className="text-[12px] text-casca-suave hover:text-casca-texto">
          {t("Cancelar")}
        </button>
        <button
          type="button"
          disabled={!podeSalvar}
          onClick={salvar}
          className="text-[12px] text-casca-marca disabled:opacity-50"
        >
          {t("Salvar")}
        </button>
      </div>
    </div>
  );
}
