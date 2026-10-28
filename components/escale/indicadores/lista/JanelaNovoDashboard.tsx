"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { DialogTitle } from "@/components/ui/dialog";
import { useAcoesDosPaineis } from "@/hooks/escale/usePaineisDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { rotaDoPainel } from "@/lib/escale/indicadores/rotas";
import { Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Categoria = "todos" | "meus";

/**
 * O MODAL "NOVO DASHBOARD" (10-005): categorias à esquerda, "Selecione um modelo"
 * com a busca à direita e "+ Novo dashboard em branco" no rodapé. Os modelos
 * entram na 7F sem mudar a casca; a categoria "Meta" não entra (decisão 2).
 */
export function JanelaNovoDashboard({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const t = useT();
  const router = useRouter();
  const { criar } = useAcoesDosPaineis();
  const [categoria, setCategoria] = useState<Categoria>("todos");
  const [busca, setBusca] = useState("");
  const categorias: { valor: Categoria; rotulo: string }[] = [
    { valor: "todos", rotulo: t("Todos os modelos") },
    { valor: "meus", rotulo: t("Meus templates") },
  ];

  function criarEmBranco() {
    criar.mutate(undefined, {
      onSuccess: ({ id }) => {
        aoFechar();
        router.push(rotaDoPainel(id));
      },
      onError: (err) => (err instanceof ApiError ? showApiError(err) : toast.error(t("Erro inesperado."))),
    });
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(72rem,calc(100vw-2rem))] gap-0 p-0">
      <div className="flex h-14 items-center border-b border-casca-divisoria px-5">
        <DialogTitle className="text-[16px] font-medium text-casca-texto">{t("Novo dashboard")}</DialogTitle>
      </div>
      <div className="flex h-[540px] min-h-0">
        <nav aria-label={t("Selecione um modelo")} className="w-40 shrink-0 border-r border-casca-divisoria p-4">
          <ul className="grid gap-1">
            {categorias.map(({ valor: c, rotulo }) => (
              <li key={c}>
                <button
                  type="button"
                  aria-current={categoria === c ? "true" : undefined}
                  onClick={() => setCategoria(c)}
                  className={cn(
                    "w-full rounded-[4px] border-l-2 px-2 py-1.5 text-left text-[13px]",
                    categoria === c
                      ? "border-casca-marca bg-casca-marca-suave text-casca-marca"
                      : "border-transparent text-casca-texto hover:bg-casca-raia",
                  )}
                >
                  {rotulo}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <section className="flex min-w-0 flex-1 flex-col p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-casca-texto">{t("Selecione um modelo")}</p>
            <label className="relative w-[150px]">
              <span className="sr-only">{t("Buscar")}</span>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar")}
                className="h-8 w-full rounded-[6px] border-0 bg-casca-raia pr-8 pl-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-suave"
              />
              <Search size={16} aria-hidden className="pointer-events-none absolute top-2 right-2.5 text-casca-suave" />
            </label>
          </div>
          <div className="grid flex-1 place-items-center">
            <p className="text-[13px] text-casca-suave">{t("Nenhum template encontrado")}</p>
          </div>
        </section>
      </div>
      <div className="flex h-16 items-center justify-end border-t border-casca-divisoria px-5">
        <button
          type="button"
          onClick={criarEmBranco}
          disabled={criar.isPending}
          className="inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] text-casca-texto transition-colors hover:bg-casca-raia disabled:opacity-50"
        >
          {t("+ Novo dashboard em branco")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
