"use client";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { EditorDeCampo } from "@/components/escale/negocio/abas/EditorDeCampo";
import { TagsDaFicha } from "@/components/escale/negocio/TagsDaFicha";
import { useContact } from "@/hooks/contacts/useContact";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import {
  CHAVE_EMAIL,
  CHAVE_NOME,
  CHAVE_TELEFONE,
  patchDoContato,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";
import { TIPOS_DE_LINK, chaveDoLink, lerLinks } from "@/lib/leads/links-de-contato";
import { InstagramLogo } from "@/lib/ui/icons";

import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";
import { CampoDaSecao } from "./CampoDaSecao";

/** A seção Contato (c14): Nome, Email, Telefone, Instagram e Tags, editáveis como na ficha (1H). */
export function SecaoContato({
  conversa,
  quadro,
  aoVoltar,
}: {
  conversa: ConversationWithContact;
  quadro: QuadroDoNegocio | null;
  aoVoltar: () => void;
}) {
  const t = useT();
  const contactId = conversa.contacts?.id ?? conversa.contact_id;
  const { data, isError } = useContact(contactId);
  const { gravar } = useGravarContato(contactId, quadro?.pipeline.id ?? "");
  const contato = data?.data ?? null;
  const links = useMemo(() => lerLinks(contato?.custom_fields ?? {}), [contato?.custom_fields]);
  const instagram = TIPOS_DE_LINK.find((l) => l.id === "instagram");

  const campos: CampoEditavel[] = [
    {
      chave: CHAVE_NOME,
      origem: "coluna",
      rotulo: t("Nome"),
      tipo: "text",
      valor: nomeDoContato(contato ?? conversa.contacts),
    },
    {
      chave: CHAVE_EMAIL,
      origem: "coluna",
      rotulo: t("Email"),
      tipo: "email",
      valor: contato?.email ?? null,
    },
    {
      chave: CHAVE_TELEFONE,
      origem: "coluna",
      rotulo: t("Telefone"),
      tipo: "phone",
      valor:
        phoneForDisplay(contato?.phone_number ?? conversa.contacts?.phone_number ?? null) || null,
    },
    ...(instagram
      ? [
          {
            chave: chaveDoLink(instagram.id),
            origem: "link" as const,
            rotulo: t("Instagram"),
            tipo: "url" as const,
            valor: links[instagram.id] ?? null,
          },
        ]
      : []),
  ];

  const aoSalvar = useCallback(
    async (campo: CampoEditavel, valor: unknown) => {
      if (!contato) throw new Error(t("Não consegui carregar o contato."));
      if (
        campo.origem === "coluna" &&
        (campo.chave === CHAVE_EMAIL || campo.chave === CHAVE_TELEFONE) &&
        valor == null
      ) {
        throw new Error(t("Para apagar, use a ficha do contato."));
      }
      try {
        const enviou = await gravar((atual) => patchDoContato(atual, campo, valor));
        if (enviou) toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [contato, gravar, t],
  );

  return (
    <SecaoAberta titulo={t("Contato")} icone={ICONE_DA_SECAO.contato} aoVoltar={aoVoltar}>
      {isError ? (
        <p className="text-[14px] text-casca-suave">{t("Não consegui carregar o contato.")}</p>
      ) : null}
      {campos.map((c) => (
        <CampoDaSecao
          key={c.chave}
          rotulo={
            c.chave === chaveDoLink("instagram") ? (
              <span className="flex items-center gap-1">
                <InstagramLogo size={14} aria-hidden className="text-casca-marca" />
                {c.rotulo}
              </span>
            ) : (
              c.rotulo
            )
          }
        >
          {contato ? (
            <EditorDeCampo campo={c} aoSalvar={(valor) => aoSalvar(c, valor)} />
          ) : (
            <input
              readOnly
              value={String(c.valor ?? "")}
              aria-label={c.rotulo}
              placeholder={t("Clique aqui para adicionar")}
              className="h-9 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[15px] text-casca-texto placeholder:text-casca-meta"
            />
          )}
        </CampoDaSecao>
      ))}
      <CampoDaSecao rotulo={t("Tags")}>
        {quadro ? (
          <TagsDaFicha
            key={`tags-${quadro.lead.id}`}
            lead={quadro.lead}
            pipelineId={quadro.pipeline.id}
          />
        ) : (
          <p className="text-[14px] text-casca-meta">
            {(contato?.tags ?? []).join(" · ") || t("Sem tag")}
          </p>
        )}
      </CampoDaSecao>
    </SecaoAberta>
  );
}
