"use client";
import { useState } from "react";

import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { useGraficosDoPainel } from "@/hooks/escale/useGraficosDoPainel";
import { usePaineis } from "@/hooks/escale/usePaineisDaCasca";
import { usePreferenciasDoPainel } from "@/hooks/escale/usePreferenciasDoPainel";
import { useT } from "@/hooks/i18n/useT";
import type { Role } from "@/lib/auth/types";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

import { BarraDeFiltrosDoPainel } from "./BarraDeFiltrosDoPainel";
import { CabecalhoDoPainel } from "./CabecalhoDoPainel";
import { GradeDoPainel } from "./GradeDoPainel";

const ESQUELETOS = 5;

/**
 * O PAINEL ABERTO (fork Escale, Fase 7C; prints 10-006 a 10-011, 10-058): cabeçalho e barra de filtros
 * fixos e, embaixo, a grade rolável. Painel sem gráficos mostra só o cabeçalho, a barra e o fundo
 * branco (10-058). O nome vem da lista de painéis para o lápis refletir a edição sem recarregar.
 */
export function PainelDaCasca({
  painel,
  papel,
  opcoesDoFiltro,
}: {
  painel: PainelDaLista;
  papel: Role;
  /** O fuso e o usuário chegam da página; o motor decide o fuso no servidor, então a tela não precisa deles. */
  fuso?: string;
  userId?: string;
  opcoesDoFiltro: OpcoesDoFiltro;
}) {
  const t = useT();
  const [rodada, setRodada] = useState(0);
  const lista = usePaineis();
  const atual = lista.data?.find((p) => p.id === painel.id) ?? painel;
  const graficos = useGraficosDoPainel(painel.id);
  const prefs = usePreferenciasDoPainel(painel.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <CabecalhoDoPainel
        painel={atual}
        papel={papel}
        total={graficos.data?.length ?? 0}
        intervalo={prefs.intervalo}
        aoAtualizar={() => setRodada((n) => n + 1)}
        aoMudarIntervalo={prefs.mudarIntervalo}
      />
      <BarraDeFiltrosDoPainel prefs={prefs} opcoes={opcoesDoFiltro} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
        {graficos.isPending ? (
          <div className="mx-[11px] mt-3 flex flex-col gap-3" aria-busy="true">
            {Array.from({ length: ESQUELETOS }, (_, i) => (
              <div key={i} data-testid="esqueleto" className="h-[200px] animate-pulse rounded-[6px] bg-casca-raia" />
            ))}
          </div>
        ) : graficos.isError ? (
          <ErroDaLista mensagem={t("Erro inesperado.")} aoTentar={() => void graficos.refetch()} />
        ) : graficos.data.length > 0 ? (
          <GradeDoPainel
            graficos={graficos.data}
            filtro={prefs.filtro}
            rodada={rodada}
            intervalo={prefs.intervalo}
            papel={papel}
            painelId={painel.id}
          />
        ) : null}
      </div>
    </div>
  );
}
