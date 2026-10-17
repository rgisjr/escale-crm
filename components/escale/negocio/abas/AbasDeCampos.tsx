"use client";
import type { CustomFieldDef } from "@/components/contacts/CustomFieldsEditor";
import { useT } from "@/hooks/i18n/useT";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import type { Pipeline } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { formatValorDoNegocio, MOEDA_PADRAO } from "@/lib/money";
import type { Lead } from "@/lib/types/leads";
import { Building2, Target, User } from "@/lib/ui/icons-da-casca";

import { CamposDaFicha, type CampoDaFicha } from "./CamposDaFicha";

/** FORK ESCALE · Fase 1G (C2): as abas de campos com o que existe hoje (prints 02 a 04). */

export function AbaContato({ lead }: { lead: Lead }) {
  const t = useT();
  const campos: CampoDaFicha[] = [
    { chave: "nome", rotulo: t("Nome"), valor: dadosDeFiltro(lead)?.contato_nome?.trim() || null },
    { chave: "telefone", rotulo: t("Telefone"), valor: lead.contact_phone?.trim() || null },
    { chave: "email", rotulo: t("Email"), valor: lead.contact_email?.trim() || null },
    ...(lead.contact_links ?? []).map((l, i) => ({
      chave: `link-${i}`,
      rotulo: l.tipo,
      valor: l.href,
    })),
  ];
  return (
    <CamposDaFicha icone={<User size={16} />} titulo={t("Campos de contato")} campos={campos} />
  );
}

/** Os oito campos da empresa na Clint (print 03). A empresa do negócio é da 1H (C12, Q6). */
const CAMPOS_DA_EMPRESA = [
  "Nome da empresa",
  "Site",
  "Cidade",
  "Estado",
  "Categoria",
  "Segmento",
  "Número de funcionários",
  "CNPJ",
] as const;

export function AbaEmpresa() {
  const t = useT();
  const campos = CAMPOS_DA_EMPRESA.map((rotulo) => ({
    chave: rotulo,
    rotulo: t(rotulo),
    valor: null,
  }));
  return (
    <CamposDaFicha
      icone={<Building2 size={16} />}
      titulo={t("Campos de empresa")}
      campos={campos}
    />
  );
}

export function AbaNegocio({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  const valor =
    lead.value_cents == null
      ? null
      : formatValorDoNegocio(lead.value_cents, lead.currency ?? MOEDA_PADRAO, {
          semCentavos: true,
        });
  const campos: CampoDaFicha[] = [
    { chave: "valor", rotulo: t("Valor"), valor },
    ...camposDoFunil(pipeline.settings ?? null).map((def) => ({
      chave: def.key,
      rotulo: def.label,
      valor: paraLeitura(def, lead.custom_fields?.[def.key], t),
      lista: def.type === "select" || def.type === "multiselect",
    })),
  ];
  return (
    <CamposDaFicha icone={<Target size={16} />} titulo={t("Campos de negócio")} campos={campos} />
  );
}

/** O valor gravado como texto de leitura, no formato brasileiro (datas dd/mm/aaaa). */
function paraLeitura(def: CustomFieldDef, bruto: unknown, t: (s: string) => string): string | null {
  if (bruto === null || bruto === undefined || bruto === "") return null;
  if (def.type === "boolean") return bruto ? t("Sim") : t("Não");
  const rotuloDa = (v: unknown) => def.options?.find((o) => o.value === v)?.label ?? String(v);
  if (def.type === "select") return rotuloDa(bruto);
  if (def.type === "multiselect" && Array.isArray(bruto))
    return bruto.map(rotuloDa).join(", ") || null;
  if (def.type === "date" && typeof bruto === "string") {
    const [a, m, d] = bruto.slice(0, 10).split("-");
    return a && m && d ? `${d}/${m}/${a}` : bruto;
  }
  return String(bruto);
}
