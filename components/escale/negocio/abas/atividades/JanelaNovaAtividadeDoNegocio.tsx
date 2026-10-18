"use client";
import { useState } from "react";
import { toast } from "sonner";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { dataNoPassado, type NovaAtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import {
  EXEMPLO_DO_TITULO,
  ROTULO_DO_TIPO,
  TIPOS_DE_ATIVIDADE,
  type TipoDeAtividade,
} from "@/lib/escale/playbook/regras";
import { LayoutPanelLeft } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * "NOVA ATIVIDADE" NA FICHA (fork Escale, Fase 1I; print 002, P16): a janela
 * estreita da Clint, sem os cartões de visibilidade (a atividade é padrão):
 * título, tipo e "Data e hora da atividade". "Continuar" CRIA direto, como a
 * Clint (`deal_activity_create`), na etapa que está sendo vista.
 */
export function JanelaNovaAtividadeDoNegocio({
  aberta,
  etapa,
  aoFechar,
  aoCriar,
}: {
  aberta: boolean;
  etapa: { id: string; name: string };
  aoFechar: () => void;
  aoCriar: (nova: NovaAtividadeDoNegocio) => Promise<unknown>;
}) {
  const t = useT();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDeAtividade>("whatsapp");
  const [quando, setQuando] = useState(() => new Date());
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const continuar = async () => {
    if (!titulo.trim()) {
      setErro(t("Campo obrigatório*"));
      return;
    }
    if (dataNoPassado(quando)) {
      setErro(t("A data informada não pode ser no passado. Por favor, selecione uma data futura."));
      return;
    }
    setEnviando(true);
    try {
      await aoCriar({
        titulo: titulo.trim(),
        tipo,
        due_date: quando.toISOString(),
        stage_id: etapa.id,
      });
      aoFechar();
    } catch {
      toast.error(t("Erro ao adicionar atividade. Tente novamente."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(92vw,720px)] gap-0 p-0">
      <div className="border-b border-casca-borda px-6 py-5">
        <DialogTitle className="text-[17px] font-normal text-casca-texto">
          {t("Nova atividade")}
        </DialogTitle>
      </div>
      <div className="grid gap-5 px-6 py-5">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-casca-meta uppercase">
          <LayoutPanelLeft size={14} aria-hidden />
          {etapa.name}
        </p>
        <label className="grid gap-2 px-8">
          <span className="text-[14px] font-medium text-casca-texto">{t("Título")}*</span>
          <input
            type="text"
            aria-label={t("Título")}
            value={titulo}
            maxLength={255}
            placeholder={t(EXEMPLO_DO_TITULO[tipo])}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErro(null);
            }}
            className="h-[52px] w-full max-w-[495px] rounded-[4px] border-0 bg-casca-raia px-4 text-[14px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
        </label>
        <div className="grid gap-2 px-8">
          <span className="text-[14px] font-medium text-casca-texto">{t("Tipo")}*</span>
          <div className="flex gap-2">
            {TIPOS_DE_ATIVIDADE.map((x) => (
              <button
                key={x}
                type="button"
                aria-label={t(ROTULO_DO_TIPO[x])}
                title={t(ROTULO_DO_TIPO[x])}
                aria-pressed={x === tipo}
                onClick={() => setTipo(x)}
                className={cn(
                  "grid size-[38px] place-items-center rounded-[6px] border text-casca-marca",
                  x === tipo ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
                )}
              >
                <IconeDoTipo tipo={x} tamanho={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 px-8">
          <span className="text-[14px] font-medium text-casca-texto">
            {t("Data e hora da atividade")}
          </span>
          <SeletorDeDataEHora
            valor={quando}
            aoMudar={(d) => {
              setQuando(d);
              setErro(null);
            }}
          />
        </div>
        {erro ? (
          <p role="alert" className="px-8 text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-casca-borda px-6 py-4">
        <button
          type="button"
          disabled={enviando}
          title={enviando ? t("Salvando…") : undefined}
          onClick={() => void continuar()}
          className="h-10 rounded-[6px] bg-casca-marca px-4 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Continuar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
