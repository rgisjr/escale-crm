"use client";
import { useState } from "react";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import {
  AVISO_DO_TIPO,
  EXEMPLO_DO_TITULO,
  PRAZO_PADRAO_EM_MINUTOS,
  ROTULO_DO_TIPO,
  TIPOS_DE_ATIVIDADE,
  type AtividadeDoPlaybook,
  type TipoDeAtividade,
  type VisibilidadeDaAtividade,
} from "@/lib/escale/playbook/regras";
import { CheckCircle2, Clipboard, Clock, EyeOff, LayoutPanelLeft } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { PrazoDaAtividade } from "./PrazoDaAtividade";

/**
 * "NOVA ATIVIDADE" DA ORIGEM (fork Escale, Fase 1I; print 024; P7).
 *
 * Título, os três cartões da Clint (o "dependente" é "Em breve", Q14), o tipo
 * (7 botões), o aviso verde do tipo e o prazo depois da entrada na etapa.
 * "Continuar" só entrega a atividade ao rascunho: nada vai ao servidor até
 * "Salvar na origem" (como na Clint).
 */
export function JanelaNovaAtividade({
  aberta,
  etapa,
  aoFechar,
  aoContinuar,
}: {
  aberta: boolean;
  etapa: { id: string; name: string };
  aoFechar: () => void;
  aoContinuar: (nova: Omit<AtividadeDoPlaybook, "ordem">) => void;
}) {
  const t = useT();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDeAtividade>("whatsapp");
  const [visibilidade, setVisibilidade] = useState<VisibilidadeDaAtividade>("padrao");
  const [prazo, setPrazo] = useState(PRAZO_PADRAO_EM_MINUTOS);
  const [erro, setErro] = useState(false);

  const continuar = () => {
    if (!titulo.trim()) {
      setErro(true);
      return;
    }
    aoContinuar({
      id: crypto.randomUUID(),
      etapaId: etapa.id,
      titulo: titulo.trim(),
      tipo,
      visibilidade,
      prazoMinutos: prazo,
      conteudo: null,
    });
  };

  const cartoes: Array<{
    valor: VisibilidadeDaAtividade | "dependente";
    titulo: string;
    texto: string;
    icone: typeof Clipboard;
  }> = [
    {
      valor: "padrao",
      titulo: t("Atividade padrão"),
      texto: t("Crie uma atividade padrão com data e horário definido"),
      icone: Clipboard,
    },
    {
      valor: "nao_listada",
      titulo: t("Atividade não listada"),
      texto: t("Crie uma atividade que não será listada na visão de atividades"),
      icone: EyeOff,
    },
    {
      valor: "dependente",
      titulo: t("Atividade dependente"),
      texto: t(
        "A atividade só será listada na visão de atividades após conclusão da atividade relacionada",
      ),
      icone: Clock,
    },
  ];

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(90vw,1140px)] gap-0 p-0">
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

        <label className="grid gap-2">
          <span className="text-[13px] font-semibold text-casca-texto">
            {t("Título")}
            <span aria-hidden className="ml-0.5 text-casca-alerta">
              *
            </span>
          </span>
          <input
            type="text"
            aria-label={t("Título")}
            value={titulo}
            maxLength={255}
            placeholder={t(EXEMPLO_DO_TITULO[tipo])}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErro(false);
            }}
            className="h-10 w-full rounded-[4px] border-0 bg-casca-raia px-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
          {erro ? (
            <span className="text-[12px] text-casca-alerta">{t("Campo obrigatório*")}</span>
          ) : null}
        </label>

        <div className="flex justify-center gap-5">
          {cartoes.map((c) => {
            const emBreve = c.valor === "dependente";
            const escolhido = c.valor === visibilidade;
            return (
              <button
                key={c.valor}
                type="button"
                disabled={emBreve}
                title={emBreve ? t("Em breve") : undefined}
                aria-pressed={emBreve ? undefined : escolhido}
                onClick={() => !emBreve && setVisibilidade(c.valor as VisibilidadeDaAtividade)}
                className={cn(
                  "relative flex h-[126px] w-[375px] flex-col items-center justify-center gap-1 rounded-[4px] border px-4 text-center",
                  escolhido ? "border-casca-marca" : "border-casca-borda",
                  "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {emBreve ? (
                  <span className="absolute top-3 left-3 rounded-[4px] bg-casca-marca-suave px-1.5 py-0.5 text-[10px] font-semibold text-casca-marca">
                    {t("EM BREVE")}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "flex items-center gap-2 text-[14px] font-semibold",
                    escolhido ? "text-casca-marca" : "text-casca-texto",
                  )}
                >
                  <c.icone size={16} aria-hidden />
                  {c.titulo}
                </span>
                <span className="text-[13px] text-casca-texto-2">{c.texto}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2">
          <span className="text-[13px] font-semibold text-casca-texto">
            {t("Tipo")}
            <span aria-hidden className="ml-0.5 text-casca-alerta">
              *
            </span>
          </span>
          <div className="flex gap-3">
            {TIPOS_DE_ATIVIDADE.map((x) => (
              <button
                key={x}
                type="button"
                aria-label={t(ROTULO_DO_TIPO[x])}
                title={t(ROTULO_DO_TIPO[x])}
                aria-pressed={x === tipo}
                onClick={() => setTipo(x)}
                className={cn(
                  "grid h-10 w-11 place-items-center rounded-[6px] border",
                  x === tipo
                    ? "border-casca-marca bg-casca-marca text-white"
                    : "border-casca-borda text-casca-marca hover:bg-casca-raia",
                )}
              >
                <IconeDoTipo tipo={x} tamanho={18} />
              </button>
            ))}
          </div>
        </div>

        <p className="flex h-14 items-center gap-3 rounded-[4px] border border-(--escale-aviso-ok-borda) px-5 text-[13px] font-medium text-(--escale-aviso-ok-texto)">
          <CheckCircle2 size={18} aria-hidden />
          {t(AVISO_DO_TIPO[tipo])}
        </p>

        <div className="grid gap-2">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-casca-texto">
            {t("Data da atividade")}
            <span aria-hidden className="text-casca-alerta">
              *
            </span>
            <AjudaDaCasca
              texto={t(
                "O cálculo de tempo da atividade é com base na entrada do negócio na etapa.",
              )}
            />
          </span>
          <div className="flex items-center gap-3">
            <PrazoDaAtividade minutos={prazo} aoMudar={setPrazo} />
            <span className="text-[14px] text-casca-texto">{t("após entrar na etapa")}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-casca-borda px-6 py-4">
        <button
          type="button"
          onClick={continuar}
          className="h-11 rounded-[6px] bg-casca-marca px-6 text-[15px] font-semibold text-white hover:bg-casca-marca-forte"
        >
          {t("Continuar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
