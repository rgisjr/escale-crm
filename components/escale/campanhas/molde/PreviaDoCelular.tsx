"use client";
import { useT } from "@/hooks/i18n/useT";
import type { ParteDaMensagem } from "@/lib/escale/campanhas/detalhe/mensagem";
import {
  ArrowLeft,
  BatteryFull,
  CheckCheck,
  EllipsisVertical,
  Phone,
  Signal,
  Video,
  Wifi,
} from "@/lib/ui/icons-da-casca";

/**
 * A PRÉVIA DO CELULAR (fork Escale, Fase 8C; 009): moldura preta, a barra de
 * status, o cabeçalho verde do WhatsApp com a conta e "online", o fundo bege e
 * o balão com as variáveis em chip na cor da marca, a hora e o duplo visto.
 * Só leitura; o assistente (8B) usa a mesma.
 */
export function PreviaDoCelular({
  nomeDaConta,
  partes,
  hora,
  vazio,
}: {
  nomeDaConta: string;
  partes: readonly ParteDaMensagem[];
  hora: string;
  vazio?: string;
}) {
  const t = useT();
  const inicial = nomeDaConta.trim().charAt(0).toUpperCase() || "?";
  return (
    <figure
      aria-label={t("Prévia da mensagem")}
      className="mx-auto flex h-[640px] w-[340px] flex-col overflow-hidden rounded-[44px] border-[12px] border-(--escale-zap-moldura) bg-(--escale-zap-fundo)"
    >
      <div className="flex items-center justify-between bg-(--escale-zap-cabeca) px-5 pt-3 pb-1 text-[12px] font-semibold text-white">
        <span>{hora}</span>
        <span aria-hidden className="flex items-center gap-1">
          <Signal size={12} />
          <Wifi size={12} />
          <BatteryFull size={14} />
        </span>
      </div>
      <div className="flex items-center gap-2 bg-(--escale-zap-cabeca) px-3 pb-2.5 text-white">
        <ArrowLeft size={18} aria-hidden />
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-(--escale-zap-avatar) text-[13px] font-semibold"
        >
          {inicial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{nomeDaConta}</span>
          <span className="block text-[11px]">{t("online")}</span>
        </span>
        <Video size={18} aria-hidden />
        <Phone size={16} aria-hidden />
        <EllipsisVertical size={18} aria-hidden />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {partes.length === 0 ? (
          <p className="pt-6 text-center text-[12px] text-casca-suave">
            {vazio ?? t("Sem mensagem")}
          </p>
        ) : (
          <div
            data-balao
            className="max-w-[85%] rounded-[8px] bg-(--escale-zap-balao) p-2.5 text-[13px] leading-5 whitespace-pre-wrap text-casca-texto shadow-[0_1px_1px_rgb(0_0_0/0.08)]"
          >
            {partes.map((p, i) =>
              p.tipo === "texto" ? (
                <span key={i}>{p.texto}</span>
              ) : (
                <span
                  key={i}
                  data-variavel={p.chave}
                  className="rounded-[4px] bg-casca-marca-suave px-1 font-medium text-casca-marca"
                >
                  {p.traduzivel ? t(p.rotulo) : p.rotulo}
                </span>
              ),
            )}
            <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-casca-suave">
              {hora}
              <CheckCheck size={14} aria-hidden className="text-(--escale-zap-visto)" />
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
