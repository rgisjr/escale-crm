"use client";
import { useT } from "@/hooks/i18n/useT";
import {
  ORDEM_DOS_CARTOES,
  ROTULO_DO_CARTAO,
  numeroBr,
  valoresDoCartao,
  type ChaveDoCartao,
} from "@/lib/escale/campanhas/apresentacao";
import type { ResumoDasCampanhas } from "@/lib/escale/campanhas/tipos";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleX,
  Download,
  MailCheck,
  MailOpen,
  Send,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DicaAoPassar } from "./DicaAoPassar";

const ICONE_DO_CARTAO: Record<ChaveDoCartao, typeof Send> = {
  adicionados: Download,
  enviados: Send,
  entregues: MailCheck,
  lidas: MailOpen,
  erros: CircleX,
};

/** "RESUMO DAS CAMPANHAS" (002, 003; N7): o botão que abre os 5 cartões. */
export function FaixaDoResumo({
  aberta,
  aoAlternar,
  resumo,
  carregando,
}: {
  aberta: boolean;
  aoAlternar: () => void;
  resumo: ResumoDasCampanhas | undefined;
  carregando: boolean;
}) {
  const t = useT();
  return (
    <div>
      <button
        type="button"
        aria-expanded={aberta}
        onClick={aoAlternar}
        className={cn(
          "inline-flex h-[30px] items-center gap-2 rounded-[6px] border px-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors",
          aberta
            ? "border-casca-marca-media bg-casca-marca-suave text-casca-marca"
            : "border-casca-borda bg-casca-busca text-casca-suave hover:border-casca-marca hover:text-casca-marca",
        )}
      >
        <BarChart3 size={14} aria-hidden />
        {t("Resumo das campanhas")}
        {aberta ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
      </button>
      {aberta ? (
        <div className="mt-3 grid grid-cols-5 gap-3 motion-safe:animate-[escale-desce_0.26s_ease-out]">
          {ORDEM_DOS_CARTOES.map((chave) => (
            <Cartao key={chave} chave={chave} resumo={resumo} carregando={carregando} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Cartao({
  chave,
  resumo,
  carregando,
}: {
  chave: ChaveDoCartao;
  resumo: ResumoDasCampanhas | undefined;
  carregando: boolean;
}) {
  const t = useT();
  if (carregando || !resumo) {
    return (
      <div
        data-esqueleto
        className="h-[85px] animate-pulse rounded-[8px] border border-casca-borda bg-casca-raia"
      />
    );
  }
  const Icone = ICONE_DO_CARTAO[chave];
  const v = valoresDoCartao(chave, resumo);
  const corpo = (
    <div className="flex h-[85px] w-full flex-col justify-between rounded-[8px] border border-casca-borda bg-surface p-4 shadow-[0_1px_2px_rgb(17_24_39/0.06)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-casca-texto">
          {t(ROTULO_DO_CARTAO[chave])}
        </span>
        <Icone size={14} aria-hidden className="shrink-0 text-casca-marca" />
      </div>
      {chave === "adicionados" ? (
        <span className="text-[15px] font-semibold text-casca-texto">{numeroBr(v.total)}</span>
      ) : (
        <div className="flex items-end justify-between">
          <span className="text-[15px] font-semibold text-casca-texto">
            {v.porcento === null ? "—" : `${v.porcento}%`}
          </span>
          <span className="text-[11px] text-casca-suave">{numeroBr(v.total)}</span>
        </div>
      )}
    </div>
  );
  if (chave === "adicionados") return corpo;
  return (
    <DicaAoPassar bloco texto={t("Percentual sobre os adicionados para envio.")}>
      {corpo}
    </DicaAoPassar>
  );
}
