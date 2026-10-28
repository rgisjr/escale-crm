"use client";
import { useT } from "@/hooks/i18n/useT";
import {
  CORES_DO_PAINEL,
  ICONES_DO_PAINEL,
  NOMES_DOS_ICONES,
  SEM_ICONE,
  corDoPainel,
} from "@/lib/escale/indicadores/paineis/aparencia";
import { Ban } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { IconeDoPainel, QuadradoDoPainel } from "./QuadradoDoPainel";

/**
 * O SELETOR DE ÍCONE (10-003): prévia de 64 px, as 22 "Cores" e os 42 "Ícones"
 * do IconPicker da Clint, mais o "sem ícone" vermelho (grava `nenhum`, a prévia
 * mostra as iniciais). A marca da cor escolhida (anel) não tem print: provisória.
 */
export function SeletorDeIconeDoPainel({
  nome,
  cor,
  icone,
  aoMudar,
}: {
  nome: string;
  cor: string;
  icone: string;
  aoMudar: (m: { cor?: string; icone?: string }) => void;
}) {
  const t = useT();
  const nomeDaCor = (c: string, i: number) =>
    c === "marca" ? t("Cor da marca") : t("Cor {n}").replace("{n}", String(i + 1));

  return (
    <div className="grid gap-2">
      <span className="text-[13px] font-medium text-casca-texto">{t("Ícone")}</span>
      <div className="flex items-start gap-6">
        <QuadradoDoPainel cor={cor} icone={icone} nome={nome} tamanho={64} />
        <div className="min-w-0">
          <p className="mb-2 text-[12px] text-casca-texto">{t("Cores")}</p>
          <div className="flex flex-wrap">
            {CORES_DO_PAINEL.map((c, i) => (
              <button
                key={c}
                type="button"
                aria-label={nomeDaCor(c, i)}
                aria-pressed={cor === c}
                onClick={() => aoMudar({ cor: c })}
                className={cn(
                  "mr-5 mb-3 size-[15px] rounded-[30%]",
                  cor === c && "ring-2 ring-casca-texto ring-offset-2",
                )}
                style={{ backgroundColor: corDoPainel(c) }}
              />
            ))}
          </div>
        </div>
      </div>
      <span className="mt-6 text-[13px] font-medium text-casca-texto">{t("Ícones")}</span>
      <div className="grid grid-cols-[repeat(15,32px)] gap-x-[14px] gap-y-2">
        {ICONES_DO_PAINEL.map((i) => (
          <button
            key={i}
            type="button"
            aria-label={t(NOMES_DOS_ICONES[i])}
            aria-pressed={icone === i}
            onClick={() => aoMudar({ icone: i })}
            className={cn(
              "grid size-8 place-items-center rounded-casca-gatilho hover:text-casca-texto",
              icone === i ? "text-casca-texto" : "text-casca-suave",
            )}
          >
            <IconeDoPainel icone={i} tamanho={18} />
          </button>
        ))}
        <button
          type="button"
          aria-label={t(NOMES_DOS_ICONES[SEM_ICONE])}
          aria-pressed={icone === SEM_ICONE}
          onClick={() => aoMudar({ icone: SEM_ICONE })}
          className="grid size-8 place-items-center rounded-casca-gatilho text-casca-alerta"
        >
          <Ban size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
