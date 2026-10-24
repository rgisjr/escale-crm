"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_NOVA } from "@/lib/escale/campanhas/rotas";
import { WhatsappLogo } from "@/lib/ui/icons";

/**
 * OS ESTADOS DA LISTA (N15; molde do 014; textos do código da Clint): sem
 * nenhuma campanha (no lugar dos filtros e da tabela), vazio por filtro, as 10
 * linhas-esqueleto e o erro.
 */
export function VazioSemCampanhas() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-[10px] bg-casca-marca-suave text-casca-marca"
      >
        <WhatsappLogo size={24} />
      </span>
      <h2 className="mt-4 text-[15px] font-semibold text-casca-texto">
        {t("Crie sua primeira campanha")}
      </h2>
      <p className="mt-2 max-w-[190px] text-[13px] leading-5 text-casca-suave">
        {t("Envie WhatsApp em massa para sua audiência de forma rápida e organizada.")}
      </p>
      <Link
        href={ROTA_DA_NOVA}
        className="mt-4 inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] font-medium text-casca-texto transition-colors hover:bg-casca-raia"
      >
        <WhatsappLogo size={14} aria-hidden />
        {t("Enviar WhatsApp")}
      </Link>
    </div>
  );
}

export function VazioDoFiltro({ aoLimpar }: { aoLimpar: () => void }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={6} className="py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[15px] font-semibold text-casca-texto">
            {t("Nenhuma campanha encontrada")}
          </p>
          <p className="text-[13px] text-casca-suave">
            {t("Tente ajustar a busca ou os filtros aplicados.")}
          </p>
          <button
            type="button"
            onClick={aoLimpar}
            className="mt-2 h-8 rounded-casca-gatilho border border-casca-borda px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            {t("Limpar filtros")}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function EsqueletoDaLista() {
  const t = useT();
  return (
    <>
      <tr className="sr-only">
        <td colSpan={6}>{t("Carregando campanhas")}</td>
      </tr>
      {Array.from({ length: 10 }, (_, i) => (
        <tr key={i} data-esqueleto aria-hidden className="h-[54px] border-b border-casca-divisoria">
          <td className="pr-3 pl-6">
            <div className="flex items-center gap-3">
              <span className="size-[34px] animate-pulse rounded-[8px] bg-casca-raia" />
              <span className="h-3 w-32 animate-pulse rounded-[4px] bg-casca-raia" />
            </div>
          </td>
          <td className="px-3">
            <span className="block h-3 w-24 animate-pulse rounded-[4px] bg-casca-raia" />
          </td>
          <td className="px-3">
            <span className="block h-3 w-28 animate-pulse rounded-[4px] bg-casca-raia" />
          </td>
          <td className="px-3">
            <span className="block h-2 w-[200px] animate-pulse rounded-full bg-casca-raia" />
          </td>
          <td className="px-3">
            <span className="block h-[22px] w-20 animate-pulse rounded-[4px] bg-casca-raia" />
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export function ErroDaLista({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={6} className="py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[13px] text-casca-alerta">
            {t("Não foi possível carregar as campanhas.")}
          </p>
          <button
            type="button"
            onClick={aoTentarDeNovo}
            className="h-8 rounded-casca-gatilho border border-casca-borda px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            {t("Tentar novamente")}
          </button>
        </div>
      </td>
    </tr>
  );
}
