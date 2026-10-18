"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import {
  MAX_CONTEUDO_DA_ATIVIDADE,
  VAZIO_DO_CONTEUDO,
  atividadesDaEtapa,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";
import { inserirNoCursor, type CampoDaVariavel } from "@/lib/escale/playbook/variaveis";
import { Plus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { PrazoDaAtividade } from "./PrazoDaAtividade";
import { VariaveisDaMensagem } from "./VariaveisDaMensagem";

type Mudanca = Partial<Omit<AtividadeDoPlaybook, "id" | "ordem">>;

/**
 * "CONFIGURAÇÕES DE ATIVIDADES" (fork Escale, Fase 1I; D10, P9). À esquerda, a
 * etapa ("Selecionar Etapa"), as atividades dela e "+ Nova atividade"; à
 * direita, o editor da escolhida: título, o texto (mensagem, roteiro ou
 * instrução) com "Adicionar variáveis", o prazo e "Atualizar". "Atualizar" só
 * muda o rascunho; o banco só recebe no "Salvar na origem".
 */
export function JanelaConfiguracoesDeAtividades({
  aberta,
  etapas,
  atividades,
  escolhidaId,
  aoEscolher,
  aoAtualizar,
  aoNova,
  aoFechar,
  campos = [],
}: {
  aberta: boolean;
  etapas: readonly { id: string; name: string }[];
  atividades: readonly AtividadeDoPlaybook[];
  escolhidaId: string;
  aoEscolher: (id: string) => void;
  aoAtualizar: (id: string, mudanca: Mudanca) => void;
  aoNova: (etapaId: string) => void;
  aoFechar: () => void;
  /** Os campos personalizados da origem, para "Adicionar variáveis". */
  campos?: readonly CampoDaVariavel[];
}) {
  const t = useT();
  const escolhida = atividades.find((a) => a.id === escolhidaId) ?? null;
  const [etapaVista, setEtapaVista] = useState(escolhida?.etapaId ?? etapas[0]?.id ?? "");
  const daEtapa = atividadesDaEtapa(atividades, etapaVista);

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(92vw,1140px)] gap-0 p-0">
      <div className="border-b border-casca-borda px-6 py-5">
        <DialogTitle className="text-[17px] font-normal text-casca-texto">
          {t("Configurações de atividades")}
        </DialogTitle>
      </div>
      <div className="grid h-[560px] grid-cols-[300px_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-casca-borda">
          <div className="p-4">
            <SeletorDaCasca
              aria-label={t("Selecionar Etapa")}
              aparencia="janela"
              valor={etapaVista}
              aoMudar={(v) => v && setEtapaVista(v)}
              opcoes={etapas.map((e) => ({ valor: e.id, rotulo: e.name }))}
            />
          </div>
          <ul aria-label={t("Atividades da etapa")} className="min-h-0 flex-1 overflow-y-auto">
            {daEtapa.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  aria-pressed={a.id === escolhidaId}
                  onClick={() => aoEscolher(a.id)}
                  className={cn(
                    "flex w-full items-center gap-2 border-l-[3px] px-4 py-2.5 text-left text-[13px] text-casca-texto",
                    a.id === escolhidaId
                      ? "border-casca-marca bg-casca-raia"
                      : "border-transparent hover:bg-casca-raia",
                  )}
                >
                  <IconeDoTipo tipo={a.tipo} tamanho={14} className="shrink-0 text-casca-marca" />
                  <span className="truncate">{a.titulo}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => aoNova(etapaVista)}
            className="flex h-12 items-center justify-center gap-1 border-t border-casca-borda text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            <Plus size={14} aria-hidden />
            {t("Nova atividade")}
          </button>
        </aside>
        {escolhida ? (
          <EditorDaAtividade
            key={escolhida.id}
            atividade={escolhida}
            campos={campos}
            aoAtualizar={(m) => aoAtualizar(escolhida.id, m)}
          />
        ) : (
          <div />
        )}
      </div>
    </JanelaDaCasca>
  );
}

function EditorDaAtividade({
  atividade,
  campos,
  aoAtualizar,
}: {
  atividade: AtividadeDoPlaybook;
  campos: readonly CampoDaVariavel[];
  aoAtualizar: (m: Mudanca) => void;
}) {
  const t = useT();
  const [titulo, setTitulo] = useState(atividade.titulo);
  const [conteudo, setConteudo] = useState(atividade.conteudo ?? "");
  const [prazo, setPrazo] = useState(atividade.prazoMinutos);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const tituloValido = titulo.trim().length > 0;

  const inserir = (nome: string) => {
    const el = caixa.current;
    const r = inserirNoCursor(
      conteudo,
      el?.selectionStart ?? conteudo.length,
      el?.selectionEnd ?? conteudo.length,
      nome,
    );
    setConteudo(r.texto.slice(0, MAX_CONTEUDO_DA_ATIVIDADE));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(r.cursor, r.cursor);
    });
  };

  const atualizar = () => {
    aoAtualizar({
      titulo: titulo.trim(),
      conteudo: conteudo.trim() ? conteudo : null,
      prazoMinutos: prazo,
    });
    toast.success(t("Atividade atualizada"));
  };

  return (
    <section aria-label={t("Detalhes da atividade")} className="flex min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-casca-borda px-6">
        <IconeDoTipo tipo={atividade.tipo} tamanho={18} className="shrink-0 text-casca-marca" />
        <input
          type="text"
          aria-label={t("Título")}
          value={titulo}
          maxLength={255}
          placeholder={t("Adicione um título...")}
          onChange={(e) => setTitulo(e.target.value)}
          className="h-9 flex-1 rounded-[4px] border-0 bg-transparent px-2 text-[15px] font-medium text-casca-texto outline-hidden placeholder:text-casca-meta hover:bg-casca-raia focus:bg-casca-raia"
        />
      </header>
      <textarea
        ref={caixa}
        aria-label={t("Conteúdo da atividade")}
        value={conteudo}
        maxLength={MAX_CONTEUDO_DA_ATIVIDADE}
        placeholder={t(VAZIO_DO_CONTEUDO[atividade.tipo])}
        onChange={(e) => setConteudo(e.target.value)}
        className="min-h-0 flex-1 resize-none border-0 bg-transparent px-6 py-4 text-[13.5px] leading-6 text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
      <footer className="flex h-16 shrink-0 items-center gap-3 border-t border-casca-borda px-6">
        <span className="text-[13px] font-semibold text-casca-texto">{t("Data da atividade")}</span>
        <PrazoDaAtividade minutos={prazo} aoMudar={setPrazo} />
        <span className="text-[13px] text-casca-texto">{t("após entrar na etapa")}</span>
        <span className="flex-1" />
        <VariaveisDaMensagem aoEscolher={inserir} campos={campos} />
        <AjudaDaCasca texto={t("Ajuda com as atividades")} />
        <button
          type="button"
          disabled={!tituloValido}
          title={tituloValido ? undefined : t("Campo obrigatório*")}
          onClick={atualizar}
          className="h-10 rounded-[6px] bg-casca-marca px-5 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Atualizar")}
        </button>
      </footer>
    </section>
  );
}
