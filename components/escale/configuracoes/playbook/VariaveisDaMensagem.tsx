"use client";
import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { useT } from "@/hooks/i18n/useT";
import { VARIAVEIS_DA_ATIVIDADE, type CampoDaVariavel } from "@/lib/escale/playbook/variaveis";
import { tokenDoCampo } from "@/lib/variaveis/catalogo";
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
  // Só o que a atividade preenche: os fixos de VARIAVEIS_DA_ATIVIDADE e os campos da origem.
  const daOrigem = new Set(
    campos.flatMap((c) => [tokenDoCampo("negocio", c.chave), tokenDoCampo("contato", c.chave)]),
  );
  return (
    <SeletorDeVariaveis
      aoEscolher={aoEscolher}
      adicionais={{ negocio: campos, contato: campos }}
      permitir={(token) => VARIAVEIS_DA_ATIVIDADE.has(token) || daOrigem.has(token)}
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
