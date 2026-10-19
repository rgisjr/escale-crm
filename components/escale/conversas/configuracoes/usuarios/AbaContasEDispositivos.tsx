"use client";
import { useMemo, useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useGravarRoteamento, useRoteamentoDosCanais } from "@/hooks/escale/useDispositivosDaCasca";
import { nomeDoCanal } from "@/lib/channels/estado";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers, type TeamMember } from "@/hooks/team/useTeamMembers";
import { ligarNoDispositivo, quemEstaNoDispositivo } from "@/lib/escale/conversas/canais";
import {
  GRUPOS_DE_DISPOSITIVO,
  ROTULO_DO_GRUPO,
  grupoDoDispositivo,
  type GrupoDeDispositivo,
} from "@/lib/escale/conversas/nova-conversa";
import { Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Aba Contas e dispositivos (c95; N13): por canal, um toggle por dispositivo; grava na hora. */
export function AbaContasEDispositivos({
  membro,
  aoFechar,
}: {
  membro: TeamMember;
  aoFechar: () => void;
}) {
  const t = useT();
  const { data: sessoes = [] } = useChannelSessions();
  const roteamento = useRoteamentoDosCanais();
  const gravar = useGravarRoteamento();
  const { data: equipe } = useTeamMembers();
  const elegiveis = useMemo(
    () =>
      (equipe?.data ?? [])
        .filter((m) => !m.revoked_at && m.role !== "viewer")
        .map((m) => m.user_id),
    [equipe],
  );
  const canais = GRUPOS_DE_DISPOSITIVO.filter((g) =>
    sessoes.some((s) => grupoDoDispositivo(s.provider) === g),
  );
  const [canal, setCanal] = useState<GrupoDeDispositivo | null>(null);
  const atual = canal ?? canais[0] ?? null;
  const [busca, setBusca] = useState("");
  const ehAdmin = membro.role === "admin";
  const termo = busca.trim().toLowerCase();
  const doCanal = sessoes
    .filter((s) => grupoDoDispositivo(s.provider) === atual)
    .filter((s) => !termo || nomeDoCanal(s).toLowerCase().includes(termo));
  const ligado = (id: string) => {
    if (ehAdmin) return true;
    const c = roteamento.data?.channels.find((x) => x.id === id);
    return c ? quemEstaNoDispositivo(c, elegiveis).includes(membro.user_id) : false;
  };
  const mudar = (id: string, v: boolean) => {
    const c = roteamento.data?.channels.find((x) => x.id === id);
    if (!c) return;
    gravar.mutate({
      channel_session_id: id,
      user_ids: ligarNoDispositivo(c, elegiveis, membro.user_id, v),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-5 pb-3 text-[13px] text-casca-texto">
        <p>{t("Contas e dispositivos que usuário tem acesso.")}</p>
        <p>
          {t(
            "Estes estão associados aos setores aos quais o usuário pertence. Ele pode selecioná-los em atividades e tem autorização para acessá-los no atendimento.",
          )}
        </p>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t("Canais")}
          className="w-[220px] shrink-0 border-r border-casca-borda pl-6"
        >
          {canais.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setCanal(g)}
              aria-current={g === atual ? "page" : undefined}
              className={cn(
                "flex h-[41px] w-full items-center rounded-r-md px-3 text-left text-[13px]",
                g === atual
                  ? "border-l-[3px] border-casca-marca bg-casca-raia font-medium text-casca-marca"
                  : "text-casca-texto hover:bg-casca-raia",
              )}
            >
              {t(ROTULO_DO_GRUPO[g])}
            </button>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col px-6">
          <div className="flex items-center justify-between border-b border-casca-borda pb-3">
            <span className="text-[15px] font-medium text-casca-texto">
              {atual ? t(ROTULO_DO_GRUPO[atual]) : ""}
            </span>
            <button
              type="button"
              disabled={ehAdmin || !roteamento.data}
              onClick={() => {
                for (const s of doCanal) {
                  const c = roteamento.data?.channels.find((x) => x.id === s.id);
                  if (c && !quemEstaNoDispositivo(c, elegiveis).includes(membro.user_id)) {
                    gravar.mutate({
                      channel_session_id: s.id,
                      user_ids: ligarNoDispositivo(c, elegiveis, membro.user_id, true),
                    });
                  }
                }
              }}
              className="h-8 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-40"
            >
              {t("Ativar Todos")}
            </button>
          </div>
          <span className="mt-3 flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar por...")}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta"
            />
            <Search size={16} aria-hidden className="text-casca-suave" />
          </span>
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 content-start overflow-y-auto lg:grid-cols-3">
            {doCanal.map((s) => {
              const nome = nomeDoCanal(s);
              return (
                <span
                  key={s.id}
                  className="flex h-[45px] items-center gap-3 border-b border-casca-borda px-3 text-[13px] text-casca-texto"
                >
                  <InterruptorDaCasca
                    ligado={ligado(s.id)}
                    desabilitado={ehAdmin || !roteamento.data || gravar.isPending}
                    title={ehAdmin ? t("Usuário administrador") : undefined}
                    aoMudar={(v) => mudar(s.id, v)}
                    aria-label={nome}
                  />
                  {nome}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-end border-t border-casca-borda px-6">
        <button
          type="button"
          onClick={aoFechar}
          className="h-9 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white"
        >
          {t("Fechar")}
        </button>
      </div>
    </div>
  );
}
