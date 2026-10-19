"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import type { ChannelSession } from "@/hooks/channels/useChannelSessions";
import {
  useGravarRoteamento,
  useRenomearDispositivo,
  useRoteamentoDosCanais,
} from "@/hooks/escale/useDispositivosDaCasca";
import { useSetorDoDispositivo, useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  ativarTodosNoDispositivo,
  ligarNoDispositivo,
  quemEstaNoDispositivo,
} from "@/lib/escale/conversas/canais";
import { grupoDoDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Search, Smartphone, X } from "@/lib/ui/icons-da-casca";

import { FotoDaPessoa } from "../FotoDaPessoa";

/**
 * "INFORMAÇÕES DO DISPOSITIVO" (c101–c103, 16/10-04; E2; N10, N11). Nome e
 * setor salvam no rodapé; cada atendente salva na hora (o PATCH dos
 * responsáveis do original troca a lista do canal). Admin aparece ligado e
 * apagado ("Usuário administrador"). "Criação de negócio" é da 3E.
 */
export function JanelaDoDispositivo({
  aberta,
  aoFechar,
  dispositivo,
}: {
  aberta: boolean;
  aoFechar: () => void;
  dispositivo: ChannelSession | null;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const [aba, setAba] = useState<"dispositivos" | "criacao">("dispositivos");
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [busca, setBusca] = useState("");
  const { data: setores = [] } = useSetores();
  const { data: equipe } = useTeamMembers({ enabled: aberta });
  const roteamento = useRoteamentoDosCanais(aberta);
  const gravarRoteamento = useGravarRoteamento();
  const renomear = useRenomearDispositivo();
  const setorDoDispositivo = useSetorDoDispositivo();
  const setorAtual = dispositivo
    ? (setores.find((s) => s.ids_dos_dispositivos.includes(dispositivo.id))?.id ?? "")
    : "";

  useEffect(() => {
    if (!aberta || !dispositivo) return;
    setAba("dispositivos");
    setNome(dispositivo.display_name ? dispositivo.display_name : "");
    setSetorId(setorAtual);
    setBusca("");
  }, [aberta, dispositivo, setorAtual]);

  const pessoas = useMemo(
    () =>
      (equipe?.data ?? [])
        .filter((m) => !m.revoked_at && m.role !== "viewer")
        .map((m) => ({
          id: m.user_id,
          nome: m.full_name?.trim() || m.email || "",
          email: m.email ?? "",
          admin: m.role === "admin",
        })),
    [equipe],
  );
  const elegiveis = pessoas.map((p) => p.id);
  const canal = dispositivo
    ? roteamento.data?.channels.find((c) => c.id === dispositivo.id)
    : undefined;
  const ligados = canal ? quemEstaNoDispositivo(canal, elegiveis) : [];
  const termo = busca.trim().toLowerCase();
  const visiveis = termo
    ? pessoas.filter(
        (p) => p.nome.toLowerCase().includes(termo) || p.email.toLowerCase().includes(termo),
      )
    : pessoas;
  const naoAdmins = pessoas.filter((p) => !p.admin).map((p) => p.id);
  const todosLigados = naoAdmins.length > 0 && naoAdmins.every((id) => ligados.includes(id));
  const ehOficial = grupoDoDispositivo(dispositivo?.provider) === "whatsapp_oficial";

  if (!dispositivo) return null;
  const mudarPessoa = (id: string, ligado: boolean) => {
    if (!canal) return;
    gravarRoteamento.mutate({
      channel_session_id: dispositivo.id,
      user_ids: ligarNoDispositivo(canal, elegiveis, id, ligado),
    });
  };
  const salvar = async () => {
    if (
      ehAdmin &&
      nome.trim() &&
      nome.trim() !== (dispositivo.display_name ? dispositivo.display_name : "")
    )
      await renomear.mutateAsync({ id: dispositivo.id, nome: nome.trim() });
    if (ehAdmin && setorId !== setorAtual)
      await setorDoDispositivo.mutateAsync({
        channel_session_id: dispositivo.id,
        setor_id: setorId || null,
      });
    toast.success(t("As alterações foram salvas."));
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[672px] p-0">
      <div className="flex h-14 items-center border-b border-casca-borda px-5 text-[15px] font-medium text-casca-texto">
        {t("Informações do dispositivo")}
      </div>
      <div className="px-4">
        <AbasDaCasca
          aria-label={t("Seções do dispositivo")}
          valor={aba}
          aoMudar={setAba}
          abas={[
            { valor: "dispositivos", rotulo: t("Dispositivos") },
            { valor: "criacao", rotulo: t("Criação de negócio") },
          ]}
        />
      </div>
      {aba === "criacao" ? (
        <p className="px-6 py-10 text-center text-[13px] text-casca-suave">{t("Em breve")}</p>
      ) : (
        <div className="flex max-h-[520px] flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-4 border-b border-casca-borda pb-5">
            <FotoDaPessoa id={dispositivo.id} nome={nome} tamanho={40} />
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
                {t("Nome do dispositivo")}
                <AjudaDaCasca
                  texto={t(
                    "Esse nome é usado apenas para identificação interna. Não ficará visível para seus contatos.",
                  )}
                />
              </span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={!ehAdmin}
                className="h-8 rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto outline-hidden disabled:opacity-60"
              />
            </label>
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
                <Smartphone size={14} aria-hidden />
                {t("Número conectado")}
              </span>
              <span className="text-[13px] text-casca-suave">
                {formatarTelefone(dispositivo.phone_number)}
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-b border-casca-borda pb-5">
            <span className="text-[13px] font-semibold text-casca-texto">
              {t("Setor de atendimento")}
            </span>
            <span className="flex items-center gap-2">
              <SeletorDaCasca
                aparencia="janela"
                valor={setorId}
                vazio={t("Selecionar setor")}
                opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
                aoMudar={setSetorId}
                desabilitado={!ehAdmin}
                aria-label={t("Setor de atendimento")}
                className="flex-1"
              />
              {setorId && ehAdmin ? (
                <button
                  type="button"
                  aria-label={t("Remover setor")}
                  onClick={() => setSetorId("")}
                  className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
                >
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </span>
            <span className="text-[13px] text-casca-suave">
              {t("Membros do time que estão no setor selecionado terão acesso a esse dispositivo.")}
            </span>
          </div>
          {ehOficial ? (
            <div
              className="flex flex-col gap-3 border-b border-casca-borda pb-5"
              title={t("Em breve")}
            >
              <span className="text-[13px] font-semibold text-casca-texto">
                {t("Indicador de digitação")}
              </span>
              <span className="flex items-center justify-between text-[13px] text-casca-texto">
                {t("Atendente digitando")}
                <InterruptorDaCasca
                  ligado={false}
                  aoMudar={() => undefined}
                  desabilitado
                  aria-label={t("Atendente digitando")}
                  title={t("Em breve")}
                />
              </span>
              <span className="flex items-center justify-between text-[13px] text-casca-texto">
                {t("Agente de IA respondendo")}
                <InterruptorDaCasca
                  ligado={false}
                  aoMudar={() => undefined}
                  desabilitado
                  aria-label={t("Agente de IA respondendo")}
                  title={t("Em breve")}
                />
              </span>
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-casca-texto">
                {t("Atendentes conectados nesse dispositivo")}
              </span>
              <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={t("Buscar por nome ou e-mail")}
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta"
                />
                <Search size={16} aria-hidden className="text-casca-suave" />
              </span>
            </div>
            {!roteamento.data ? (
              <p className="text-[13px] text-casca-suave">
                {roteamento.isError
                  ? t("Confirme a verificação em duas etapas.")
                  : t("Carregando…")}
              </p>
            ) : (
              <>
                <span className="flex items-center justify-between text-[13px] text-casca-texto">
                  {t("Ativar todos")}
                  <InterruptorDaCasca
                    ligado={todosLigados}
                    aoMudar={(v) =>
                      gravarRoteamento.mutate({
                        channel_session_id: dispositivo.id,
                        user_ids: v
                          ? ativarTodosNoDispositivo(elegiveis)
                          : pessoas.filter((p) => p.admin).map((p) => p.id),
                      })
                    }
                    aria-label={t("Ativar todos")}
                  />
                </span>
                <ul className="flex max-h-[288px] flex-col overflow-y-auto">
                  {visiveis.map((p) => (
                    <li
                      key={p.id}
                      className="flex h-12 items-center justify-between border-b border-casca-borda px-1"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-casca-texto">
                          {p.nome}
                        </span>
                        <span className="block truncate text-[13px] text-casca-suave">
                          {p.email}
                        </span>
                      </span>
                      <InterruptorDaCasca
                        ligado={p.admin || ligados.includes(p.id)}
                        desabilitado={p.admin || gravarRoteamento.isPending}
                        title={p.admin ? t("Usuário administrador") : undefined}
                        aoMudar={(v) => mudarPessoa(p.id, v)}
                        aria-label={p.nome}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
      <div className="px-6 pb-4">
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={!ehAdmin || renomear.isPending || setorDoDispositivo.isPending}
            onClick={() => void salvar()}
          >
            {t("Salvar alterações")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    </JanelaDaCasca>
  );
}
