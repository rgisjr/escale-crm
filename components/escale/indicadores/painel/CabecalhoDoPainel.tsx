"use client";
import Link from "next/link";
import { useState } from "react";

import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { JanelaInformacoesDoPainel } from "@/components/escale/indicadores/lista/JanelaInformacoesDoPainel";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { GRAFICOS_POR_PAINEL_MAX } from "@/lib/escale/indicadores/graficos/tipos";
import { podeAdicionar } from "@/lib/escale/indicadores/graficos/regras-do-card";
import type { Intervalo } from "@/lib/escale/indicadores/painel/preferencias";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";
import { rotaDoNovoChart } from "@/lib/escale/indicadores/rotas";
import { Pencil, Plus, RefreshCw } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { MenuAtualizarACada } from "./MenuAtualizarACada";

/**
 * O CABEÇALHO DO PAINEL ABERTO (prints 10-006, 10-010): nome com o lápis (gerente para cima, R7), Atualizar,
 * "Novo Chart +" (limite de 30 com a dica) e o ⋮ "Atualizar a cada:".
 */
export function CabecalhoDoPainel({
  painel,
  papel,
  total,
  intervalo,
  aoAtualizar,
  aoMudarIntervalo,
}: {
  painel: PainelDaLista;
  papel: Role;
  total: number;
  intervalo: Intervalo;
  aoAtualizar: () => void;
  aoMudarIntervalo: (v: Intervalo) => void;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const gerente = roleAtLeast(papel, "manager");
  const cabe = podeAdicionar(total);
  const botao =
    "inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho bg-casca-marca px-3 text-[13px] font-medium text-white hover:bg-casca-marca-forte";
  const textoDoLimite = t(
    "Você só pode adicionar até {n} charts no seu dashboard. Para incluir novos, será necessário excluir um chart existente.",
  ).replace("{n}", String(GRAFICOS_POR_PAINEL_MAX));
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-casca-divisoria px-6">
      <h1 className="max-w-[60%] truncate text-[16px] font-medium text-casca-texto">{painel.nome}</h1>
      {gerente ? (
        <button
          type="button"
          aria-label={t("Editar dashboard")}
          title={t("Editar dashboard")}
          onClick={() => setEditando(true)}
          className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
        >
          <Pencil size={13} aria-hidden />
        </button>
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          aria-label={t("Atualizar")}
          title={t("Atualizar")}
          onClick={aoAtualizar}
          className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <RefreshCw size={16} aria-hidden />
        </button>
        {gerente ? (
          cabe ? (
            <Link href={rotaDoNovoChart(painel.id)} className={botao}>
              {t("Novo Chart")}
              <Plus size={16} aria-hidden />
            </Link>
          ) : (
            <DicaAoPassar texto={textoDoLimite}>
              <span aria-disabled="true" tabIndex={0} className={cn(botao, "cursor-not-allowed opacity-50 hover:bg-casca-marca")}>
                {t("Novo Chart")}
                <Plus size={16} aria-hidden />
              </span>
            </DicaAoPassar>
          )
        ) : null}
        <MenuAtualizarACada intervalo={intervalo} aoMudar={aoMudarIntervalo} />
      </div>
      {editando ? <JanelaInformacoesDoPainel painel={painel} aoFechar={() => setEditando(false)} /> : null}
    </header>
  );
}
