"use client";
import { useState } from "react";

import { useAtualizarGrupo, useDesarquivarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { ArvoreDeOrigens, Origens } from "@/lib/escale/origens/regras";
import { ChevronDown, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { LINHA, LINHA_COM_HOVER, RECUO_DO_TEXTO } from "./estilos-do-painel";
import { IconeDoGrupo } from "./IconeDoGrupo";
import { textoDoErro } from "./texto-do-erro";

const BOTAO_DESARQUIVAR = "shrink-0 text-[11px] font-semibold text-casca-marca hover:underline disabled:opacity-60";

/**
 * ARQUIVADOS no pé da lista (fork Escale, Fase 1B), só para gerente+.
 * - Os grupos arquivados vêm com as origens que voltam junto.
 * - As origens arquivadas vêm uma a uma.
 * - Cada um tem Desarquivar.
 *
 * Sem print da Clint (item 14): sobretítulo 11px/600 em caixa alta, como "Sem
 * grupo", e linhas de 34px do painel.
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
    <div className="border-t border-casca-borda">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex h-8 w-full items-center justify-between px-4 text-[11px] font-semibold text-casca-suave uppercase hover:text-casca-texto"
      >
        <span>
          {t("Arquivados")} ({total})
        </span>
        {aberto ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
      </button>
      {aberto && (
        <ul>
          {arvore.gruposArquivados.map((g) => {
            const n = g.funis.length;
            const quantas = n === 1 ? t("{n} origem") : t("{n} origens");
            return (
              <li key={g.id} className={cn(LINHA, LINHA_COM_HOVER, "gap-[7px] pr-3 pl-4 text-casca-suave")}>
                <IconeDoGrupo grupo={g} />
                <span className="min-w-0 flex-1 truncate">
                  {g.name} · {quantas.replace("{n}", String(n))}
                </span>
                <button
                  type="button"
                  aria-label={`${t("Desarquivar")} ${g.name}`}
                  disabled={ocupado}
                  onClick={() => grupo.mutate({ id: g.id, mudanca: { is_archived: false } }, aoTerminar)}
                  className={BOTAO_DESARQUIVAR}
                >
                  {t("Desarquivar")}
                </button>
              </li>
            );
          })}
          {arvore.funisArquivados.map((f) => (
            <li key={f.id} className={cn(LINHA, LINHA_COM_HOVER, "gap-2 pr-3 text-casca-suave", RECUO_DO_TEXTO)}>
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`${t("Desarquivar")} ${f.name}`}
                disabled={ocupado}
                onClick={() => origem.mutate(f.id, aoTerminar)}
                className={BOTAO_DESARQUIVAR}
              >
                {t("Desarquivar")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && (
        <p role="alert" className="px-4 pb-2 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
    </div>
  );
}
