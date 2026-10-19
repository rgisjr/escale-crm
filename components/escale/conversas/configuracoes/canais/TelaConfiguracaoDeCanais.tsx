"use client";
import Link from "next/link";

import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { CARTOES_DE_CANAL, SLUG_DO_CANAL } from "@/lib/escale/conversas/canais";
import { grupoDoDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { BadgeCheck, CheckCircle2, ChevronRight, MessageCircle } from "@/lib/ui/icons-da-casca";
import { InstagramLogo } from "@/lib/ui/icons";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";

/** "CONFIGURAÇÕES › CONFIGURAÇÃO DE CANAIS" (c98; E2): um cartão por canal que a organização tem. */
export function TelaConfiguracaoDeCanais() {
  const t = useT();
  const { data = [], isLoading } = useChannelSessions();
  const presentes = new Set(data.map((s) => grupoDoDispositivo(s.provider)));
  const cartoes = CARTOES_DE_CANAL.filter((c) => presentes.has(c.canal));
  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-canais">
      <CabecaDaConfiguracao
        migalhas={[
          { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
          { rotulo: t("Configuração de canais") },
        ]}
      />
      <div className="px-6 py-6">
        {!isLoading && cartoes.length === 0 ? (
          <p className="text-[13px] text-casca-suave">
            {t(
              "Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa.",
            )}{" "}
            <Link href="/app/connections" className="font-medium text-casca-marca">
              {t("Conectar um canal")}
            </Link>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-4">
          {cartoes.map((c) => (
            <Link
              key={c.canal}
              href={`/app/inbox/configuracoes/canais/${SLUG_DO_CANAL[c.canal]}`}
              className="flex h-[88px] w-[322px] items-center gap-4 rounded-lg border border-casca-borda bg-white px-5 hover:shadow-casca-painel"
            >
              <span className="relative grid size-10 place-items-center rounded-lg bg-casca-raia">
                {c.canal === "instagram" ? (
                  <InstagramLogo size={24} aria-hidden className="text-casca-alerta" />
                ) : (
                  <MessageCircle
                    size={24}
                    aria-hidden
                    className="text-[color:var(--escale-status-ganho)]"
                  />
                )}
                {c.oficial ? (
                  <BadgeCheck
                    size={12}
                    aria-hidden
                    className="absolute right-0 bottom-0 text-casca-novo"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-casca-texto">
                  {c.nome}
                  {c.oficial ? (
                    <span className="rounded-md bg-casca-marca-suave px-2 py-0.5 text-[11px] font-medium text-casca-marca">
                      {t("API oficial")}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 flex items-center gap-1 text-[13px] text-[color:var(--escale-status-ganho)]">
                  <CheckCircle2 size={14} aria-hidden />
                  {t("Instalado")}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden className="text-casca-chevron" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
