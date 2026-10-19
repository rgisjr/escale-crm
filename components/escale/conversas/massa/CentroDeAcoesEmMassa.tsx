"use client";
import { useState } from "react";
import { toast } from "sonner";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { textoDasSelecionadas } from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import {
  ArrowLeftRight,
  ListChecks,
  RefreshCcw,
  Tag,
  Tags,
  Trash2,
  UsersRound,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type AcaoEscolhida = "status" | "atendente" | "setor" | "incluir_tag" | "remover_tag";

const CARTAO =
  "flex h-12 items-center gap-2 rounded-lg border border-casca-borda bg-surface px-4 text-[13px] text-casca-texto hover:border-casca-marca";

function Icone({ icone: Ic }: { icone: LucideIcon }) {
  return (
    <span className="grid size-7 place-items-center rounded-full bg-casca-raia text-casca-texto-2">
      <Ic size={16} aria-hidden />
    </span>
  );
}

/** A tela "Ações em massa" (c25, c30, c82). A ilustração da Clint fica de fora (item 4 dos prints que faltam). */
export function CentroDeAcoesEmMassa({
  selecionadas,
  aoEscolher,
  aoSair,
}: {
  selecionadas: number;
  aoEscolher: (a: AcaoEscolhida) => void;
  aoSair: () => void;
}) {
  const t = useT();
  const [tagAberta, setTagAberta] = useState(false);
  const escolher = (a: AcaoEscolhida) => {
    if (selecionadas === 0) {
      toast.error(t("É preciso selecionar ao menos um Chat para realizar ações em massa!"));
      return;
    }
    aoEscolher(a);
  };
  const cartao = (a: AcaoEscolhida, rotulo: string, icone: LucideIcon) => (
    <button type="button" onClick={() => escolher(a)} className={CARTAO}>
      <Icone icone={icone} />
      {rotulo}
    </button>
  );
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-casca-marca-suave text-casca-marca">
        <ListChecks size={32} aria-hidden />
      </span>
      <h2 className="mt-6 text-[16px] font-medium text-casca-texto">{t("Ações em massa")}</h2>
      {selecionadas > 0 ? (
        <p className="mt-1 text-[12px] text-casca-suave">{textoDasSelecionadas(selecionadas, t)}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {cartao("status", t("Alterar status"), RefreshCcw)}
        {cartao("atendente", t("Alterar atendente"), ArrowLeftRight)}
        {cartao("setor", t("Alterar setor"), UsersRound)}
        <Popover open={tagAberta} onOpenChange={setTagAberta}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(CARTAO, tagAberta && "border-casca-marca")}>
              <Icone icone={Tag} />
              {t("Alterar tag do contato")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" sideOffset={4} className="w-32 p-1">
            <button
              type="button"
              onClick={() => {
                setTagAberta(false);
                escolher("incluir_tag");
              }}
              className="flex h-[34px] w-full items-center gap-2 rounded-[4px] px-2 text-[12px] text-casca-texto hover:bg-casca-raia"
            >
              <Tags size={14} aria-hidden />
              {t("Incluir")}
            </button>
            <button
              type="button"
              onClick={() => {
                setTagAberta(false);
                escolher("remover_tag");
              }}
              className="flex h-[34px] w-full items-center gap-2 rounded-[4px] px-2 text-[12px] text-casca-texto hover:bg-casca-raia"
            >
              <Trash2 size={14} aria-hidden />
              {t("Remover")}
            </button>
          </PainelSuspenso>
        </Popover>
      </div>
      <button
        type="button"
        onClick={aoSair}
        className="mt-6 text-[12px] text-casca-suave hover:text-casca-texto"
      >
        {t("Sair de ação em massa")}
      </button>
    </div>
  );
}
