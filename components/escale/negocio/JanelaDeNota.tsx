"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCriarNota, useEditarNota } from "@/hooks/escale/useNotasDoNegocio";
import { useT } from "@/hooks/i18n/useT";
import { MAX_TEXTO_DA_NOTA, type AlvoDaNota } from "@/lib/escale/negocio/notas";

/**
 * O MODAL "NOVA NOTA" DA CLINT (fork Escale, Fases 1H e 2E; C15, N7; NoteModal). O alvo é o negócio ou o contato (Q5).
 * Título com o "i" (a dica 10608), a caixa de texto (texto simples, Q9), o
 * contador, "Cancelar" e "Salvar". Com `nota`, é "Editar nota".
 */
export function JanelaDeNota({
  alvo,
  aberta,
  onFechar,
  nota,
}: {
  alvo: AlvoDaNota;
  aberta: boolean;
  onFechar: () => void;
  nota?: { id: string; texto: string };
}) {
  const t = useT();
  const criar = useCriarNota(alvo);
  const editar = useEditarNota(alvo);
  const [texto, setTexto] = useState(nota?.texto ?? "");
  // Ao abrir (ou trocar a nota), a caixa volta ao texto da nota; ajustado no render, sem efeito.
  const origem = aberta ? (nota?.texto ?? "") : null;
  const [vista, setVista] = useState(origem);
  if (origem !== vista) {
    setVista(origem);
    if (origem !== null) setTexto(origem);
  }
  const titulo = nota ? t("Editar nota") : t("Nova nota");
  const salvando = criar.isPending || editar.isPending;
  const limpo = texto.trim();

  async function salvar() {
    if (!limpo) return;
    try {
      if (nota) {
        await editar.mutateAsync({ notaId: nota.id, texto: limpo });
        toast.success(t("A nota foi editada com sucesso!"));
      } else {
        await criar.mutateAsync(limpo);
        toast.success(t("A nota foi salva com sucesso!"));
      }
      onFechar();
    } catch {
      toast.error(t("Ocorreu um erro ao salvar a nota!"));
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={onFechar} className="w-[min(42rem,calc(100vw-2rem))]">
      {/* O "i" fica ao lado do título (não dentro): o nome da janela é só o título. */}
      <div className="flex items-center gap-2">
        <DialogTitle className="text-[15px] font-semibold text-casca-texto">{titulo}</DialogTitle>
        <TooltipProvider delayDuration={150}>
          <AjudaDaCasca
            texto={t(
              "Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato.",
            )}
          />
        </TooltipProvider>
      </div>
      <DialogDescription className="sr-only">{titulo}</DialogDescription>
      <textarea
        autoFocus
        aria-label={titulo}
        placeholder={t("Clique aqui para adicionar")}
        maxLength={MAX_TEXTO_DA_NOTA}
        value={texto}
        disabled={salvando}
        onChange={(e) => setTexto(e.target.value)}
        className="h-40 w-full resize-y rounded-md bg-casca-busca p-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
      />
      <p className="-mt-3 text-right text-[11px] text-casca-meta">{`${texto.length}/${MAX_TEXTO_DA_NOTA}`}</p>
      <div className="flex justify-end gap-2">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={onFechar} disabled={salvando}>
          {t("Cancelar")}
        </BotaoDaCasca>
        <BotaoDaCasca
          variante="marca"
          tamanho="md"
          onClick={() => void salvar()}
          disabled={!limpo || salvando}
        >
          {t("Salvar")}
        </BotaoDaCasca>
      </div>
    </JanelaDaCasca>
  );
}
