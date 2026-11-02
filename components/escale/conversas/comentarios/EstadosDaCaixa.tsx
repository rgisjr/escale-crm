"use client";
import Link from "next/link";

import { VazioDaCasca } from "@/components/escale/conversas/centro/VazioDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { MessagesSquare } from "@/lib/ui/icons-da-casca";

export type TipoDeEstado = "sem_conta" | "desconectada" | "acesso_recusado" | "vazio" | "erro";

/**
 * FORK ESCALE · Fase 10A (4.2): os estados da lista de publicações — sem conta, conta desconectada,
 * acesso recusado, vazio e erro. Molde provisório: a Clint não tem esta tela.
 */
export function EstadoDaCaixa({ tipo, aoTentar }: { tipo: TipoDeEstado; aoTentar?: () => void }) {
  const t = useT();
  const canais = (
    <Link href="/app/inbox/configuracoes/canais" className="text-[13px] font-medium text-casca-marca-forte hover:underline">
      {t("Conecte em Configurações › Canais.")}
    </Link>
  );
  const tentar = aoTentar ? (
    <button type="button" onClick={aoTentar} className="text-[13px] font-medium text-casca-marca-forte hover:underline">
      {t("Tentar novamente")}
    </button>
  ) : undefined;

  switch (tipo) {
    case "sem_conta":
      return (
        <VazioDaCasca
          className="flex-1 py-10"
          icone={MessagesSquare}
          titulo={t("Nenhuma conta do Instagram ou do Facebook liberada para você.")}
          acao={canais}
        />
      );
    case "desconectada":
      return (
        <VazioDaCasca
          className="flex-1 py-10"
          icone={MessagesSquare}
          titulo={t("Esta conta está desconectada. Reconecte em Configurações › Canais.")}
        />
      );
    case "acesso_recusado":
      return (
        <VazioDaCasca
          className="flex-1 py-10"
          icone={MessagesSquare}
          titulo={t("O Zernio recusou o acesso. Confira a conexão da conta em Canais.")}
          acao={tentar}
        />
      );
    case "vazio":
      return (
        <VazioDaCasca
          className="flex-1 py-10"
          icone={MessagesSquare}
          titulo={t("Nenhuma publicação com comentários no período.")}
        />
      );
    case "erro":
      return (
        <VazioDaCasca
          className="flex-1 py-10"
          icone={MessagesSquare}
          titulo={t("Erro ao carregar os comentários.")}
          acao={tentar}
        />
      );
  }
}
