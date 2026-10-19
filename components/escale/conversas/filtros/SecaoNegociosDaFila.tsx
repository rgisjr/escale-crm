"use client";
import { useT } from "@/hooks/i18n/useT";
import { useGruposDasOrigens } from "@/hooks/escale/useGruposDasOrigens";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import { ROTULO_DO_STATUS } from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  MOTIVO_NAO_INFORMADO,
  PREFIXO_DO_AGENTE,
  SEM_DONO,
  TIPOS_DE_DATA_DO_NEGOCIO,
  type FiltrosDoPainel,
  type NegociosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";

import { CampoDePeriodoDaFila } from "./CampoDePeriodoDaFila";
import { GrupoDaFila } from "./GrupoDaFila";
import { SeletorDoFiltro } from "./SeletorDoFiltro";

const STATUS = ["open", "won", "lost"] as const;

/** Negócios (c76–c80; N6): os critérios valem para o MESMO negócio do contato. */
export function SecaoNegociosDaFila({
  painel,
  aoMudar,
  opcoes,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
  opcoes: OpcoesDoFiltro;
}) {
  const t = useT();
  const { data: membros = [] } = useAssignableMembers(true);
  const { data: agentes = [] } = useAssignableAgents(true);
  const { data: grupos = [] } = useGruposDasOrigens();
  const n: NegociosDoPainel = painel.negocios ?? {};
  const mudar = (parte: Partial<NegociosDoPainel>) =>
    aoMudar({ ...painel, negocios: { ...n, ...parte } });
  const origens = n.origens ?? [];
  const varias = origens.length > 1;
  const etapas = opcoes.origens
    .filter((o) => origens.includes(o.id))
    .flatMap((o) =>
      o.etapas.map((e) => ({ valor: e.id, rotulo: varias ? `${o.nome} › ${e.nome}` : e.nome })),
    );
  const motivos = [
    { valor: MOTIVO_NAO_INFORMADO, rotulo: t("Não informar") },
    ...opcoes.motivos
      .filter((m) => m.valor !== MOTIVO_NAO_INFORMADO)
      .map((m) => ({ valor: m.valor, rotulo: t(m.rotulo) })),
  ];
  const comPerdido = (n.status ?? []).includes("lost");

  return (
    <>
      <GrupoDaFila rotulo={t("Data")}>
        <CampoDePeriodoDaFila
          rotulo={t("Data")}
          tipos={TIPOS_DE_DATA_DO_NEGOCIO}
          valor={n.data ?? null}
          aoMudar={(v) => mudar({ data: v ?? undefined })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Com/sem negócio")}>
        <SeletorDoFiltro
          aria-label={t("Com/sem negócio")}
          multiplo={false}
          valores={n.tem ? [n.tem] : []}
          opcoes={[
            { valor: "com" as const, rotulo: t("Com negócio") },
            { valor: "sem" as const, rotulo: t("Sem negócio") },
          ]}
          aoMudar={(v) => mudar({ tem: v[0] })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio com status")}>
        <SeletorDoFiltro
          aria-label={t("Negócio com status")}
          valores={n.status ?? []}
          opcoes={STATUS.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS[s]) }))}
          aoMudar={(status) =>
            mudar({ status, ...(status.includes("lost") ? {} : { motivos: undefined }) })
          }
        />
      </GrupoDaFila>
      {comPerdido ? (
        <GrupoDaFila rotulo={t("Motivo de Perda")}>
          <SeletorDoFiltro
            aria-label={t("Motivo de Perda")}
            valores={n.motivos ?? []}
            opcoes={motivos}
            aoMudar={(m) => mudar({ motivos: m })}
          />
        </GrupoDaFila>
      ) : null}
      <GrupoDaFila rotulo={t("Dono do negócio")}>
        <SeletorDoFiltro
          aria-label={t("Dono do negócio")}
          valores={n.donos ?? []}
          opcoes={[
            { valor: SEM_DONO, rotulo: t("Sem dono") },
            ...membros.map((m) => ({
              valor: m.user_id,
              rotulo: m.full_name?.trim() || t("Sem nome"),
            })),
            ...agentes.map((a) => ({ valor: `${PREFIXO_DO_AGENTE}${a.agent_id}`, rotulo: a.name })),
          ]}
          aoMudar={(donos) => mudar({ donos })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio nos grupos")}>
        <SeletorDoFiltro
          aria-label={t("Negócio nos grupos")}
          valores={n.grupos ?? []}
          opcoes={grupos.map((g) => ({ valor: g.id, rotulo: g.nome }))}
          aoMudar={(ids) => mudar({ grupos: ids })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio nas origens")}>
        <SeletorDoFiltro
          aria-label={t("Negócio nas origens")}
          valores={origens}
          opcoes={opcoes.origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
          aoMudar={(ids) =>
            mudar({
              origens: ids,
              etapas: (n.etapas ?? []).filter((e) =>
                opcoes.origens.some((o) => ids.includes(o.id) && o.etapas.some((x) => x.id === e)),
              ),
            })
          }
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio nas etapas")}>
        <SeletorDoFiltro
          aria-label={t("Negócio nas etapas")}
          valores={n.etapas ?? []}
          opcoes={etapas}
          aoMudar={(ids) => mudar({ etapas: ids })}
          desabilitado={origens.length === 0}
          dica={t("Selecione uma origem para escolher uma etapa")}
        />
      </GrupoDaFila>
    </>
  );
}
