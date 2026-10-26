"use client";
import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { useT } from "@/hooks/i18n/useT";
import type { CampoDaVariavel } from "@/lib/escale/playbook/variaveis";
import { Plus } from "@/lib/ui/icons-da-casca";

/**
 * "ADICIONAR VARIÁVEIS" (fork Escale, Fase 1I; P10): desde a Frente V é o
 * seletor único (`SeletorDeVariaveis`). Os campos da origem entram no fim de
 * Negócio e de Contato, junto com os do catálogo.
 */
export function VariaveisDaMensagem({
  aoEscolher,
  campos = [],
}: {
  aoEscolher: (nome: string) => void;
  campos?: readonly CampoDaVariavel[];
}) {
  const t = useT();
  return (
    <SeletorDeVariaveis
      aoEscolher={aoEscolher}
      adicionais={{ negocio: campos, contato: campos }}
      gatilho={
        <button
          type="button"
          className="flex items-center gap-1.5 text-[13px] font-medium text-casca-marca hover:underline"
        >
          <Plus size={14} aria-hidden />
          {t("Adicionar variáveis")}
        </button>
      }
    />
  );
}
