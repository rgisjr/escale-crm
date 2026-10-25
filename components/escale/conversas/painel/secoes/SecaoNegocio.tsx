"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { EditorDeCampo } from "@/components/escale/negocio/abas/EditorDeCampo";
import { DonoDaFicha } from "@/components/escale/negocio/DonoDaFicha";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { usePermission } from "@/hooks/auth/AuthProvider";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import {
  useGravarPreferencia,
  usePreferenciasDeConversas,
} from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useMoveCard } from "@/hooks/kanban/useMoveCard";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import {
  PREFIXO_CRM,
  ROTULO_DO_CAMPO_BASICO,
  type CampoBasico,
} from "@/lib/escale/conversas/campos-do-cartao";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";
import { rotaDoNegocio } from "@/lib/escale/negocio/regras";
import { resolveLeadOwner } from "@/lib/kanban/owner";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { camposVisiveis } from "@/lib/schemas/mostrar-quando";
import { ExternalLink, SlidersHorizontal } from "@/lib/ui/icons-da-casca";

import { JanelaPersonalizarCampos } from "../JanelaPersonalizarCampos";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";
import { CampoDaSecao } from "./CampoDaSecao";

const STATUS = ["open", "won", "lost"] as const;
const ROTULO_DO_STATUS: Record<(typeof STATUS)[number], string> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

/** A seção Negócio (c17): os campos na ordem da pessoa (D7), editáveis; ⚙ abre "Personalizar campos". */
export function SecaoNegocio({
  quadro,
  aoVoltar,
}: {
  quadro: QuadroDoNegocio;
  aoVoltar: () => void;
}) {
  const t = useT();
  const { lead, pipeline, stages } = quadro;
  const pode = usePermission("pipeline.move_card");
  const editar = useEditLead(pipeline.id);
  const mover = useMoveCard(pipeline.id);
  const { data: membros } = useAssignableMembers(true);
  const prefs = usePreferenciasDeConversas();
  const gravar = useGravarPreferencia();
  const [personalizando, setPersonalizando] = useState(false);
  const campos = prefs.data.campos_do_negocio;
  const defs = useMemo(() => camposDoFunil(pipeline.settings ?? null), [pipeline.settings]);
  const visiveis = useMemo(
    () => camposVisiveis(defs, lead.custom_fields ?? {}),
    [defs, lead.custom_fields],
  );
  const dono = resolveLeadOwner(
    lead,
    new Map((membros ?? []).map((m) => [m.user_id, m.full_name])),
  );
  const abertas = stages
    .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
    .sort((a, b) => a.position - b.position);

  const salvarCampo = useCallback(
    async (campo: CampoEditavel, valor: unknown) => {
      const patch =
        campo.chave === "valor"
          ? { value_cents: valor == null ? null : Math.round(Number(valor) * 100) }
          : { custom_fields: { [campo.chave]: valor } };
      try {
        await editar.mutateAsync({ leadId: lead.id, patch });
        toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [editar, lead.id, t],
  );

  const basico = (chave: CampoBasico) => {
    switch (chave) {
      case "origem":
        return (
          <input
            readOnly
            value={pipeline.name}
            aria-label={t("Origem")}
            className="h-9 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[15px] text-casca-texto"
          />
        );
      case "etapa":
        return (
          <SeletorDaCasca
            aparencia="janela"
            valor={lead.stage_id}
            opcoes={abertas.map((s) => ({ valor: s.id, rotulo: s.name }))}
            aria-label={t("Etapa")}
            desabilitado={!pode || lead.status !== "open" || mover.isPending}
            dica={lead.status !== "open" ? t("Reabra o negócio para mudar a etapa.") : undefined}
            buscaAPartirDe={99}
            aoMudar={(id) => {
              if (id && id !== lead.stage_id)
                mover.mutate({
                  leadId: lead.id,
                  stageId: id,
                  positionInStage: 0,
                  expectedUpdatedAt: lead.updated_at,
                });
            }}
          />
        );
      case "dono":
        return (
          <div className="flex h-9 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3 text-[15px] text-casca-texto">
            <DonoDaFicha
              key={`dono-${lead.id}`}
              lead={lead}
              pipelineId={pipeline.id}
              settings={pipeline.settings}
            />
            <span className="truncate">{dono.name ?? t("Sem responsável")}</span>
          </div>
        );
      case "valor":
        return (
          <EditorDeCampo
            campo={{
              chave: "valor",
              origem: "coluna",
              rotulo: t("Valor do negócio"),
              tipo: "currency",
              valor: lead.value_cents == null ? null : lead.value_cents / 100,
            }}
            moeda={lead.currency ?? "BRL"}
            aoSalvar={(v) =>
              salvarCampo(
                { chave: "valor", origem: "coluna", rotulo: "", tipo: "currency", valor: null },
                v,
              )
            }
          />
        );
      case "status":
        return (
          <SeletorDaCasca
            aparencia="janela"
            valor={lead.status}
            opcoes={STATUS.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS[s]) }))}
            aria-label={t("Status")}
            desabilitado
            buscaAPartirDe={99}
            dica={t("Use os botões do cartão para mudar o status.")}
            aoMudar={() => undefined}
          />
        );
    }
  };

  return (
    <SecaoAberta
      titulo={t("Negócio")}
      icone={ICONE_DA_SECAO.negocio}
      aoVoltar={aoVoltar}
      direita={
        <button
          type="button"
          aria-label={t("Personalizar campos")}
          title={t("Personalizar campos")}
          onClick={() => setPersonalizando(true)}
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <SlidersHorizontal size={14} aria-hidden />
        </button>
      }
    >
      {campos.map((chave) => {
        if ((["origem", "etapa", "dono", "valor", "status"] as string[]).includes(chave)) {
          return (
            <CampoDaSecao key={chave} rotulo={t(ROTULO_DO_CAMPO_BASICO[chave as CampoBasico])}>
              {basico(chave as CampoBasico)}
            </CampoDaSecao>
          );
        }
        const def = visiveis.find((d) => `${PREFIXO_CRM}${d.key}` === chave);
        if (!def) return null;
        const campo: CampoEditavel = {
          chave: def.key,
          origem: "crm",
          rotulo: def.label,
          tipo: def.type,
          valor: (lead.custom_fields ?? {})[def.key],
          opcoes: def.options,
        };
        return (
          <CampoDaSecao key={chave} rotulo={def.label}>
            <EditorDeCampo
              campo={campo}
              moeda={lead.currency ?? "BRL"}
              aoSalvar={(v) => salvarCampo(campo, v)}
            />
          </CampoDaSecao>
        );
      })}
      {campos.length === 0 ? (
        <p className="text-[14px] text-casca-suave">
          {t(
            "Todos os campos estão ocultos. Use o botão de personalizar para exibi-los novamente.",
          )}
        </p>
      ) : null}
      <Link
        href={rotaDoNegocio(lead.id, "", {})}
        className="flex items-center gap-1 pt-1 text-[14px] text-casca-marca hover:underline"
      >
        {t("Ir para negócio")}
        <ExternalLink size={12} aria-hidden />
      </Link>
      <JanelaPersonalizarCampos
        aberta={personalizando}
        aoFechar={() => setPersonalizando(false)}
        pipeline={pipeline}
        campos={campos}
        aoSalvar={(lista) => gravar.mutate({ chave: "campos_do_negocio", valor: lista })}
      />
    </SecaoAberta>
  );
}
