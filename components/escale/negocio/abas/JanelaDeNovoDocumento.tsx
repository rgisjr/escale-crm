"use client";
import { useId, useRef, useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import {
  ACCEPT_DO_INPUT,
  MAX_ARQUIVO_MB,
  formatarTamanho,
  validarArquivo,
} from "@/lib/escale/negocio/arquivos";
import { Plus, X } from "@/lib/ui/icons-da-casca";

/**
 * O MODAL "NOVO DOCUMENTO" DA CLINT (fork Escale, Fase 1H; C17; ImportModal).
 * "Adicionar" abre o seletor de arquivos (vários; a lista de extensões da
 * Clint); cada arquivo vira uma linha com ×; o que não serve fica de fora, com
 * o motivo; "Salvar" envia. Sem arrastar, como na Clint.
 */
export function JanelaDeNovoDocumento({
  aberta,
  onFechar,
  aoSalvar,
}: {
  aberta: boolean;
  onFechar: () => void;
  aoSalvar: (arquivos: File[]) => Promise<void>;
}) {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [lista, setLista] = useState<File[]>([]);
  const [recusados, setRecusados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  function fechar() {
    setLista([]);
    setRecusados([]);
    onFechar();
  }

  function escolher(arquivos: FileList | null) {
    if (!arquivos) return;
    const aceitos: File[] = [];
    const avisos: string[] = [];
    for (const a of Array.from(arquivos)) {
      const v = validarArquivo({ nome: a.name, tamanho: a.size });
      if (v.ok) aceitos.push(a);
      else
        avisos.push(
          `${a.name}: ${t(v.erro).replace("{fileName}", a.name).replace("{maxMb}", String(MAX_ARQUIVO_MB))}`,
        );
    }
    setLista((atual) => [...atual, ...aceitos]);
    setRecusados(avisos);
    if (input.current) input.current.value = "";
  }

  async function salvar() {
    setEnviando(true);
    try {
      await aoSalvar(lista);
      fechar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar}>
      <DialogTitle className="text-[15px] font-semibold text-casca-texto">
        {t("Novo documento")}
      </DialogTitle>
      <DialogDescription className="sr-only">{t("Novo documento")}</DialogDescription>
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        accept={ACCEPT_DO_INPUT}
        aria-label={t("Adicionar")}
        className="sr-only"
        onChange={(e) => escolher(e.target.files)}
      />
      {lista.length === 0 ? (
        <p className="text-[13px] text-casca-suave">{t("Nenhum documento adicionado")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lista.map((a, i) => (
            <li
              key={`${a.name}-${i}`}
              className="flex h-9 items-center justify-between rounded-md bg-casca-raia px-3 text-[13px] text-casca-texto"
            >
              <span className="min-w-0 truncate">
                {a.name}{" "}
                <span className="text-[11px] text-casca-meta">{formatarTamanho(a.size)}</span>
              </span>
              <button
                type="button"
                aria-label={`${t("Remover")} ${a.name}`}
                onClick={() => setLista((atual) => atual.filter((_, j) => j !== i))}
                className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:text-casca-texto"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {recusados.map((r) => (
        <p key={r} className="text-[11px] text-destructive">
          {r}
        </p>
      ))}
      <div className="flex items-center justify-between">
        <BotaoDaCasca
          variante="texto"
          tamanho="sm"
          className="border border-casca-borda"
          onClick={() => input.current?.click()}
        >
          <Plus aria-hidden />
          {t("Adicionar")}
        </BotaoDaCasca>
        <div className="flex gap-2">
          <BotaoDaCasca variante="texto" tamanho="md" onClick={fechar} disabled={enviando}>
            {t("Cancelar")}
          </BotaoDaCasca>
          <BotaoDaCasca
            variante="marca"
            tamanho="md"
            onClick={() => void salvar()}
            disabled={lista.length === 0 || enviando}
          >
            {t("Salvar")}
          </BotaoDaCasca>
        </div>
      </div>
    </JanelaDaCasca>
  );
}
