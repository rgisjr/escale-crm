"use client";

import { useT } from "@/hooks/i18n/useT";
import type { DadosDaAcao } from "@/lib/automation/desenho-da-regra";
import { ExternalLink, Paperclip } from "@/lib/ui/icons-da-casca";

/** O CORPO DO NÓ DO PASSO INSTAGRAM (fork Escale, Fase 10B): o balão da mensagem e os botões de link. */
export function CorpoDoInstagram({ dados }: { dados: DadosDaAcao }) {
  const t = useT();
  const { config } = dados.acao;
  const texto = typeof config.texto === "string" ? config.texto.trim() : "";
  const botoes = Array.isArray(config.botoes) ? (config.botoes as Array<{ titulo?: unknown }>) : [];
  const anexo = config.anexo as { nome?: unknown; url?: unknown } | null | undefined;
  return (
    <div className="flex flex-col gap-2">
      <p className="line-clamp-4 rounded-lg border border-casca-divisoria px-3 py-2 text-[12px] whitespace-pre-wrap text-casca-texto">
        {texto || t("Escreva a mensagem")}
      </p>
      {anexo ? (
        <span className="flex items-center gap-1.5 text-[12px] text-casca-texto-2">
          <Paperclip size={12} aria-hidden />
          {typeof anexo.nome === "string" && anexo.nome ? anexo.nome : String(anexo.url ?? "")}
        </span>
      ) : null}
      {botoes.map((b, i) => (
        <span
          key={i}
          className="flex items-center justify-center gap-1 rounded-md border border-casca-divisoria px-2 py-1 text-center text-[12px] text-casca-texto"
        >
          <ExternalLink size={11} aria-hidden />
          {typeof b.titulo === "string" && b.titulo ? b.titulo : "—"}
        </span>
      ))}
    </div>
  );
}
