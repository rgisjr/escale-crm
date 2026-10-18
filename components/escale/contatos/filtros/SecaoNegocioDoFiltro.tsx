"use client";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import {
  DONO_COM,
  DONO_SEM,
  ROTULO_DO_STATUS,
  STATUS_DO_FILTRO,
  type FiltrosDeContatos,
  type NegocioDoFiltro,
  type StatusDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { agentOwnerFilter } from "@/lib/kanban/filters";

import { GrupoDoFiltro } from "./PecasDoFiltro";

/**
 * Seção Negócio (Clint `index-A38akjUb`): todos os critérios valem para o MESMO
 * negócio. A etapa só liga com origem escolhida; escolher motivo de perda põe o
 * status em Perdido, como a Clint.
 */
export function SecaoNegocioDoFiltro({
  filtros,
  aoMudar,
  opcoes,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
  opcoes: OpcoesDoFiltro;
}) {
  const t = useT();
  const membros = useAssignableMembers(true);
  const agentes = useAssignableAgents(true);
  const n: NegocioDoFiltro = filtros.negocio ?? {};
  const mudar = (parte: NegocioDoFiltro) => aoMudar({ ...filtros, negocio: { ...n, ...parte } });
  const origensEscolhidas = n.origens ?? [];
  const variasOrigens = origensEscolhidas.length > 1;
  const etapas = opcoes.origens
    .filter((o) => origensEscolhidas.includes(o.id))
    .flatMap((o) =>
      o.etapas.map((e) => ({
        valor: e.id,
        rotulo: variasOrigens ? `${o.nome} › ${e.nome}` : e.nome,
      })),
    );
  const donos = [
    { valor: DONO_SEM, rotulo: t("Sem dono") },
    { valor: DONO_COM, rotulo: t("Todos os donos") },
    ...(membros.data ?? []).map((m) => ({
      valor: m.user_id,
      rotulo: m.full_name ?? t("Sem nome"),
    })),
    ...(agentes.data ?? []).map((a) => ({ valor: agentOwnerFilter(a.agent_id), rotulo: a.name })),
  ];

  return (
    <>
      <GrupoDoFiltro rotulo={t("Com/Sem negócio")}>
        <SeletorDaCasca
          valor={n.tem ?? ""}
          opcoes={[
            { valor: "com", rotulo: t("Com negócio") },
            { valor: "sem", rotulo: t("Sem negócio") },
          ]}
          aoMudar={(v) => mudar({ tem: v || undefined })}
          vazio={t("Com/Sem negócio")}
          aria-label={t("Com/Sem negócio")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Origens")}>
        <SeletorMultiploDaCasca
          valores={origensEscolhidas}
          opcoes={opcoes.origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
          aoMudar={(origens) =>
            mudar({
              origens,
              etapas: (n.etapas ?? []).filter((id) =>
                opcoes.origens.some(
                  (o) => origens.includes(o.id) && o.etapas.some((e) => e.id === id),
                ),
              ),
            })
          }
          aria-label={t("Origens")}
          vazio={t("Com negócio em origens")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Etapa")}>
        <SeletorMultiploDaCasca
          valores={n.etapas ?? []}
          opcoes={etapas}
          aoMudar={(v) => mudar({ etapas: v })}
          aria-label={t("Etapa")}
          vazio={t("Com negócio em etapa")}
          desabilitado={origensEscolhidas.length === 0}
          dica={t("Escolha uma origem antes")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Status")}>
        <SeletorMultiploDaCasca
          valores={n.status ?? []}
          opcoes={STATUS_DO_FILTRO.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS[s]) }))}
          aoMudar={(v) => mudar({ status: v as StatusDoFiltro[] })}
          aria-label={t("Status")}
          vazio={t("Com negócio em status")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Dono do negócio")}>
        <SeletorMultiploDaCasca
          valores={n.donos ?? []}
          opcoes={donos}
          aoMudar={(v) => mudar({ donos: v })}
          aria-label={t("Dono do negócio")}
          vazio={t("Com/Sem dono do negócio")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Motivo de perda")}>
        <SeletorMultiploDaCasca
          valores={n.motivos ?? []}
          opcoes={opcoes.motivos.map((m) => ({ valor: m.valor, rotulo: t(m.rotulo) }))}
          aoMudar={(v) =>
            mudar({ motivos: v, ...(v.length > 0 ? { status: ["lost"] as StatusDoFiltro[] } : {}) })
          }
          aria-label={t("Motivo de perda")}
          vazio={t("Motivo de Perda")}
        />
      </GrupoDoFiltro>
    </>
  );
}
