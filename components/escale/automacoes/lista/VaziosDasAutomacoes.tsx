"use client";
import { useT } from "@/hooks/i18n/useT";
import { Plus, Zap } from "@/lib/ui/icons-da-casca";

const COLUNAS = 7;
const BOTAO_DE_CONTORNO =
  "mt-4 inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] font-medium text-casca-texto transition-colors hover:bg-casca-raia";

/** Sem nenhuma automação, ou busca/favoritos/pasta sem resultado (07-031, 07-032). */
export function VazioSemAutomacoes({ aoCriar }: { aoCriar: () => void }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={COLUNAS} className="py-16">
        <div className="flex flex-col items-center text-center">
          <span aria-hidden className="grid size-14 place-items-center rounded-xl bg-casca-marca-suave text-casca-marca">
            <Zap size={20} />
          </span>
          <h2 className="mt-4 text-[14px] font-semibold text-casca-texto">{t("Nenhuma automação criada")}</h2>
          <p className="mt-2 max-w-[200px] text-[12px] text-casca-suave">
            {t("Crie automações para executar ações automaticamente no seu funil.")}
          </p>
          <button type="button" onClick={aoCriar} className={BOTAO_DE_CONTORNO}>
            <Plus size={14} aria-hidden />
            {t("Nova automação")}
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Vazio só por causa do filtro de Status ou de Agente (L20, provisório: sem print). */
export function VazioDoFiltroDeAutomacoes({ aoLimpar }: { aoLimpar: () => void }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={COLUNAS} className="py-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-[14px] font-semibold text-casca-texto">{t("Nenhuma automação corresponde a este filtro")}</h2>
          <p className="mt-2 max-w-[260px] text-[12px] text-casca-suave">
            {t("Ajuste o filtro de status ou limpe-o para ver suas automações.")}
          </p>
          <button type="button" onClick={aoLimpar} className={BOTAO_DE_CONTORNO}>
            {t("Limpar filtro")}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function EsqueletoDasAutomacoes() {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <tr key={i} data-esqueleto aria-hidden className="h-16 border-b border-casca-divisoria">
          <td className="pl-6">
            <span className="block size-4 animate-pulse rounded-[2px] bg-casca-raia" />
          </td>
          <td className="px-3">
            <span className="block h-3 w-48 animate-pulse rounded-[4px] bg-casca-raia" />
          </td>
          <td className="px-3">
            <span className="block h-3 w-28 animate-pulse rounded-[4px] bg-casca-raia" />
          </td>
          <td className="px-3">
            <span className="block h-4 w-7 animate-pulse rounded-full bg-casca-raia" />
          </td>
          <td className="px-3">
            <span className="block h-3 w-36 animate-pulse rounded-[4px] bg-casca-raia" />
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export function ErroDasAutomacoes({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={COLUNAS} className="py-12">
        <div role="alert" className="flex flex-col items-center gap-2 text-center">
          <p className="text-[14px] font-semibold text-casca-texto">{t("Não foi possível carregar as automações")}</p>
          <p className="text-[12px] text-casca-suave">{t("Tente recarregar a página.")}</p>
          <button type="button" onClick={aoTentarDeNovo} className="text-[13px] font-semibold text-casca-marca hover:underline">
            {t("Tentar de novo")}
          </button>
        </div>
      </td>
    </tr>
  );
}
