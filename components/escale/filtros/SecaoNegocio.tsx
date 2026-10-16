"use client";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { agentOwnerFilter } from "@/lib/kanban/filters";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import { MOEDA_PADRAO, simboloDaMoeda } from "@/lib/money";
import { ROTULO_DO_MOTIVO_CANONICO } from "@/lib/schemas/leads";
import type { Lead } from "@/lib/types/leads";

import { Caixinha, CampoNumerico, RotuloDoGrupo } from "./controles";

const emReais = (centavos: number | undefined) =>
  centavos === undefined ? undefined : centavos / 100;
const emCentavos = (reais: number | undefined) =>
  reais === undefined ? undefined : Math.round(reais * 100);

/** Negócio: dono, data de criação, valor, atrasados e (com perdidos no status) motivo e categoria de perda. */
export function SecaoNegocio({
  filtros,
  onMudar,
  leads,
  settings,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
  settings?: Record<string, unknown>;
}) {
  const t = useT();
  const user = useUser();
  const org = useActiveOrg();
  const { data: membros } = useAssignableMembers(true);
  const { data: agentes } = useAssignableAgents(true);
  const moeda = simboloDaMoeda(org?.currency ?? MOEDA_PADRAO);

  // As opções vêm do que ESTÁ no quadro (a regra do `FilterBar` do original).
  const motivos = useMemo(
    () =>
      [
        ...new Set(
          leads
            .filter((l) => l.status === "lost" && l.lost_reason)
            .map((l) => l.lost_reason as string),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [leads],
  );
  const categorias = useMemo(
    () =>
      [
        ...new Set(
          motivos.map((m) => categoriaDoMotivo(m, settings)).filter((c): c is string => !!c),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [motivos, settings],
  );
  // Só o motivo canônico é traduzido; o do funil é texto que o operador escreveu.
  // A consulta à tabela fechada dentro de `t()` é o desenho que o guarda do espanhol aceita.
  const rotuloDoMotivo = (motivo: string) =>
    Object.prototype.hasOwnProperty.call(ROTULO_DO_MOTIVO_CANONICO, motivo)
      ? t(ROTULO_DO_MOTIVO_CANONICO[motivo as keyof typeof ROTULO_DO_MOTIVO_CANONICO])
      : motivo;

  // As listas crescem com a equipe e com os cards perdidos: `SearchableSelect` mostra a busca
  // a partir de 8 opções. Valor "" = sem filtro.
  const opcoesDoDono = [
    { value: "", label: t("Todos") },
    { value: user.id, label: t("Eu") },
    { value: "unassigned", label: t("Sem responsável") },
    ...(membros ?? [])
      .filter((m) => m.user_id !== user.id)
      .map((m) => ({ value: m.user_id, label: m.full_name ?? t("Sem nome") })),
    ...(agentes ?? []).map((a) => ({ value: agentOwnerFilter(a.agent_id), label: a.name })),
  ];
  const opcoesDeMotivo = [
    { value: "", label: t("Todos") },
    ...motivos.map((m) => ({ value: m, label: rotuloDoMotivo(m) })),
  ];
  const opcoesDeCategoria = [
    { value: "", label: t("Todas") },
    ...categorias.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Dono do negócio")}</RotuloDoGrupo>
        <SearchableSelect
          aria-label={t("Dono do negócio")}
          options={opcoesDoDono}
          value={filtros.dono && filtros.dono !== "any" ? filtros.dono : ""}
          onValueChange={(v) => onMudar({ ...filtros, dono: v || undefined })}
        />
      </div>

      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Data de criação")}</RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            aria-label={t("Criado a partir de")}
            value={filtros.criadoEm?.de ?? ""}
            onChange={(e) =>
              onMudar({
                ...filtros,
                criadoEm: { ...filtros.criadoEm, de: e.target.value || undefined },
              })
            }
            className="h-9"
          />
          <Input
            type="date"
            aria-label={t("Criado até")}
            value={filtros.criadoEm?.ate ?? ""}
            onChange={(e) =>
              onMudar({
                ...filtros,
                criadoEm: { ...filtros.criadoEm, ate: e.target.value || undefined },
              })
            }
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <RotuloDoGrupo
          ajuda={t("Só entram negócios na moeda da organização.")}
        >{`${t("Valor")} (${moeda})`}</RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <CampoNumerico
            key={`vmin:${filtros.valor?.min ?? ""}`}
            rotulo={t("Mínimo")}
            valor={emReais(filtros.valor?.min)}
            onMudar={(v) =>
              onMudar({ ...filtros, valor: { ...filtros.valor, min: emCentavos(v) } })
            }
          />
          <CampoNumerico
            key={`vmax:${filtros.valor?.max ?? ""}`}
            rotulo={t("Máximo")}
            valor={emReais(filtros.valor?.max)}
            onMudar={(v) =>
              onMudar({ ...filtros, valor: { ...filtros.valor, max: emCentavos(v) } })
            }
          />
        </div>
      </div>

      <Caixinha
        marcada={!!filtros.atrasados}
        onMudar={(m) => onMudar({ ...filtros, atrasados: m || undefined })}
      >
        {t("Apenas atrasados")}
      </Caixinha>

      {filtros.status.includes("lost") && motivos.length > 0 ? (
        <div className="space-y-2">
          <RotuloDoGrupo>{t("Motivo de perda")}</RotuloDoGrupo>
          <SearchableSelect
            aria-label={t("Motivo de perda")}
            options={opcoesDeMotivo}
            value={filtros.motivoDePerda ?? ""}
            onValueChange={(v) => onMudar({ ...filtros, motivoDePerda: v || undefined })}
          />
          {categorias.length > 0 ? (
            <SearchableSelect
              aria-label={t("Categoria de perda")}
              options={opcoesDeCategoria}
              value={filtros.categoriaDePerda ?? ""}
              onValueChange={(v) => onMudar({ ...filtros, categoriaDePerda: v || undefined })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
