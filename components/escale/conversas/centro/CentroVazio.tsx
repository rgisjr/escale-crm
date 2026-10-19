"use client";
import { useRouter } from "next/navigation";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { MessagesSquare, Pencil } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "./VazioDaCasca";

const BOTAO = "border border-casca-borda text-casca-texto";

/** O centro sem conversa (c01) e sem canal (provisório, sem print; `component.ChatEmpty.*`). */
export function CentroVazio({ semCanal, aoIniciar }: { semCanal: boolean; aoIniciar: () => void }) {
  const t = useT();
  const router = useRouter();
  if (semCanal) {
    return (
      <VazioDaCasca
        className="h-full"
        icone={MessagesSquare}
        titulo={t("Conecte um canal para começar a conversar")}
        texto={t(
          "Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa.",
        )}
        acao={
          <BotaoDaCasca
            variante="texto"
            tamanho="md"
            className={BOTAO}
            onClick={() => router.push("/app/connections")}
          >
            {t("Conectar um canal")}
          </BotaoDaCasca>
        }
      />
    );
  }
  return (
    <VazioDaCasca
      className="h-full"
      icone={MessagesSquare}
      titulo={t("Envie e receba mensagens dos seus clientes")}
      texto={
        <>
          {t("Use o chat conectado")}
          <br />
          {t("ao CRM e explore novas")}
          <br />
          {t("experiências de atendimento.")}
        </>
      }
      acao={
        <BotaoDaCasca variante="texto" tamanho="md" className={BOTAO} onClick={aoIniciar}>
          <Pencil size={14} aria-hidden />
          {t("Iniciar uma conversa")}
        </BotaoDaCasca>
      }
    />
  );
}
