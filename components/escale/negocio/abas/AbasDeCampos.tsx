"use client";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { usePermission } from "@/hooks/auth/AuthProvider";
import { useContact } from "@/hooks/contacts/useContact";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { useT } from "@/hooks/i18n/useT";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import {
  CHAVE_EMAIL,
  CHAVE_NOME,
  CHAVE_TELEFONE,
  patchDoContato,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";
import type { Pipeline } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { TIPOS_DE_LINK, chaveDoLink, lerLinks } from "@/lib/leads/links-de-contato";
import { MOEDA_PADRAO } from "@/lib/money";
import { camposVisiveis } from "@/lib/schemas/mostrar-quando";
import type { Lead } from "@/lib/types/leads";
import { Building2, Target, User } from "@/lib/ui/icons-da-casca";

import { CamposDaFicha, ROTA_DE_GERENCIAR_CAMPOS } from "./CamposDaFicha";

/** FORK ESCALE · Fases 1G e 1H (C2, C10, C14): as abas de campos (prints 02 a 04). */

const CHAVE_DO_VALOR = "valor";

export function AbaContato({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  if (!lead.contact_id) {
    return (
      <>
        <CamposDaFicha
          icone={<User size={16} />}
          titulo={t("Campos de contato")}
          tipo="contato"
          campos={[]}
        />
        <p className="px-4 text-[13px] text-casca-suave">{t("Este negócio não tem contato.")}</p>
      </>
    );
  }
  return <ContatoEditavel contactId={lead.contact_id} lead={lead} pipeline={pipeline} />;
}

function ContatoEditavel({
  contactId,
  lead,
  pipeline,
}: {
  contactId: string;
  lead: Lead;
  pipeline: Pipeline;
}) {
  const t = useT();
  const administra = usePermission("settings.write");
  const { data } = useContact(contactId);
  const { gravar } = useGravarContato(contactId, pipeline.id);
  const contato = data?.data ?? null;
  const camposDoContato = useMemo(() => contato?.custom_fields ?? {}, [contato]);
  const links = lerLinks(camposDoContato);

  const campos: CampoEditavel[] = [
    {
      chave: CHAVE_NOME,
      rotulo: t("Nome"),
      tipo: "text",
      valor: contato?.name ?? dadosDeFiltro(lead)?.contato_nome ?? null,
    },
    {
      chave: CHAVE_TELEFONE,
      rotulo: t("Telefone"),
      tipo: "phone",
      valor: phoneForDisplay(contato?.phone_number ?? lead.contact_phone) || null,
    },
    {
      chave: CHAVE_EMAIL,
      rotulo: t("Email"),
      tipo: "email",
      valor: contato?.email ?? lead.contact_email ?? null,
    },
    ...TIPOS_DE_LINK.map((tipo) => ({
      chave: chaveDoLink(tipo.id),
      rotulo: t(tipo.rotulo),
      tipo: "url" as const,
      valor: links[tipo.id] ?? null,
    })),
    ...camposDoCrm(pipeline, camposDoContato),
  ];

  const aoSalvar = useCallback(
    async (chave: string, valor: unknown) => {
      // O schema do original não aceita apagar telefone nem e-mail (Q4): explica e não grava.
      if (chave === CHAVE_EMAIL && valor == null) {
        throw new Error(t("Para apagar o e-mail, use a ficha do contato."));
      }
      if (chave === CHAVE_TELEFONE && valor == null) {
        throw new Error(t("Para apagar o telefone, use a ficha do contato."));
      }
      // O PATCH do contato substitui `custom_fields`: o patch já leva o objeto inteiro.
      const patch = patchDoContato({ custom_fields: camposDoContato }, chave, valor);
      if (!patch) return;
      try {
        await gravar(patch);
        toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        // O `useUpdateContact` já mostra o toast do erro da API (showApiError).
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [camposDoContato, gravar, t],
  );

  return (
    <CamposDaFicha
      icone={<User size={16} />}
      titulo={t("Campos de contato")}
      tipo="contato"
      campos={campos}
      aoSalvar={aoSalvar}
      gerenciarHref={administra ? ROTA_DE_GERENCIAR_CAMPOS : null}
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
