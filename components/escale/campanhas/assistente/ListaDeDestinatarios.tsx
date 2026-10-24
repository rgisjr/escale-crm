"use client";

import { useState } from "react";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { usePaginaDoPublico } from "@/hooks/escale/useAssistenteDeCampanha";
import { useT } from "@/hooks/i18n/useT";
import type { PublicoDaCampanha } from "@/lib/escale/campanhas/assistente";
import { POR_PAGINA, formatarTelefone } from "@/lib/escale/contatos/regras";
import { EllipsisVertical, Phone, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * OS DESTINATÁRIOS (fork Escale, Fase 8B; 09-035, 09-036, 09-045): a página do
 * público resolvido no banco, cartão por contato (telefone, nome e e-mail,
 * tags) e o ⋮ "Remover da lista". `somenteLeitura` é o "Contatos selecionados".
 */
export function ListaDeDestinatarios({
  publico,
  aoRemover,
  somenteLeitura = false,
}: {
  publico: PublicoDaCampanha;
  aoRemover?: (id: string) => void;
  somenteLeitura?: boolean;
}) {
  const t = useT();
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(10);
  const q = usePaginaDoPublico(publico, pagina, porPagina, true);
  const linhas = q.data?.linhas ?? [];
  const total = q.data?.total ?? 0;
  return (
    <div>
      <div className="space-y-2">
        {q.isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-[60px] animate-pulse rounded-[8px] bg-casca-raia" />
            ))
          : linhas.map((l) => (
              <div
                key={l.id}
                className="flex h-[60px] items-center gap-4 rounded-[8px] border border-casca-borda bg-surface px-4 shadow-xs"
              >
                <Phone className="size-4 shrink-0 text-casca-marca" aria-hidden />
                <span className="w-[200px] shrink-0 text-[13px] text-casca-texto-2">
                  {l.telefone ? formatarTelefone(l.telefone) : t("Sem telefone")}
                </span>
                <span className="w-[260px] min-w-0 shrink-0">
                  <span className="block truncate text-[13px] text-casca-texto">
                    {l.nome ?? ""}
                  </span>
                  {l.email && (
                    <span className="block truncate text-[11px] text-casca-texto-2">{l.email}</span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                  {l.tags.slice(0, 3).map((tag) => (
                    <ChipDaTag key={tag} tag={tag} />
                  ))}
                </span>
                {!somenteLeitura && aoRemover && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={t("Mais opções")}
                        className="flex size-7 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca"
                      >
                        <EllipsisVertical className="size-[18px]" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className={cn(CONTEUDO_DO_MENU, "w-44")}
                      style={SOMBRA_DO_MENU}
                    >
                      <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => aoRemover(l.id)}>
                        <Trash2 className="size-3.5" aria-hidden />
                        {t("Remover da lista")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
      </div>
      {total > porPagina && (
        <div className="mt-3">
          <PaginacaoDaCasca
            pagina={pagina}
            total={total}
            porPagina={porPagina}
            opcoesPorPagina={POR_PAGINA}
            aoMudarPagina={setPagina}
            aoMudarPorPagina={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
