"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useRoteamentoDosCanais } from "@/hooks/escale/useDispositivosDaCasca";
import { useUsuariosDaCasca } from "@/hooks/escale/useUsuariosDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers, type TeamMember } from "@/hooks/team/useTeamMembers";
import { dispositivosDoUsuario } from "@/lib/escale/conversas/canais";
import {
  GRUPOS_DE_DISPOSITIVO,
  grupoDoDispositivo,
  type GrupoDeDispositivo,
} from "@/lib/escale/conversas/nova-conversa";
import { grupoDoUsuario, rotuloDoGrupo, type Papel } from "@/lib/escale/conversas/permissoes";
import { InstagramLogo } from "@/lib/ui/icons";
import { BadgeCheck, MessageCircle, Search } from "@/lib/ui/icons-da-casca";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { FotoDaPessoa } from "../FotoDaPessoa";
import { JanelaDoUsuario } from "./JanelaDoUsuario";

const CABECA =
  "h-10 px-4 text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";

function IconeDoCanal({ canal }: { canal: GrupoDeDispositivo }) {
  if (canal === "instagram")
    return <InstagramLogo size={16} aria-hidden className="text-casca-alerta" />;
  return (
    <span className="relative inline-block">
      <MessageCircle size={16} aria-hidden className="text-[color:var(--escale-status-ganho)]" />
      {canal === "whatsapp_oficial" ? (
        <BadgeCheck
          size={8}
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 text-casca-novo"
        />
      ) : null}
    </span>
  );
}

/** "CONFIGURAÇÕES › USUÁRIOS E PERMISSÕES" (c40; E4). Só admin (N17). */
export function TelaUsuarios({ embutida = false }: { embutida?: boolean }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const { data: equipe } = useTeamMembers({ enabled: ehAdmin });
  const extras = useUsuariosDaCasca(ehAdmin);
  const roteamento = useRoteamentoDosCanais(ehAdmin);
  const { data: sessoes = [] } = useChannelSessions();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<TeamMember | null>(null);

  const pessoas = useMemo(() => (equipe?.data ?? []).filter((m) => !m.revoked_at), [equipe]);
  const elegiveis = pessoas.filter((p) => p.role !== "viewer").map((p) => p.user_id);
  const termo = busca.trim().toLowerCase();
  const lista = pessoas.filter(
    (p) =>
      !termo ||
      (p.full_name ?? "").toLowerCase().includes(termo) ||
      (p.email ?? "").toLowerCase().includes(termo),
  );
  const canaisDe = (p: TeamMember): GrupoDeDispositivo[] => {
    const ids = dispositivosDoUsuario(
      p.user_id,
      p.role as Papel,
      roteamento.data?.channels ?? [],
      elegiveis,
    );
    const grupos = new Set(
      sessoes.filter((s) => ids.includes(s.id)).map((s) => grupoDoDispositivo(s.provider)),
    );
    return GRUPOS_DE_DISPOSITIVO.filter((g) => grupos.has(g));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-usuarios">
      {!embutida ? (
        <CabecaDaConfiguracao
          migalhas={[
            { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
            { rotulo: t("Usuários e Permissões") },
          ]}
        />
      ) : null}
      {!ehAdmin ? (
        <p className="px-6 py-10 text-center text-[13px] text-casca-suave">
          {t("Só administradores")}
        </p>
      ) : (
        <>
          <div className="flex h-14 shrink-0 items-center gap-3 px-6">
            <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar por nome, e-mail ou telefone")}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta"
              />
              <Search size={16} aria-hidden className="text-casca-suave" />
            </span>
            <span className="flex-1" />
            <Link
              href="/app/team/invite"
              className="inline-flex h-8 items-center rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white hover:opacity-90"
            >
              {t("Adicionar usuário")}
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {lista.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[15px] font-semibold text-casca-texto">
                  {t("Nenhum usuário encontrado")}
                </p>
                <p className="text-[13px] text-casca-suave">
                  {t("Tente ajustar o termo da busca.")}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-casca-borda">
                    <th className={`${CABECA} text-left`}>{t("Usuário")}</th>
                    <th className={`${CABECA} w-[200px] text-center`}>{t("Dispositivo")}</th>
                    <th className={`${CABECA} w-[260px] text-center`}>
                      {t("Permissões de atendimento")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => {
                    const nome = p.full_name?.trim() || p.email || "";
                    const grupo = grupoDoUsuario(
                      p.role as Papel,
                      (extras[p.user_id]?.excecoes ?? 0) > 0 ? { CHAT_BULK_ACTIONS: true } : {},
                    );
                    return (
                      <tr
                        key={p.user_id}
                        aria-label={nome}
                        onClick={() => setAberto(p)}
                        className="h-[53px] cursor-pointer border-b border-casca-borda hover:bg-casca-raia/50"
                      >
                        <td className="px-4">
                          <span className="flex items-center gap-3">
                            <FotoDaPessoa id={p.user_id} nome={nome} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
                                {nome}
                                {p.accepted_at ? (
                                  <BadgeCheck
                                    size={14}
                                    aria-label={t("Verificado")}
                                    className="text-casca-novo"
                                  />
                                ) : null}
                              </span>
                              <span className="block truncate text-[13px] text-casca-suave">
                                {p.email}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-4">
                          <span className="flex items-center justify-center gap-3">
                            {canaisDe(p).map((c) => (
                              <IconeDoCanal key={c} canal={c} />
                            ))}
                          </span>
                        </td>
                        <td className="px-4 text-center">
                          <span className="inline-flex h-[22px] items-center rounded-md bg-casca-raia px-2 text-[12px] text-casca-texto">
                            {t(rotuloDoGrupo(grupo))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      <JanelaDoUsuario aberta={aberto !== null} aoFechar={() => setAberto(null)} membro={aberto} />
    </div>
  );
}
