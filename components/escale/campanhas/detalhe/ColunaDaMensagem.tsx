"use client";
import { useState, type ReactNode } from "react";

import { CLASSE_DO_BLOCO } from "@/components/escale/campanhas/molde/estilos";
import { PreviaDoCelular } from "@/components/escale/campanhas/molde/PreviaDoCelular";
import { useT } from "@/hooks/i18n/useT";
import { ehTerminal } from "@/lib/campanhas/maquina-de-estados";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DA_CATEGORIA,
  partesDaMensagem,
  siglaDoIdioma,
} from "@/lib/escale/campanhas/detalhe/mensagem";
import { textoDaBaseLegal, textosDoRitmo } from "@/lib/escale/campanhas/detalhe/ritmo";
import type { InfoDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { FileText, Smartphone } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { JanelaDoRitmo } from "./JanelaDoRitmo";

function LinhaDaColuna({
  icone,
  rotulo,
  children,
}: {
  icone: ReactNode;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-casca-busca text-casca-marca"
      >
        {icone}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-casca-suave">{rotulo}</span>
        <span className="mt-0.5 block">{children}</span>
      </span>
    </div>
  );
}

/**
 * A COLUNA DIREITA DO SUMÁRIO (009, 010; C10, C13): a prévia do celular, o
 * cartão "Modelo utilizado" + "Dispositivo de envio" e o bloco "Entrega" do
 * original (ritmo editável, números extras, base legal). Sem "Ver fluxo
 * completo": a campanha é só de disparo (R6).
 */
export function ColunaDaMensagem({
  campanha,
  nomeDoNumero,
  fuso,
}: {
  campanha: InfoDaCampanha;
  nomeDoNumero: (id: string) => string;
  fuso?: string;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const hora = campanha.iniciadaEm ? dataEHoraBr(campanha.iniciadaEm, fuso).slice(-5) : "--:--";
  const sigla = siglaDoIdioma(campanha.modelo?.idioma ?? null);
  const categoria = campanha.modelo?.categoria ?? null;
  const linha = "flex justify-between gap-3";
  return (
    <>
      <PreviaDoCelular
        nomeDaConta={nomeDoNumero(campanha.numeroId)}
        partes={partesDaMensagem(campanha.mensagem)}
        hora={hora}
      />
      <div className={cn(CLASSE_DO_BLOCO, "divide-y divide-casca-divisoria p-0")}>
        <LinhaDaColuna icone={<FileText size={16} />} rotulo={t("Modelo utilizado")}>
          {campanha.modelo ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[14px]">{campanha.modelo.nome}</span>
              {sigla ? (
                <span className="rounded-[3px] bg-casca-busca px-1 text-[9px] font-semibold">
                  {sigla}
                </span>
              ) : null}
              {categoria ? (
                <span className="rounded-full bg-casca-marca-suave px-2 py-0.5 text-[11px] text-casca-marca">
                  {t(ROTULO_DA_CATEGORIA[categoria] ?? categoria)}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-[13px] text-casca-suave">
              {t("Esta campanha envia uma mensagem livre, sem modelo aprovado.")}
            </span>
          )}
        </LinhaDaColuna>
        <LinhaDaColuna icone={<Smartphone size={16} />} rotulo={t("Dispositivo de envio")}>
          <span className="text-[14px]">{nomeDoNumero(campanha.numeroId)}</span>
        </LinhaDaColuna>
      </div>
      <section aria-label={t("Entrega")} className={CLASSE_DO_BLOCO}>
        <header className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">{t("Entrega")}</h3>
          {!ehTerminal(campanha.status) ? (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-[12px] font-medium text-casca-marca hover:underline"
            >
              {t("Editar")}
            </button>
          ) : null}
        </header>
        <dl className="mt-3 space-y-2 text-[12px]">
          {textosDoRitmo(campanha.ritmo, t).map((x) => (
            <div key={x.rotulo} className={linha}>
              <dt className="text-casca-suave">{x.rotulo}</dt>
              <dd>{x.valor}</dd>
            </div>
          ))}
          <div className={linha}>
            <dt className="text-casca-suave">{t("Números extras")}</dt>
            <dd className="text-right">
              {campanha.numerosExtras.length > 0
                ? campanha.numerosExtras.map(nomeDoNumero).join(", ")
                : t("Nenhum")}
            </dd>
          </div>
          <div className={linha}>
            <dt className="text-casca-suave">{t("Base legal")}</dt>
            <dd className="text-right">
              {textoDaBaseLegal(campanha.baseLegal, campanha.liaRef, t)}
            </dd>
          </div>
        </dl>
      </section>
      <JanelaDoRitmo
        key={editando ? "aberta" : "fechada"}
        aberta={editando}
        campanhaId={campanha.id}
        ritmo={campanha.ritmo}
        aoFechar={() => setEditando(false)}
      />
    </>
  );
}
