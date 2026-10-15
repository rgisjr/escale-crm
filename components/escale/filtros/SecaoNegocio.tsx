"use client";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
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

import { Caixinha, CampoNumerico, RotuloDoGrupo, classeDoSeletor } from "./controles";

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

  // As opções são montadas aqui, fora da caixa de seleção, porque os testes do painel exigem
  // a caixa nativa (combobox com `selectOptions`), e não o `SearchableSelect`.
  const opcoesDeMembro = (membros ?? [])
    .filter((m) => m.user_id !== user.id)
    .map((m) => (
      <option key={m.user_id} value={m.user_id}>
        {m.full_name ?? t("Sem nome")}
      </option>
    ));
  const opcoesDeAgente = (agentes ?? []).map((a) => (
    <option key={a.agent_id} value={agentOwnerFilter(a.agent_id)}>
      {a.name}
    </option>
  ));
  const opcoesDeMotivo = motivos.map((m) => (
    <option key={m} value={m}>
      {rotuloDoMotivo(m)}
    </option>
  ));
  const opcoesDeCategoria = categorias.map((c) => (
    <option key={c} value={c}>
      {c}
    </option>
  ));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Dono do negócio")}</RotuloDoGrupo>
        <select
          aria-label={t("Dono do negócio")}
          className={classeDoSeletor}
          value={filtros.dono && filtros.dono !== "any" ? filtros.dono : ""}
          onChange={(e) => onMudar({ ...filtros, dono: e.target.value || undefined })}
        >
          <option value="">{t("Todos")}</option>
          <option value={user.id}>{t("Eu")}</option>
          <option value="unassigned">{t("Sem responsável")}</option>
          {opcoesDeMembro}
          {opcoesDeAgente}
        </select>
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
          <select
            aria-label={t("Motivo de perda")}
            className={classeDoSeletor}
            value={filtros.motivoDePerda ?? ""}
            onChange={(e) => onMudar({ ...filtros, motivoDePerda: e.target.value || undefined })}
          >
            <option value="">{t("Todos")}</option>
            {opcoesDeMotivo}
          </select>
          {categorias.length > 0 ? (
            <select
              aria-label={t("Categoria de perda")}
              className={classeDoSeletor}
              value={filtros.categoriaDePerda ?? ""}
              onChange={(e) =>
                onMudar({ ...filtros, categoriaDePerda: e.target.value || undefined })
              }
            >
              <option value="">{t("Todas")}</option>
              {opcoesDeCategoria}
            </select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
