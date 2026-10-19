"use client";
import { useState } from "react";

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { useNotasDoNegocio } from "@/hooks/escale/useNotasDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";
import { Plus, StickyNote } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../../centro/VazioDaCasca";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

/** A seção Notas (c19): "+ Adicionar nota" e as notas do negócio (1H); sem negócio, só o aviso. */
export function SecaoNotas({
  quadro,
  aoVoltar,
}: {
  quadro: QuadroDoNegocio | null;
  aoVoltar: () => void;
}) {
  const t = useT();
  const [nova, setNova] = useState(false);
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const leadId = quadro?.lead.id ?? "";
  const notas = useNotasDoNegocio(leadId);
  const lista = quadro ? (notas.data ?? []) : [];
  return (
    <SecaoAberta titulo={t("Notas")} icone={ICONE_DA_SECAO.notas} aoVoltar={aoVoltar}>
      <button
        type="button"
        disabled={!quadro}
        title={quadro ? undefined : t("Sem negócio")}
        onClick={() => setNova(true)}
        className="flex h-8 w-full items-center justify-center gap-1 rounded-casca-gatilho border border-casca-borda text-[12px] text-casca-marca hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={14} aria-hidden />
        {t("Adicionar nota")}
      </button>
      {lista.length === 0 ? (
        <VazioDaCasca className="pt-6" icone={StickyNote} titulo={t("Nenhuma nota ainda.")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => setEditando({ id: n.id, texto: n.texto })}
                className="w-full rounded-[8px] border border-casca-borda p-3 text-left hover:bg-casca-raia"
              >
                <p className="line-clamp-4 text-[12px] whitespace-pre-wrap text-casca-texto">
                  {n.texto}
                </p>
                <p className="mt-1 text-[11px] text-casca-suave">{`${dataHoraBr(n.created_at)}${n.user_nome ? ` ${t("por")} ${n.user_nome}` : ""}`}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {quadro ? (
        <>
          <JanelaDeNota leadId={quadro.lead.id} aberta={nova} onFechar={() => setNova(false)} />
          <JanelaDeNota
            leadId={quadro.lead.id}
            aberta={editando !== null}
            onFechar={() => setEditando(null)}
            nota={editando ?? undefined}
          />
        </>
      ) : null}
    </SecaoAberta>
  );
}
