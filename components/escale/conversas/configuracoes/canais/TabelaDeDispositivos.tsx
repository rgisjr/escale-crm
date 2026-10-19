"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useChannelSessions, type ChannelSession } from "@/hooks/channels/useChannelSessions";
import {
  useExcluirDispositivo,
  useRoteamentoDosCanais,
} from "@/hooks/escale/useDispositivosDaCasca";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { quemEstaNoDispositivo, statusDoDispositivo } from "@/lib/escale/conversas/canais";
import { grupoDoDispositivo, type GrupoDeDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Archive, Pencil, QrCode, Search, Trash2, Unplug } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaPessoa } from "../FotoDaPessoa";
import { MenuDaLinhaDeConfiguracao } from "../MenuDaLinhaDeConfiguracao";
import { JanelaDoDispositivo } from "./JanelaDoDispositivo";

const CABECA =
  "h-10 px-4 text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";
const FOTOS_MAX = 4;

/** A lista de dispositivos do canal (c99, c100; E2; N10). */
export function TabelaDeDispositivos({ canal }: { canal: GrupoDeDispositivo }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const podeGerenciar = ehAdmin || activeOrg?.role === "manager";
  const minhas = useMinhasPermissoes();
  const { data: sessoes = [] } = useChannelSessions();
  const { data: setores = [] } = useSetores();
  const roteamento = useRoteamentoDosCanais(podeGerenciar);
  const { data: equipe } = useTeamMembers({ enabled: podeGerenciar });
  const excluir = useExcluirDispositivo();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ChannelSession | null>(null);

  const pessoas = useMemo(
    () => (equipe?.data ?? []).filter((m) => !m.revoked_at && m.role !== "viewer"),
    [equipe],
  );
  const elegiveis = pessoas.map((p) => p.user_id);
  const nomeDe = (id: string) => pessoas.find((p) => p.user_id === id)?.full_name?.trim() || "";
  const setorDe = (id: string) =>
    setores.find((s) => s.ids_dos_dispositivos.includes(id))?.nome ?? "—";
  const termo = busca.trim().toLowerCase();
  const podeVerTodos = ehAdmin || minhas.CHAT_VIEW_CHANNEL_ACCOUNT === true;
  const linhas = sessoes
    .filter((s) => grupoDoDispositivo(s.provider) === canal)
    .filter(
      (s) =>
        !termo ||
        (s.display_name ?? "").toLowerCase().includes(termo) ||
        (s.phone_number ?? "").includes(termo),
    );

  if (!podeVerTodos && !podeGerenciar) {
    return (
      <p className="px-6 py-10 text-center text-[13px] text-casca-suave">
        {t("Você não tem acesso às configurações de dispositivos.")}
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-4 px-6">
        <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar dispositivo...")}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta"
          />
          <Search size={16} aria-hidden className="text-casca-suave" />
        </span>
        <span
          title={t("Em breve")}
          aria-disabled="true"
          className="text-[13px] font-medium text-casca-marca opacity-50"
        >
          {t("Mostrar arquivados")}
        </span>
        <span className="flex-1" />
        {ehAdmin ? (
          <Link
            href="/app/connections"
            className="inline-flex h-8 items-center rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white hover:opacity-90"
          >
            {t("Novo dispositivo")}
          </Link>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-casca-borda">
              <th className={`${CABECA} text-left`}>{t("Nome dispositivo")}</th>
              <th className={`${CABECA} w-[160px] text-center`}>{t("Status")}</th>
              <th className={`${CABECA} w-[180px] text-center`}>{t("Setores")}</th>
              <th className={`${CABECA} w-[240px] text-center`}>
                {t("Usuários nesse dispositivo")}
              </th>
              <th className={`${CABECA} w-24`} aria-label={t("Ações")} />
            </tr>
          </thead>
          <tbody>
            {linhas.map((s) => {
              const conectado = statusDoDispositivo(s.status) === "conectado";
              const canalDoRoteamento = roteamento.data?.channels.find((c) => c.id === s.id);
              const quem = canalDoRoteamento
                ? quemEstaNoDispositivo(canalDoRoteamento, elegiveis)
                : [];
              const nome = s.display_name?.trim() || s.phone_number || "";
              return (
                <tr
                  key={s.id}
                  aria-label={nome}
                  className="h-[53px] border-b border-casca-borda hover:bg-casca-raia/50"
                >
                  <td className="px-4">
                    <span className="flex items-center gap-3">
                      <FotoDaPessoa id={s.id} nome={nome} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-casca-texto">
                          {nome}
                        </span>
                        <span className="block text-[13px] text-casca-suave">
                          {formatarTelefone(s.phone_number)}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 text-center">
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-md px-2 text-[13px]",
                        conectado
                          ? "bg-[color:var(--escale-status-ganho-suave)] text-[color:var(--escale-status-ganho)]"
                          : "bg-casca-atraso text-casca-alerta",
                      )}
                    >
                      {conectado ? t("Conectado") : t("Desconectado")}
                    </span>
                  </td>
                  <td className="px-4 text-center text-[13px] font-medium text-casca-texto">
                    {setorDe(s.id)}
                  </td>
                  <td className="px-4">
                    <span className="flex items-center justify-center">
                      {quem.slice(0, FOTOS_MAX).map((id) => (
                        <span key={id} className="-ml-2 first:ml-0" title={nomeDe(id)}>
                          <FotoDaPessoa id={id} nome={nomeDe(id)} tamanho={28} />
                        </span>
                      ))}
                      {quem.length > FOTOS_MAX ? (
                        <span className="-ml-2 grid size-7 place-items-center rounded-full bg-casca-raia text-[11px] text-casca-suave ring-2 ring-white">
                          +{quem.length - FOTOS_MAX}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4">
                    <span className="flex items-center justify-end gap-3">
                      {conectado ? (
                        <span
                          title={t("Em breve")}
                          aria-label={t("Desconectar")}
                          className="text-casca-meta"
                        >
                          <Unplug size={18} aria-hidden />
                        </span>
                      ) : (
                        <Link
                          href="/app/connections"
                          aria-label={t("Conectar")}
                          title={t("Conectar")}
                          className="text-casca-suave hover:text-casca-texto"
                        >
                          <QrCode size={18} aria-hidden />
                        </Link>
                      )}
                      <MenuDaLinhaDeConfiguracao
                        itens={[
                          {
                            rotulo: t("Editar"),
                            icone: <Pencil size={14} aria-hidden />,
                            aoEscolher: () => setEditando(s),
                          },
                          {
                            rotulo: t("Desconectar"),
                            icone: <Unplug size={14} aria-hidden />,
                            aoEscolher: () => undefined,
                            desabilitado: true,
                          },
                          {
                            rotulo: t("Arquivar"),
                            icone: <Archive size={14} aria-hidden />,
                            aoEscolher: () => undefined,
                            desabilitado: true,
                          },
                          ...(ehAdmin
                            ? [
                                {
                                  rotulo: t("Excluir"),
                                  icone: <Trash2 size={14} aria-hidden />,
                                  perigo: true,
                                  confirmar: t(
                                    "Excluir o dispositivo? O número para de receber mensagens.",
                                  ),
                                  aoEscolher: () => excluir.mutate(s.id),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <JanelaDoDispositivo
        aberta={editando !== null}
        aoFechar={() => setEditando(null)}
        dispositivo={editando}
      />
    </div>
  );
}
