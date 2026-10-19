"use client";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { CARTOES_DO_HUB, type CartaoDoHub, type IconeDoHub } from "@/lib/escale/conversas/hub";
import {
  assinarPrefs,
  getPrefsSnapshot,
  getPrefsSnapshotDoServidor,
  gravarCanal,
} from "@/lib/notifications/prefs";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  FileText,
  MessageCircle,
  MessageSquareHeart,
  Smartphone,
  Users,
  Workflow,
} from "@/lib/ui/icons-da-casca";
import { InstagramLogo } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { CabecaDaConfiguracao } from "./CabecaDaConfiguracao";

const ICONE: Record<IconeDoHub, ReactNode> = {
  dispositivo: <Smartphone size={22} aria-hidden />,
  setores: <Building2 size={22} aria-hidden />,
  agendadas: <CalendarClock size={22} aria-hidden />,
  respostas: <MessageSquareHeart size={22} aria-hidden />,
  usuarios: <Users size={22} aria-hidden />,
  notificacoes: <Bell size={22} aria-hidden />,
  modelos: <FileText size={22} aria-hidden />,
  flows: <Workflow size={22} aria-hidden />,
  analise: <BarChart3 size={22} aria-hidden />,
};
const CARTAO =
  "flex min-h-[124px] gap-4 rounded-lg border border-casca-borda bg-white p-5 text-left transition-shadow";

function Conteudo({ c, direita }: { c: CartaoDoHub; direita?: ReactNode }) {
  const t = useT();
  return (
    <>
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca">
        {ICONE[c.chave]}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-casca-texto">
          {t(c.titulo)}
          {c.chave === "dispositivo" ? (
            <span className="flex items-center gap-1" aria-hidden>
              <MessageCircle size={14} className="text-[color:var(--escale-status-ganho)]" />
              <InstagramLogo size={14} className="text-casca-alerta" />
            </span>
          ) : null}
          {direita}
        </span>
        <span className="mt-1 line-clamp-3 block text-[13px] text-casca-suave">
          {t(c.descricao)}
        </span>
      </span>
    </>
  );
}

/**
 * O HUB ⚙ "CONVERSAS › CONFIGURAÇÕES" (c37; E5; N15): os 9 cartões em 3
 * colunas. Notificações tem o toggle (as de "Nova mensagem" do original) e o
 * cartão leva às preferências; Modelos, Flows e Análise ficam "Em breve".
 */
export function HubDeConfiguracoes() {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const prefs = useSyncExternalStore(assinarPrefs, getPrefsSnapshot, getPrefsSnapshotDoServidor);
  const notificacoesLigadas = prefs.message.in_app || prefs.message.push;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="hub-de-configuracoes">
      <CabecaDaConfiguracao
        migalhas={[{ rotulo: t("Conversas"), href: "/app/inbox" }, { rotulo: t("Configurações") }]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="grid max-w-[1048px] grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {CARTOES_DO_HUB.map((c) => {
            const apagado = c.emBreve || (c.soAdmin && !ehAdmin);
            if (c.chave === "notificacoes") {
              return (
                <div key={c.chave} className={CARTAO}>
                  <Link href={c.destino!} className="flex min-w-0 flex-1 gap-4 hover:opacity-90">
                    <Conteudo c={c} />
                  </Link>
                  <InterruptorDaCasca
                    ligado={notificacoesLigadas}
                    aoMudar={(v) => {
                      gravarCanal("message", "in_app", v);
                      gravarCanal("message", "push", v);
                    }}
                    aria-label={t("Notificações")}
                  />
                </div>
              );
            }
            if (apagado || !c.destino) {
              return (
                <div
                  key={c.chave}
                  aria-disabled="true"
                  title={c.emBreve ? t("Em breve") : t("Só administradores")}
                  className={cn(CARTAO, "cursor-not-allowed opacity-50")}
                >
                  <Conteudo c={c} />
                </div>
              );
            }
            return (
              <Link
                key={c.chave}
                href={c.destino}
                className={cn(CARTAO, "hover:shadow-casca-painel")}
              >
                <Conteudo c={c} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
