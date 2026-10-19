"use client";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import {
  AGENTES_MAX,
  MARCAS_DE_CHAMADA,
  MARCAS_DO_OFICIAL,
  MARCAS_NA_TELA,
  ROTULO_DA_MARCA,
  ROTULO_DO_STATUS_DA_FILA,
  SEM_ATENDENTE,
  STATUS_DA_FILA,
  type ConversasDoPainel,
  type FiltrosDoPainel,
  type Marca,
} from "@/lib/escale/conversas/filtros-da-fila";

import { CampoDePeriodoDaFila } from "./CampoDePeriodoDaFila";
import { GrupoDaFila } from "./GrupoDaFila";
import { SeletorDoFiltro } from "./SeletorDoFiltro";

const LOGO_DO_OFICIAL = { provider: "meta_cloud", display_name: null, phone_number: null };

/** Conversas (c32, c65–c70; N4, N5). Atendentes só para gerente e administrador. */
export function SecaoConversasDaFila({
  painel,
  aoMudar,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const veOTime = activeOrg?.role === "admin" || activeOrg?.role === "manager";
  const { data: membros = [] } = useAssignableMembers(veOTime);
  const { data: agentes = [] } = useAssignableAgents(true);
  const { data: setores = [] } = useSetores();
  const c: ConversasDoPainel = painel.conversas ?? {};
  const marcas = c.marcas ?? [];
  const mudar = (parte: Partial<ConversasDoPainel>) =>
    aoMudar({ ...painel, conversas: { ...c, ...parte } });

  return (
    <>
      <ul className="flex flex-col gap-1">
        {MARCAS_NA_TELA.map((m) => {
          const deChamada = (MARCAS_DE_CHAMADA as readonly string[]).includes(m);
          const ligada = !deChamada && marcas.includes(m as Marca);
          return (
            <li
              key={m}
              className="flex h-7 items-center justify-between gap-2 text-[13px] text-casca-texto"
            >
              <span>{t(ROTULO_DA_MARCA[m])}</span>
              <span className="flex items-center gap-2">
                {MARCAS_DO_OFICIAL.includes(m) ? (
                  <ChannelLogo channel={LOGO_DO_OFICIAL as never} size={14} />
                ) : null}
                <InterruptorDaCasca
                  ligado={ligada}
                  desabilitado={deChamada}
                  title={deChamada ? t("Em breve") : undefined}
                  aria-label={t(ROTULO_DA_MARCA[m])}
                  aoMudar={(v) =>
                    mudar({ marcas: v ? [...marcas, m as Marca] : marcas.filter((x) => x !== m) })
                  }
                />
              </span>
            </li>
          );
        })}
      </ul>
      <GrupoDaFila rotulo={t("Data de criação do atendimento")}>
        <CampoDePeriodoDaFila
          rotulo={t("Data de criação do atendimento")}
          valor={c.criadaEm ? { tipo: "criacao", ...c.criadaEm } : null}
          aoMudar={(v) => mudar({ criadaEm: v ? { de: v.de, ate: v.ate } : undefined })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Status da conversa")}>
        <SeletorDoFiltro
          aria-label={t("Status da conversa")}
          valores={c.status ?? []}
          opcoes={STATUS_DA_FILA.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS_DA_FILA[s]) }))}
          aoMudar={(status) => mudar({ status })}
        />
      </GrupoDaFila>
      {veOTime ? (
        <GrupoDaFila rotulo={t("Atendentes")}>
          <SeletorDoFiltro
            aria-label={t("Atendentes")}
            valores={c.atendentes ?? []}
            opcoes={[
              { valor: SEM_ATENDENTE, rotulo: t("Sem atendente") },
              ...membros.map((m) => ({
                valor: m.user_id,
                rotulo: m.full_name?.trim() || t("Sem nome"),
              })),
            ]}
            aoMudar={(atendentes) => mudar({ atendentes })}
          />
        </GrupoDaFila>
      ) : null}
      <GrupoDaFila rotulo={t("Agentes")}>
        <SeletorDoFiltro
          aria-label={t("Agentes")}
          valores={c.agentes ?? []}
          opcoes={agentes.map((a) => ({ valor: a.agent_id, rotulo: a.name }))}
          aoMudar={(ids) => mudar({ agentes: ids })}
          limite={AGENTES_MAX}
          dica={t("Você pode filtrar por até 20 agentes.")}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Setores")}>
        <SeletorDoFiltro
          aria-label={t("Setores")}
          valores={c.setores ?? []}
          opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
          aoMudar={(ids) => mudar({ setores: ids })}
        />
      </GrupoDaFila>
    </>
  );
}
