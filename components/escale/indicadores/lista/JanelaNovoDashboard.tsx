"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { GradeDeModelos } from "@/components/escale/indicadores/modelos/GradeDeModelos";
import {
  FILTROS_VAZIOS,
  PassoConfigureFiltros,
  useCriarDashboardDoModelo,
} from "@/components/escale/indicadores/modelos/PassoConfigureFiltros";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { DialogTitle } from "@/components/ui/dialog";
import { useAcoesDosPaineis } from "@/hooks/escale/usePaineisDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { FiltrosDoModelo } from "@/lib/escale/indicadores/modelos/regras";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";
import { rotaDoPainel } from "@/lib/escale/indicadores/rotas";
import { cn } from "@/lib/utils";

type Categoria = "todos" | "meus";
type Passo = { tipo: "grade" } | { tipo: "filtros"; modelo: ModeloNaLista };

/**
 * O MODAL "NOVO DASHBOARD" (10-005, 10-017, 10-020): categorias à esquerda e, à direita, a grade de modelos
 * ("Selecione um modelo") ou o passo "Configure filtros". O rodapé traz "+ Novo dashboard em branco" na grade
 * e "Criar dashboard" no passo. A categoria "Meta" não entra (decisão 2).
 */
export function JanelaNovoDashboard({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const t = useT();
  const router = useRouter();
  const { criar } = useAcoesDosPaineis();
  const [categoria, setCategoria] = useState<Categoria>("todos");
  const [busca, setBusca] = useState("");
  const [passo, setPasso] = useState<Passo>({ tipo: "grade" });
  const [filtros, setFiltros] = useState<FiltrosDoModelo>(FILTROS_VAZIOS);
  const categorias: { valor: Categoria; rotulo: string }[] = [
    { valor: "todos", rotulo: t("Todos os modelos") },
    { valor: "meus", rotulo: t("Meus templates") },
  ];
  const { criar: criarDoModelo, ocupado } = useCriarDashboardDoModelo((id) => {
    aoFechar();
    router.push(rotaDoPainel(id));
  });

  function criarEmBranco() {
    criar.mutate(undefined, {
      onSuccess: ({ id }) => {
        aoFechar();
        router.push(rotaDoPainel(id));
      },
      onError: (err) => (err instanceof ApiError ? showApiError(err) : toast.error(t("Erro inesperado."))),
    });
  }

  function escolherCategoria(c: Categoria) {
    setCategoria(c);
    setPasso({ tipo: "grade" });
  }

  function usarModelo(modelo: ModeloNaLista) {
    setFiltros(FILTROS_VAZIOS);
    setPasso({ tipo: "filtros", modelo });
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
                  onClick={() => escolherCategoria(c)}
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
          {passo.tipo === "grade" ? (
            <GradeDeModelos categoria={categoria} busca={busca} aoBuscar={setBusca} aoUsar={usarModelo} />
          ) : (
            <PassoConfigureFiltros filtros={filtros} aoMudar={setFiltros} />
          )}
        </section>
      </div>
      <div className="flex h-16 items-center justify-end border-t border-casca-divisoria px-5">
        {passo.tipo === "grade" ? (
          <button
            type="button"
            onClick={criarEmBranco}
            disabled={criar.isPending}
            className="inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] text-casca-texto transition-colors hover:bg-casca-raia disabled:opacity-50"
          >
            {t("+ Novo dashboard em branco")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => criarDoModelo(passo.modelo, filtros)}
            disabled={ocupado}
            className="inline-flex h-8 items-center rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white transition-colors hover:bg-casca-marca-forte disabled:opacity-50"
          >
            {t("Criar dashboard")}
          </button>
        )}
      </div>
    </JanelaDaCasca>
  );
}
