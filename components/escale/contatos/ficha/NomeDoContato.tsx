"use client";
import { useState } from "react";
import { toast } from "sonner";

import { usePermission } from "@/hooks/auth/AuthProvider";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { useT } from "@/hooks/i18n/useT";
import { Check, Pencil, X } from "@/lib/ui/icons-da-casca";

const MAX_NOME = 80;

/** O NOME EDITÁVEL NO LUGAR (fork Escale, Fase 2E; Clint `_r`; medidas do 1h-07: caixa 200×28, ✓ e ✕ de 24px). */
export function NomeDoContato({ contatoId, nome }: { contatoId: string; nome: string }) {
  const t = useT();
  const podeEditar = usePermission("contact.update");
  const { gravar } = useGravarContato(contatoId, null);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);

  async function salvar() {
    const limpo = valor.trim();
    setEditando(false);
    if (!limpo || limpo === nome) return;
    try {
      if (await gravar({ name: limpo })) toast.success(t("As alterações foram salvas com sucesso."));
    } catch {
      toast.error(t("Ocorreu um erro ao salvar o campo"));
    }
  }

  if (editando) {
    return (
      <span className="flex items-center gap-1">
        <input
          autoFocus
          aria-label={t("Nome")}
          maxLength={MAX_NOME}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void salvar();
            if (e.key === "Escape") setEditando(false);
          }}
          className="h-7 w-[200px] rounded-md border border-casca-marca bg-surface px-2 text-[15px] text-casca-texto"
        />
        <button type="button" aria-label={t("Salvar")} onClick={() => void salvar()} className="grid size-6 place-items-center rounded-md text-casca-marca hover:bg-casca-raia">
          <Check size={14} aria-hidden />
        </button>
        <button type="button" aria-label={t("Cancelar")} onClick={() => setEditando(false)} className="grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
          <X size={14} aria-hidden />
        </button>
      </span>
    );
  }
  return (
    <span className="group flex items-center gap-1.5">
      <h2 className="text-[17px] font-medium text-casca-texto">{nome}</h2>
      {podeEditar ? (
        <button
          type="button"
          aria-label={t("Editar nome")}
          onClick={() => {
            setValor(nome);
            setEditando(true);
          }}
          className="grid size-6 place-items-center rounded-md text-casca-suave opacity-0 group-hover:opacity-100 hover:bg-casca-raia focus-visible:opacity-100"
        >
          <Pencil size={13} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
