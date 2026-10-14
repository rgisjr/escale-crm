"use client";
import { useState } from "react";

import { useAtualizarGrupo, useDesarquivarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { ArvoreDeOrigens, Origens } from "@/lib/escale/origens/regras";
import { CaretDown, CaretRight } from "@/lib/ui/icons";

import { IconeDoGrupo } from "./IconeDoGrupo";
import { textoDoErro } from "./texto-do-erro";

/**
 * ARQUIVADOS no pé do painel (fork Escale, Fase 1B), só para gerente+: os
 * grupos arquivados (com as origens que voltam junto) e as origens arquivadas
 * uma a uma, cada um com Desarquivar.
 */
export function ArquivadosDoPainel({
  arvore,
  onOrigens,
}: {
  arvore: ArvoreDeOrigens;
  onOrigens: (origens: Origens) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const grupo = useAtualizarGrupo();
  const origem = useDesarquivarOrigem();
  const total = arvore.gruposArquivados.length + arvore.funisArquivados.length;
  if (total === 0) return null;

  const aoTerminar = {
    onSuccess: (r: Origens) => {
      setErro(null);
      onOrigens(r);
    },
    onError: (err: unknown) => setErro(textoDoErro(err, t)),
  };
  const ocupado = grupo.isPending || origem.isPending;

  return (
    <div className="mt-3 border-t pt-2">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span>
          {t("Arquivados")} ({total})
        </span>
        {aberto ? <CaretDown size={12} aria-hidden /> : <CaretRight size={12} aria-hidden />}
      </button>
      {aberto && (
        <ul className="mt-1 space-y-0.5">
          {arvore.gruposArquivados.map((g) => {
            const n = g.funis.length;
            const quantas = n === 1 ? t("{n} origem") : t("{n} origens");
            return (
              <li key={g.id} className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                <IconeDoGrupo grupo={g} />
                <span className="min-w-0 flex-1 truncate">
                  {g.name} · {quantas.replace("{n}", String(n))}
                </span>
                <button
                  type="button"
                  aria-label={`${t("Desarquivar")} ${g.name}`}
                  disabled={ocupado}
                  onClick={() => grupo.mutate({ id: g.id, mudanca: { is_archived: false } }, aoTerminar)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  {t("Desarquivar")}
                </button>
              </li>
            );
          })}
          {arvore.funisArquivados.map((f) => (
            <li key={f.id} className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`${t("Desarquivar")} ${f.name}`}
                disabled={ocupado}
                onClick={() => origem.mutate(f.id, aoTerminar)}
                className="text-xs font-semibold text-accent hover:underline"
              >
                {t("Desarquivar")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && (
        <p role="alert" className="mt-1 px-2 text-xs text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
