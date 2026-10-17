"use client";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, Search, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A MOLDURA "CAMPOS DE …" DA CLINT (fork Escale, Fase 1G, C2; prints 02 a 04).
 *
 * Um grupo só ("Informações Gerais"). Os grupos de campos, "Ocultar vazios",
 * "Pesquisar campos" e "Gerenciar campos" são da 1H (C10, C14) e da Fase 2
 * (C11, C13): aparecem no lugar, desligados com "Em breve". Só leitura.
 */
export interface CampoDaFicha {
  chave: string;
  rotulo: string;
  valor: string | null;
  /** Campo de lista: a Clint desenha o ▾ dentro da caixa. */
  lista?: boolean;
}

const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

export function CamposDaFicha({
  icone,
  titulo,
  campos,
}: {
  icone: ReactNode;
  titulo: string;
  campos: CampoDaFicha[];
}) {
  const t = useT();
  return (
    <div className="px-4 py-6">
      <div className="flex h-[46px] items-center justify-between rounded-lg bg-casca-raia px-5">
        <h2 className="flex items-center gap-2 text-[15px] text-casca-texto">
          <span aria-hidden className="text-casca-marca">
            {icone}
          </span>
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            disabled
            title={t("Em breve")}
            className={cn("bg-surface", EM_BREVE)}
          >
            {t("Ocultar vazios")}
          </BotaoDaCasca>
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            disabled
            title={t("Em breve")}
            className={cn("bg-surface", EM_BREVE)}
          >
            <Settings aria-hidden />
            {t("Gerenciar campos")}
          </BotaoDaCasca>
        </div>
      </div>
      <div className="mt-4 flex rounded-lg border border-casca-borda">
        <nav
          aria-label={t("Grupos de campos")}
          className="w-[238px] shrink-0 border-r border-casca-borda p-2"
        >
          <span
            aria-current="true"
            className="flex h-9 items-center rounded-md border-l-2 border-casca-marca bg-casca-raia px-3 text-[13px] font-semibold text-casca-texto"
          >
            {t("Informações Gerais")}
          </span>
        </nav>
        <div className="min-w-0 flex-1">
          <div className="border-b border-casca-borda p-4">
            <span className="relative inline-block">
              <input
                disabled
                title={t("Em breve")}
                placeholder={t("Pesquisar campos...")}
                className="h-8 w-[166px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] placeholder:text-casca-meta disabled:cursor-not-allowed"
              />
              <Search
                size={14}
                aria-hidden
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
              />
            </span>
          </div>
          <dl className="px-9 py-4">
            {campos.map((c) => (
              <div
                key={c.chave}
                className="grid grid-cols-[275px_1fr] items-center border-b border-casca-borda py-2 last:border-b-0"
              >
                <dt className="text-[13px] font-medium text-casca-texto">{c.rotulo}</dt>
                <dd
                  title={c.valor ? undefined : t("Em breve")}
                  className={cn(
                    "flex h-8 items-center justify-between rounded-md bg-casca-busca px-3 text-[13px]",
                    c.valor ? "text-casca-texto" : "text-casca-meta",
                  )}
                >
                  <span className="truncate">{c.valor ?? t("Clique aqui para adicionar")}</span>
                  {c.lista ? (
                    <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-suave" />
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
