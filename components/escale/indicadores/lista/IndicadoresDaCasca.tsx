"use client";
import { useDeferredValue, useState } from "react";

import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { usePaineis } from "@/hooks/escale/usePaineisDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { Role } from "@/lib/auth/types";
import { filtrarPaineis, ordenarPaineis, podeGerirPaineis } from "@/lib/escale/indicadores/paineis/regras";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

import { BuscaDosPaineis } from "./BuscaDosPaineis";
import { CabecalhoDosIndicadores } from "./CabecalhoDosIndicadores";
import { CardDoPainel } from "./CardDoPainel";
import { JanelaInformacoesDoPainel } from "./JanelaInformacoesDoPainel";
import { JanelaNovoDashboard } from "./JanelaNovoDashboard";
import { BuscaSemResultado, EsqueletoDosPaineis, VazioDosPaineis } from "./VaziosDosPaineis";

const GRADE = "grid grid-cols-1 gap-[15px] md:grid-cols-2 lg:grid-cols-3";

/**
 * A LISTA DE PAINÉIS DA CASCA (10-001; fork Escale, Fase 7B): cabeçalho, busca,
 * grade de cards em ordem alfabética, estados e os dois modais. A busca filtra
 * no cliente; `useDeferredValue` deixa a digitação fluida sem ir ao servidor.
 */
export function IndicadoresDaCasca({ papel, fuso }: { papel: Role; fuso: string }) {
  const t = useT();
  const podeGerir = podeGerirPaineis(papel);
  const paineis = usePaineis();
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<PainelDaLista | null>(null);

  const todos = paineis.data ?? [];
  const visiveis = ordenarPaineis(filtrarPaineis(todos, buscaAdiada));

  function conteudo() {
    if (paineis.isPending) return <div className={GRADE}><EsqueletoDosPaineis /></div>;
    if (paineis.isError) return <ErroDaLista mensagem={t("Erro inesperado.")} aoTentar={() => void paineis.refetch()} />;
    if (todos.length === 0) return <VazioDosPaineis />;
    if (visiveis.length === 0) return <BuscaSemResultado />;
    return (
      <div className={GRADE}>
        {visiveis.map((p) => (
          <CardDoPainel key={p.id} painel={p} fuso={fuso} podeGerir={podeGerir} aoEditar={setEditando} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <CabecalhoDosIndicadores podeGerir={podeGerir} aoNovoDashboard={() => setNovoAberto(true)} />
      <BuscaDosPaineis valor={busca} aoMudar={setBusca} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-11 pt-4 pb-8">{conteudo()}</main>
      {podeGerir ? <JanelaNovoDashboard aberta={novoAberto} aoFechar={() => setNovoAberto(false)} /> : null}
      {editando ? (
        <JanelaInformacoesDoPainel key={editando.id} painel={editando} aoFechar={() => setEditando(null)} />
      ) : null}
    </div>
  );
}
