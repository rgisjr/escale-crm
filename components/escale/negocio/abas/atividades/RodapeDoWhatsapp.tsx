"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CelularDesligado, IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useEnviarAtividade } from "@/hooks/escale/useEnviarAtividade";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  dispositivoDeEnvio,
  linkDoAppWhatsapp,
  linkDoWhatsappWeb,
  type AtividadeDoNegocio,
} from "@/lib/escale/negocio/atividades";
import { estaEncerrada } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";
import { ChevronDown, Smartphone } from "@/lib/ui/icons-da-casca";

import { JanelaDeOutroAtendente } from "./JanelaDeOutroAtendente";

/**
 * O RODAPÉ DO WHATSAPP (fork Escale, Fase 1I; print 017, P14, P15).
 * "Enviar mensagem" (clique ou Enter: envia na hora) com o ▾ (o ▾: "Alterar dispositivo" em breve, "Abrir em
 * Conversas", "Abrir no WhatsApp Web", "Abrir no aplicativo WhatsApp") e o
 * celular, que diz por qual canal sai a mensagem ou por que não sai.
 */
export function RodapeDoWhatsapp({
  lead,
  atividade,
  texto,
  alternar,
}: {
  lead: Lead;
  atividade: AtividadeDoNegocio;
  texto: string;
  alternar: (a: AtividadeDoNegocio) => Promise<unknown>;
}) {
  const t = useT();
  const router = useRouter();
  const { data: sessoes } = useChannelSessions();
  const { data: membros } = useAssignableMembers(true);
  const dispositivo = dispositivoDeEnvio(sessoes ?? []);
  const { enviar, enviando, conversaDoContato } = useEnviarAtividade(
    lead,
    alternar,
    dispositivo.tipo === "conectado" ? dispositivo.sessaoId : undefined,
  );
  const [outro, setOutro] = useState<{ conversaId: string; atendenteId: string } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);

  // Resposta de 17/10 (Q7): Enter envia na hora, como o clique. O detalhe remonta a cada
  // atividade escolhida; o foco vai para "Enviar mensagem", e o Enter do botão envia.
  // Só rouba o foco se ninguém está digitando em outro campo e a atividade ainda está pendente.
  useEffect(() => {
    const livre = !document.activeElement || document.activeElement === document.body;
    if (livre && !estaEncerrada(atividade)) botao.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem: o detalhe remonta a cada atividade
  }, []);

  const sessao =
    dispositivo.tipo === "conectado"
      ? (sessoes ?? []).find((s) => s.id === dispositivo.sessaoId)
      : undefined;
  const telefone = lead.contact_phone ?? "";
  const semDispositivo =
    dispositivo.tipo === "nenhum"
      ? t("Você não possui um dispositivo vinculado!")
      : dispositivo.tipo === "desconectado"
        ? t("Seu dispositivo está desconectado!")
        : null;
  const motivo = !lead.contact_id
    ? t("Este negócio não tem contato.")
    : (semDispositivo ?? (!texto.trim() ? t("Nenhuma mensagem adicionada") : null));
  const nomeDoAtendente = (id: string | undefined) =>
    (membros ?? []).find((m) => m.user_id === id)?.full_name ?? t("Sem nome");

  const executar = async (assumir?: { conversaId: string; atendenteId: string }) => {
    try {
      const r = await enviar(atividade, texto, assumir);
      if (r.tipo === "outro-atendente") {
        setOutro({ conversaId: r.conversaId, atendenteId: r.atendenteId });
        return;
      }
      setOutro(null);
      if (!r.concluida) {
        toast.error(t("Mensagem enviada, mas não consegui concluir a atividade."));
        return;
      }
      toast.success(
        r.assumiu
          ? t("Atendimento assumido e mensagem enviada com sucesso!")
          : t("A atividade foi realizada com sucesso!"),
      );
    } catch {
      toast.error(t("Não consegui enviar a mensagem. Tente de novo."));
    }
  };

  const abrirEmConversas = async () => {
    try {
      router.push(`/app/inbox?id=${await conversaDoContato()}`);
    } catch {
      toast.error(t("Não consegui enviar a mensagem. Tente de novo."));
    }
  };

  return (
    <>
      <span className="inline-flex">
        <button
          ref={botao}
          type="button"
          disabled={!!motivo || enviando}
          title={motivo ?? undefined}
          onClick={() => void executar()}
          className="flex h-[38px] items-center gap-2 rounded-l-[4px] bg-casca-marca px-4 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconeDoTipo tipo="whatsapp" tamanho={18} />
          {enviando ? t("Enviando…") : t("Enviar mensagem")}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("Mais opções de envio")}
              className="grid h-[38px] w-9 place-items-center rounded-r-[4px] border-l border-white/40 bg-casca-marca text-white hover:bg-casca-marca-forte"
            >
              <ChevronDown size={16} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={CAIXA_DO_MENU}>
            <DropdownMenuItem disabled title={t("Em breve")} className={ITEM_DO_MENU}>
              {t("Alterar dispositivo")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!lead.contact_id}
              className={ITEM_DO_MENU}
              onSelect={() => void abrirEmConversas()}
            >
              {t("Abrir em Conversas")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!telefone}
              className={ITEM_DO_MENU}
              onSelect={() => window.open(linkDoWhatsappWeb(telefone, texto), "_blank", "noopener")}
            >
              {t("Abrir no WhatsApp Web")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!telefone}
              className={ITEM_DO_MENU}
              onSelect={() => {
                window.location.href = linkDoAppWhatsapp(telefone, texto);
              }}
            >
              {t("Abrir no aplicativo WhatsApp")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
      <DicaEscura
        texto={
          dispositivo.tipo === "conectado"
            ? `${t("Você está enviando com o dispositivo:")} ${sessao ? channelLabel(sessao, t) : ""}`
            : (semDispositivo ?? "")
        }
      >
        <span
          role="img"
          aria-label={t("Dispositivo")}
          className={dispositivo.tipo === "conectado" ? "text-casca-marca" : "text-casca-alerta"}
        >
          {dispositivo.tipo === "conectado" ? (
            <Smartphone size={20} aria-hidden />
          ) : (
            <CelularDesligado />
          )}
        </span>
      </DicaEscura>
      <JanelaDeOutroAtendente
        aberta={outro !== null}
        nome={nomeDoAtendente(outro?.atendenteId)}
        aoCancelar={() => setOutro(null)}
        aoConfirmar={() => outro && void executar(outro)}
      />
    </>
  );
}
