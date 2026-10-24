"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useState } from "react";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { rotaDaPaginaCompleta } from "@/lib/escale/ficha-do-contato/regras";
import { ExternalLink, Merge, MessageCircle, MoreVertical, Phone, Plus, StickyNote } from "@/lib/ui/icons-da-casca";

import { NomeDoContato } from "./NomeDoContato";

const ICONE = "grid size-6 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia [&_svg]:size-3.5";
const APAGADO = "grid size-6 place-items-center text-casca-marca opacity-40 [&_svg]:size-3.5";

/**
 * O CABEÇALHO DA JANELA DO CONTATO (fork Escale, Fase 2E; C3; print 2b-10):
 * foto 40px, o nome da empresa em maiúsculas acima do nome, o nome editável, o
 * selo "Possível duplicado", ligar, conversa e nota, e à direita "+ Adicionar
 * negócio" e o ⋮ "Mais" (Q2, nosso) com a página completa do original.
 */
export function CabecalhoDoContato({
  contato,
  empresa,
  conversaId,
  duplicado,
  podeCriarNegocio,
  aoAdicionarNegocio,
  aoRevisarDuplicado,
}: {
  contato: { id: string; nome: string; telefone: string | null };
  empresa: string | null;
  conversaId: string | null;
  duplicado: boolean;
  podeCriarNegocio: boolean;
  aoAdicionarNegocio: () => void;
  aoRevisarDuplicado: () => void;
}) {
  const t = useT();
  const podeAnotar = usePermission("pipeline.move_card");
  const [nota, setNota] = useState(false);
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-[11px]">
        <FotoDaLinha id={contato.id} nome={contato.nome} temFoto tamanho="ficha" />
        <div className="flex flex-col gap-1.5">
          {empresa ? (
            <span className="text-[11px] font-semibold tracking-[0.04em] text-casca-meta uppercase">{empresa}</span>
          ) : null}
          <span className="flex items-center gap-2">
            <NomeDoContato contatoId={contato.id} nome={contato.nome} />
            {duplicado ? (
              <button
                type="button"
                aria-label={t("Possível duplicado")}
                title={t("Possível duplicado. Clique para revisar e unir os dados.")}
                onClick={aoRevisarDuplicado}
                className="flex h-6 items-center gap-1 rounded-full border border-warning bg-warning-bg px-2 text-[11px] font-medium text-casca-texto hover:brightness-95"
              >
                <Merge size={12} aria-hidden className="text-warning" />
                {t("Possível duplicado")}
              </button>
            ) : null}
          </span>
          <span className="flex items-center gap-3">
            {contato.telefone ? (
              <a href={`tel:${contato.telefone}`} aria-label={t("Chamar")} title={t("Chamar")} className={ICONE}>
                <Phone aria-hidden />
              </a>
            ) : (
              <span role="img" aria-label={t("Sem telefone")} title={t("Sem telefone")} className={APAGADO}>
                <Phone aria-hidden />
              </span>
            )}
            {conversaId ? (
              <Link href={`/app/inbox?id=${conversaId}`} aria-label={t("Abrir em Conversas")} title={t("Abrir em Conversas")} className={ICONE}>
                <MessageCircle aria-hidden />
              </Link>
            ) : (
              <span role="img" aria-label={t("Sem conversa")} title={t("Sem conversa")} className={APAGADO}>
                <MessageCircle aria-hidden />
              </span>
            )}
            <button
              type="button"
              aria-label={t("Nova nota")}
              title={podeAnotar ? t("Nova nota") : t("Sem permissão")}
              disabled={!podeAnotar}
              onClick={() => setNota(true)}
              className={podeAnotar ? ICONE : APAGADO}
            >
              <StickyNote aria-hidden />
            </button>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {podeCriarNegocio ? (
          <BotaoDaCasca variante="marca" tamanho="md" onClick={aoAdicionarNegocio} className="h-8 gap-1.5 px-4">
            <Plus size={14} aria-hidden />
            {t("Adicionar negócio")}
          </BotaoDaCasca>
        ) : null}
        <MenuPrimitive.Root>
          <MenuPrimitive.Trigger
            aria-label={t("Mais")}
            className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          >
            <MoreVertical size={16} aria-hidden />
          </MenuPrimitive.Trigger>
          <MenuPrimitive.Portal>
            <MenuPrimitive.Content align="end" className={CAIXA_DO_MENU}>
              <MenuPrimitive.Item asChild className={ITEM_DO_MENU}>
                <Link href={rotaDaPaginaCompleta(contato.id)}>
                  <ExternalLink size={14} aria-hidden />
                  {t("Abrir página completa")}
                </Link>
              </MenuPrimitive.Item>
            </MenuPrimitive.Content>
          </MenuPrimitive.Portal>
        </MenuPrimitive.Root>
      </div>
      <JanelaDeNota alvo={{ tipo: "contato", id: contato.id }} aberta={nota} onFechar={() => setNota(false)} />
    </div>
  );
}
