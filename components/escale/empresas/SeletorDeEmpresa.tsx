"use client";

import { useEffect, useState } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown } from "@/lib/ui/icons-da-casca";

import { Monograma } from "./Monograma";

export type EscolhaDeEmpresa = { id: string; nome: string } | { nova: string };

interface Achada {
  id: string;
  nome: string;
}

/**
 * "Nome da empresa" da aba Empresa do negócio (Clint `OrganizationChange`): a caixa
 * mostra a empresa atual; ao abrir, a busca das empresas com nome e, no fim, a opção
 * de criar uma nova com o que foi digitado.
 */
export function SeletorDeEmpresa({
  atual,
  aoEscolher,
  desabilitado = false,
}: {
  atual: { id: string; nome: string } | null;
  aoEscolher: (e: EscolhaDeEmpresa) => void;
  desabilitado?: boolean;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [achadas, setAchadas] = useState<Achada[]>([]);

  useEffect(() => {
    if (!aberto) return;
    const termo = busca.trim();
    const id = window.setTimeout(async () => {
      const r = await fetch(
        `/api/v1/empresas?e=com_nome&n=10${termo ? `&q=${encodeURIComponent(termo)}` : ""}`,
      );
      const corpo = await r.json().catch(() => null);
      setAchadas(((corpo?.data?.linhas ?? []) as Achada[]).map((l) => ({ id: l.id, nome: l.nome })));
    }, 300);
    return () => window.clearTimeout(id);
  }, [busca, aberto]);

  const termo = busca.trim();
  const exata = achadas.some((a) => a.nome.trim().toLowerCase() === termo.toLowerCase());

  const fechar = () => {
    setAberto(false);
    setBusca("");
  };

  return (
    <Popover open={aberto} onOpenChange={(a) => (a ? setAberto(true) : fechar())}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={aberto}
          aria-label={t("Nome da empresa")}
          disabled={desabilitado}
          className="flex h-8 w-full items-center justify-between rounded-md bg-casca-busca px-3 text-left text-[13px] disabled:cursor-not-allowed"
        >
          <span className={atual ? "truncate text-casca-texto" : "truncate text-casca-meta"}>
            {atual?.nome ?? t("Clique aqui para adicionar")}
          </span>
          <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-suave" />
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="start" sideOffset={6} className="w-[320px] p-2">
        <CampoDeTexto
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Escolha a empresa ou digite um nome novo")}
        />
        <ul role="listbox" aria-label={t("Empresas")} className="mt-2 max-h-[240px] overflow-y-auto">
          {achadas.map((a) => (
            <li
              key={a.id}
              role="option"
              aria-selected={atual?.id === a.id}
              onClick={() => {
                fechar();
                aoEscolher(a);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-casca-texto hover:bg-casca-raia"
            >
              <Monograma nome={a.nome} tamanho={24} />
              <span className="truncate">{a.nome}</span>
            </li>
          ))}
          {termo && !exata ? (
            <li
              role="option"
              aria-selected={false}
              onClick={() => {
                fechar();
                aoEscolher({ nova: termo });
              }}
              className="cursor-pointer rounded-[6px] px-2 py-1.5 text-[13px] font-medium text-casca-marca hover:bg-casca-raia"
            >
              {t('Criar a empresa "{nome}"').replace("{nome}", termo)}
            </li>
          ) : null}
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
