"use client";
import { CabecaDaJanela, JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { useMensagensAgendadas, useRemoverAgendada } from "@/hooks/escale/useMensagensAgendadas";
import { useT } from "@/hooks/i18n/useT";

import { TabelaDeAgendadas } from "./TabelaDeAgendadas";

/** O modal "Mensagens agendadas" da ação rápida do painel (c61): as pendentes desta conversa. */
export function JanelaMensagensAgendadasDoContato({
  aberta,
  aoFechar,
  conversationId,
  contatoNome,
}: {
  aberta: boolean;
  aoFechar: () => void;
  conversationId: string;
  contatoNome: string;
}) {
  const t = useT();
  const { data, isLoading, isError, refetch } = useMensagensAgendadas(
    { conversation_id: conversationId, por_pagina: 50 },
    aberta,
  );
  const remover = useRemoverAgendada();
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[760px]">
      <CabecaDaJanela titulo={t("Mensagens agendadas")} descricao={contatoNome} />
      <div className="mt-4 max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <p className="py-6 text-center text-[12px] text-casca-suave">{t("Carregando…")}</p>
        ) : null}
        {isError && !data ? (
          <ErroDaLista
            mensagem={t("Não foi possível carregar as mensagens agendadas.")}
            aoTentar={() => void refetch()}
          />
        ) : null}
        {!isLoading && !isError && (data?.data.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-[12px] text-casca-suave">
            {t("Nenhuma mensagem agendada.")}
          </p>
        ) : null}
        {data && data.data.length > 0 ? (
          <TabelaDeAgendadas itens={data.data} aoRemover={(id) => remover.mutate(id)} compacta />
        ) : null}
      </div>
    </JanelaDaCasca>
  );
}
