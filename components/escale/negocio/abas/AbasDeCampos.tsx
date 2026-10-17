"use client";
import { useCallback } from "react";
import { toast } from "sonner";

import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";
import type { Pipeline } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { MOEDA_PADRAO } from "@/lib/money";
import { camposVisiveis } from "@/lib/schemas/mostrar-quando";
import type { Lead } from "@/lib/types/leads";
import { Building2, Target, User } from "@/lib/ui/icons-da-casca";

import { CamposDaFicha, ROTA_DE_GERENCIAR_CAMPOS } from "./CamposDaFicha";

/** FORK ESCALE · Fases 1G e 1H (C2, C10, C14): as abas de campos (prints 02 a 04). */

const CHAVE_DO_VALOR = "valor";

export function AbaContato({ lead }: { lead: Lead }) {
  const t = useT();
  const campos: CampoEditavel[] = [
    {
      chave: "nome",
      rotulo: t("Nome"),
      tipo: "text",
      valor: dadosDeFiltro(lead)?.contato_nome?.trim() || null,
    },
    {
      chave: "telefone",
      rotulo: t("Telefone"),
      tipo: "text",
      valor: lead.contact_phone?.trim() || null,
    },
    { chave: "email", rotulo: t("Email"), tipo: "text", valor: lead.contact_email?.trim() || null },
    ...(lead.contact_links ?? []).map((l, i) => ({
      chave: `link-${i}`,
      rotulo: l.tipo,
      tipo: "text" as const,
      valor: l.href,
    })),
  ];
  return (
    <CamposDaFicha
      icone={<User size={16} />}
      titulo={t("Campos de contato")}
      tipo="contato"
      campos={campos}
    />
  );
}

export function AbaEmpresa() {
  const t = useT();
  /** Os oito campos da empresa na Clint (print 03). A empresa do negócio é da Fase 2 (Q2). */
  const campos: CampoEditavel[] = [
    { chave: "Nome da empresa", rotulo: t("Nome da empresa"), tipo: "text", valor: null },
    { chave: "Site", rotulo: t("Site"), tipo: "text", valor: null },
    { chave: "Cidade", rotulo: t("Cidade"), tipo: "text", valor: null },
    { chave: "Estado", rotulo: t("Estado"), tipo: "text", valor: null },
    { chave: "Categoria", rotulo: t("Categoria"), tipo: "text", valor: null },
    { chave: "Segmento", rotulo: t("Segmento"), tipo: "text", valor: null },
    {
      chave: "Número de funcionários",
      rotulo: t("Número de funcionários"),
      tipo: "text",
      valor: null,
    },
    { chave: "CNPJ", rotulo: t("CNPJ"), tipo: "text", valor: null },
  ];
  return (
    <CamposDaFicha
      icone={<Building2 size={16} />}
      titulo={t("Campos de empresa")}
      tipo="empresa"
      campos={campos}
    />
  );
}

/** As definições do CRM (1F-a) como campos editáveis, já sem os condicionais escondidos. */
export function camposDoCrm(pipeline: Pipeline, valores: Record<string, unknown>): CampoEditavel[] {
  const defs = camposDoFunil(pipeline.settings ?? null);
  return camposVisiveis(defs, valores).map((def) => ({
    chave: def.key,
    rotulo: def.label,
    tipo: def.type,
    valor: valores[def.key],
    opcoes: def.options,
  }));
}

export function AbaNegocio({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  const administra = usePermission("settings.write");
  const editar = useEditLead(pipeline.id);
  const moeda = lead.currency ?? MOEDA_PADRAO;
  const campos: CampoEditavel[] = [
    {
      chave: CHAVE_DO_VALOR,
      rotulo: t("Valor"),
      tipo: "currency",
      valor: lead.value_cents == null ? null : lead.value_cents / 100,
    },
    ...camposDoCrm(pipeline, lead.custom_fields ?? {}),
  ];

  const aoSalvar = useCallback(
    async (chave: string, valor: unknown) => {
      // `custom_fields` é mesclado no banco (fn_lead_anotar_campos): vai só a chave que mudou.
      const patch =
        chave === CHAVE_DO_VALOR
          ? { value_cents: valor == null ? null : Math.round(Number(valor) * 100) }
          : { custom_fields: { [chave]: valor } };
      try {
        await editar.mutateAsync({ leadId: lead.id, patch });
        toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [editar, lead.id, t],
  );

  return (
    <CamposDaFicha
      icone={<Target size={16} />}
      titulo={t("Campos de negócio")}
      tipo="negocio"
      campos={campos}
      moeda={moeda}
      aoSalvar={aoSalvar}
      gerenciarHref={administra ? ROTA_DE_GERENCIAR_CAMPOS : null}
    />
  );
}
