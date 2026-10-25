"use client";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { useNegocioDaConversa } from "@/hooks/escale/useNegocioDaConversa";
import {
  useGravarPreferencia,
  usePreferenciasDeConversas,
} from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { Loader2, MessageCircle } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../centro/VazioDaCasca";
import { CabecalhoDoContato } from "./CabecalhoDoContato";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";

import { CartaoDoNegocio } from "./CartaoDoNegocio";
import { CartaoPausarAutomacao } from "./CartaoPausarAutomacao";
import { ProximoNegocioDaConversa } from "./ProximoNegocioDaConversa";
import { SecoesDoPainel } from "./SecoesDoPainel";

/** O contato da conversa no formato que a janela de novo negócio da 2A pede. */
function linhaDoContato(c: ConversationWithContact): LinhaDeContato | null {
  const contato = c.contacts;
  if (!contato?.id) return null;
  const { display_name: apelido = null } = contato;
  return {
    id: contato.id,
    nome: nomeDoContato(contato) ?? "",
    display_name: apelido,
    telefone: contato.phone_number ?? null,
    email: null,
    instagram: null,
    tags: contato.tags ?? [],
    tem_foto: Boolean(contato.avatar_storage_path),
    conversa_id: c.id,
    negocios: 0,
    negocio_unico: null,
    status: "ativo",
    ultima_atividade: null,
    criado_em: c.created_at,
    origem: "manual",
    nascimento: null,
    links: {},
  } as LinhaDeContato;
}

/**
 * O PAINEL DIREITO (fork Escale, Fase 3A; D1–D11; c01, c02, c48). Vazio sem
 * conversa; com conversa, "Próximo negócio", o cabeçalho do contato, NEGÓCIOS
 * e as seções. O negócio vem do cache do quadro (N9).
 */
export function PainelDoContato({
  conversa,
  aoAbrirConversa,
  origens,
}: {
  conversa: ConversationWithContact | null;
  aoAbrirConversa: (id: string | null) => void;
  origens: OrigemParaCriar[];
}) {
  const t = useT();
  const contactId = conversa?.contacts?.id ?? conversa?.contact_id ?? null;
  const negocio = useNegocioDaConversa(conversa ? contactId : null);
  const preferencias = usePreferenciasDeConversas();
  const gravar = useGravarPreferencia();

  if (!conversa) {
    return (
      <div className="flex h-full flex-col px-4">
        <ProximoNegocioDaConversa
          lead={null}
          stages={[]}
          leads={[]}
          aoAbrirConversa={aoAbrirConversa}
        />
        <VazioDaCasca
          className="flex-1"
          icone={MessageCircle}
          titulo={t("Nenhuma conversa selecionada")}
          texto={
            <>
              {t("Selecione uma conversa")}
              <br />
              {t("para carregar as")}
              <br />
              {t("informações do contato")}
            </>
          }
        />
      </div>
    );
  }
  if (negocio.erro) {
    return (
      <div className="flex h-full flex-col px-4">
        <ProximoNegocioDaConversa
          lead={null}
          stages={[]}
          leads={[]}
          aoAbrirConversa={aoAbrirConversa}
        />
        <p className="pt-6 text-center text-[14px] text-casca-suave">
          {t("Não foi possível carregar as informações do contato.")}
        </p>
      </div>
    );
  }
  const quadro = negocio.quadro;
  return (
    <div className="flex h-full flex-col overflow-y-auto px-4" data-testid="painel-do-contato">
      <ProximoNegocioDaConversa
        lead={quadro?.lead ?? null}
        stages={quadro?.stages ?? []}
        leads={quadro?.leads ?? []}
        aoAbrirConversa={aoAbrirConversa}
      />
      <CabecalhoDoContato
        conversa={conversa}
        lead={quadro?.lead ?? null}
        pipelineId={quadro?.pipeline.id ?? null}
      />
      {negocio.carregando && !quadro ? (
        <p className="flex items-center gap-2 pb-4 text-[14px] text-casca-suave">
          <Loader2 size={14} aria-hidden className="animate-spin" />
          {t("Carregando…")}
        </p>
      ) : (
        <CartaoDoNegocio
          lead={quadro?.lead ?? null}
          pipeline={quadro?.pipeline ?? null}
          stages={quadro?.stages ?? []}
          negocios={negocio.negocios}
          aoEscolher={negocio.escolher}
          contato={linhaDoContato(conversa)}
          origens={origens}
        />
      )}
      <CartaoPausarAutomacao conversationId={conversa.id} />
      <SecoesDoPainel
        conversa={conversa}
        quadro={quadro}
        secoes={preferencias.data.secoes}
        aoMudarSecoes={(s) => gravar.mutate({ chave: "secoes", valor: s })}
        aoAbrirConversa={aoAbrirConversa}
      />
    </div>
  );
}
