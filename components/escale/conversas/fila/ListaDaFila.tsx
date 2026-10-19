"use client";
import { useEffect, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useContagemDeAgendadas } from "@/hooks/escale/useMensagensAgendadas";
import { useSetoresDasConversas } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { Visualizacao } from "@/lib/escale/conversas/visualizacao";
import { Funnel, Loader2, MessagesSquare, Pencil } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../centro/VazioDaCasca";
import { LinhaDaFila } from "./LinhaDaFila";

interface FilaLeve {
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

/** As linhas (com a fixada no topo), "Carregando mensagens...", os vazios e "Carregar mais". */
export function ListaDaFila({
  fila,
  itens,
  fixada,
  selectedId,
  aoSelecionar,
  aoSoltarFixada,
  temFiltro,
  aoIniciar,
  visualizacao,
}: {
  fila: FilaLeve;
  itens: ConversationWithContact[];
  fixada: ConversationWithContact | null;
  selectedId: string | null;
  aoSelecionar: (id: string) => void;
  aoSoltarFixada: () => void;
  temFiltro: boolean;
  aoIniciar: () => void;
  visualizacao: Visualizacao;
}) {
  const t = useT();
  // FORK ESCALE · Fase 3B: o "⏱ n" de cada linha, uma leitura por página da lista.
  const contagem = useContagemDeAgendadas(
    visualizacao.campos.mensagensAgendadas ? itens.map((c) => c.id) : [],
  );
  // FORK ESCALE · Fase 3C: o setor de cada linha, uma leitura por página da lista.
  const setores = useSetoresDasConversas(
    visualizacao.campos.setor ? [...itens.map((c) => c.id), ...(fixada ? [fixada.id] : [])] : [],
  );
  // O relógio das linhas: o tempo sem resposta anda sozinho com a aba aberta.
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (fila.isLoading && itens.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-[12px] text-casca-suave">
        <Loader2 size={20} aria-hidden className="animate-spin text-casca-marca" />
        {t("Carregando mensagens...")}
      </div>
    );
  }
  if (fila.isError && itens.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[12px] text-casca-suave">
        {t("Erro ao carregar conversas.")}
        <BotaoDaCasca
          variante="texto"
          tamanho="sm"
          className="border border-casca-borda"
          onClick={() => fila.refetch()}
        >
          {t("Tentar novamente")}
        </BotaoDaCasca>
      </div>
    );
  }
  const botaoIniciar = (
    <BotaoDaCasca
      variante="texto"
      tamanho="md"
      className="border border-casca-borda text-casca-texto"
      onClick={aoIniciar}
    >
      <Pencil size={14} aria-hidden />
      {t("Iniciar uma conversa")}
    </BotaoDaCasca>
  );
  if (itens.length === 0 && !fixada) {
    return temFiltro ? (
      <VazioDaCasca
        className="pt-6"
        icone={Funnel}
        titulo={t("Nenhuma conversa nos filtros")}
        texto={
          <>
            {t("Ajuste os filtros")}
            <br />
            {t("para ver conversas.")}
          </>
        }
        acao={botaoIniciar}
      />
    ) : (
      <VazioDaCasca
        className="pt-6"
        icone={MessagesSquare}
        titulo={t("Nenhuma conversa encontrada.")}
        acao={botaoIniciar}
      />
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      {fixada ? (
        <LinhaDaFila
          conversa={fixada}
          selecionada
          fixada
          aoSelecionar={aoSelecionar}
          aoSoltar={aoSoltarFixada}
          visualizacao={visualizacao}
          agora={agora}
          agendadas={contagem[fixada.id] ?? 0}
          setor={setores[fixada.id]}
        />
      ) : null}
      {itens.map((c) => (
        <LinhaDaFila
          key={c.id}
          conversa={c}
          selecionada={c.id === selectedId}
          aoSelecionar={aoSelecionar}
          visualizacao={visualizacao}
          agora={agora}
          agendadas={contagem[c.id] ?? 0}
          setor={setores[c.id]}
        />
      ))}
      {fila.hasNextPage ? (
        <div className="flex justify-center p-3">
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            onClick={() => fila.fetchNextPage()}
            disabled={fila.isFetchingNextPage}
            title={fila.isFetchingNextPage ? t("Carregando…") : undefined}
          >
            {fila.isFetchingNextPage ? t("Carregando…") : t("Carregar mais")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </div>
  );
}
