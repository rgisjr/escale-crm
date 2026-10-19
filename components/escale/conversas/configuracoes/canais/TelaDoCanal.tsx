"use client";
import { useState } from "react";

import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_GRUPO, type GrupoDeDispositivo } from "@/lib/escale/conversas/nova-conversa";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { TelaSetores } from "../setores/TelaSetores";
import { TelaUsuarios } from "../usuarios/TelaUsuarios";
import { TabelaDeDispositivos } from "./TabelaDeDispositivos";

type Aba = "dispositivos" | "usuarios" | "setores";

/** O canal (c99, 16/10-05): migalhas de 3 níveis e as abas Dispositivos / Usuários e Permissões / Setores. */
export function TelaDoCanal({ canal }: { canal: GrupoDeDispositivo }) {
  const t = useT();
  const [aba, setAba] = useState<Aba>("dispositivos");
  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-do-canal">
      <CabecaDaConfiguracao
        migalhas={[
          { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
          { rotulo: t("Configuração de canais"), href: "/app/inbox/configuracoes/canais" },
          { rotulo: t(ROTULO_DO_GRUPO[canal]) },
        ]}
      />
      <div className="flex items-end gap-6 px-6">
        <AbasDaCasca
          aria-label={t("Seções do canal")}
          valor={aba}
          aoMudar={setAba}
          abas={[
            { valor: "dispositivos", rotulo: t("Dispositivos") },
            { valor: "usuarios", rotulo: t("Usuários e Permissões") },
            { valor: "setores", rotulo: t("Setores") },
          ]}
        />
        {canal === "whatsapp_oficial"
          ? [t("Modelos de mensagem"), t("WhatsApp Flows"), t("Análise de templates")].map((r) => (
              <span
                key={r}
                title={t("Em breve")}
                aria-disabled="true"
                className="pb-3 text-[13px] text-casca-meta"
              >
                {r}
              </span>
            ))
          : null}
      </div>
      <div className="min-h-0 flex-1">
        {aba === "dispositivos" ? (
          <TabelaDeDispositivos canal={canal} />
        ) : aba === "usuarios" ? (
          <TelaUsuarios embutida />
        ) : (
          <TelaSetores embutida />
        )}
      </div>
    </div>
  );
}
