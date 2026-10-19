"use client";
import { useState } from "react";

import { JanelaDeGerenciarCampos } from "@/components/escale/campos/JanelaDeGerenciarCampos";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { semNomeDaEmpresa, type OpcaoDeDestino } from "@/lib/escale/importacao/mapeamento";
import type { ColunaMapeada, TipoDeImportacao } from "@/lib/escale/importacao/regras";
import { Columns2, Plus, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, Titulo } from "./pecas";

const ROTULO_DA_COLUNA = "text-[10px] font-medium tracking-[0.06em] text-[#86858F] uppercase";

function LinhaDoMapa({
  indice,
  coluna,
  mapa,
  opcoes,
  aoMudar,
}: {
  indice: number;
  coluna: ColunaMapeada;
  mapa: readonly ColunaMapeada[];
  opcoes: readonly OpcaoDeDestino[];
  aoMudar: (indice: number, para: string) => void;
}) {
  const t = useT();
  const nome = coluna.csv.trim() || `${t("Coluna")} ${indice + 1}`;
  const atual = coluna.para === "none" ? "" : coluna.para;
  const usados = new Set(mapa.filter((_, i) => i !== indice).map((c) => c.para));
  const lista = opcoes
    .filter((o) => !usados.has(o.valor))
    .map((o) => ({ valor: o.valor, rotulo: t(o.rotulo), grupo: t(o.grupo) }));
  return (
    <li className="grid h-14 grid-cols-[1fr_390px] items-center border-t border-[#ECEBF1] px-4 first:border-t-0">
      <span className="flex min-w-0 items-center gap-2">
        <Columns2 size={14} aria-hidden className="shrink-0 text-[#86858F]" />
        <span className={cn("truncate text-[13px]", atual ? "text-casca-texto" : "text-[#86858F]")}>{nome}</span>
      </span>
      <div className="relative">
        <SeletorDaCasca
          valor={atual}
          opcoes={lista}
          aoMudar={(v) => aoMudar(indice, v === "" ? "none" : v)}
          vazio={t("Não importar esse campo")}
          buscaAPartirDe={0}
          aria-label={`${t("Campo da coluna")} ${nome}`}
          className="h-8"
        />
        {atual ? (
          <button
            type="button"
            aria-label={`${t("Não importar esse campo")}: ${nome}`}
            onClick={() => aoMudar(indice, "none")}
            className="absolute top-1/2 right-9 grid size-5 -translate-y-1/2 place-items-center rounded-full text-[#86858F] hover:text-casca-texto"
          >
            <X size={14} aria-hidden />
          </button>
        ) : (
          <X size={14} aria-hidden className="pointer-events-none absolute top-1/2 right-9.5 -translate-y-1/2 text-[#86858F]" />
        )}
      </div>
    </li>
  );
}

export function PassoMapeamento({
  tipo,
  mapa,
  opcoes,
  podeCriarCampo,
  aoMudar,
}: {
  tipo: TipoDeImportacao;
  mapa: readonly ColunaMapeada[];
  opcoes: readonly OpcaoDeDestino[];
  podeCriarCampo: boolean;
  aoMudar: (indice: number, para: string) => void;
}) {
  const t = useT();
  const [criando, setCriando] = useState(false);
  return (
    <>
      <Titulo titulo={t("Mapeie os campos do seu arquivo")} subtitulo={t("Ligue cada coluna do seu arquivo a um campo da Escale OS.")} />
      <ColunaCentral largura="max-w-[720px]">
        <div className="mt-4 mb-3 flex justify-end">
          <button
            type="button"
            disabled={!podeCriarCampo}
            title={podeCriarCampo ? undefined : t("Disponível para administrador.")}
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-casca-marca disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar campo")}
          </button>
        </div>
        {semNomeDaEmpresa(mapa) ? (
          <p role="status" className="mb-3 rounded-[8px] bg-[#EFF3FF] px-3 py-2 text-[12px] leading-5 text-[#2F4A9A]">
            {t(
              "Nenhuma coluna está associada ao Nome da empresa. Os campos da empresa vão para a empresa atual do contato ou para uma nova empresa sem nome.",
            )}
          </p>
        ) : null}
        <div className="overflow-hidden rounded-[8px] border border-[#ECEBF1]">
          <div className="grid h-8 grid-cols-[1fr_390px] items-center bg-[#FAFAFC] px-4">
            <span className={ROTULO_DA_COLUNA}>{t("Coluna do arquivo")}</span>
            <span className={ROTULO_DA_COLUNA}>{t("Mapear para")}</span>
          </div>
          <ul>
            {mapa.map((coluna, i) => (
              <LinhaDoMapa key={`${coluna.csv}-${i}`} indice={i} coluna={coluna} mapa={mapa} opcoes={opcoes} aoMudar={aoMudar} />
            ))}
          </ul>
        </div>
      </ColunaCentral>
      {criando ? (
        <JanelaDeGerenciarCampos aberta aoFechar={() => setCriando(false)} objetoInicial={tipo === "negocio" ? "negocio" : "contato"} />
      ) : null}
    </>
  );
}
