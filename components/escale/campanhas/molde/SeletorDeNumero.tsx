"use client";

import { useState } from "react";

import { FotoDaPessoa } from "@/components/escale/conversas/configuracoes/FotoDaPessoa";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { ChevronDown } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CAMPO } from "./estilos";

export interface NumeroDoSeletor {
  id: string;
  nome: string;
  telefone: string | null;
  conectado: boolean;
  grupo: string;
  avatarUrl?: string | null;
  setor?: string | null;
}

function Avatar({ n, tamanho }: { n: NumeroDoSeletor; tamanho: number }) {
  return (
    <span className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      {n.avatarUrl ? (
        <span
          aria-hidden
          className="block size-full rounded-full bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(n.avatarUrl)})` }}
        />
      ) : (
        <FotoDaPessoa id={n.id} nome={n.nome} tamanho={tamanho} />
      )}
      {n.conectado && (
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface bg-(--escale-status-ganho)"
        />
      )}
    </span>
  );
}

/**
 * O "DISPOSITIVO DE WHATSAPP" (fork Escale, Fase 8B; 09-019): agrupado na ordem
 * em que os números chegam, avatar com a bolinha de conectado, nome, e embaixo
 * "telefone · setor". Genérico: a 8D passa só os não oficiais.
 */
export function SeletorDeNumero({
  numeros,
  valor,
  aoMudar,
  placeholder,
}: {
  numeros: ReadonlyArray<NumeroDoSeletor>;
  valor: string | null;
  aoMudar: (id: string) => void;
  placeholder?: string;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const atual = numeros.find((n) => n.id === valor) ?? null;
  const grupos: Array<[string, NumeroDoSeletor[]]> = [];
  for (const n of numeros) {
    const g = grupos.find(([nome]) => nome === n.grupo);
    if (g) g[1].push(n);
    else grupos.push([n.grupo, [n]]);
  }
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          className={cn(
            CAMPO,
            "flex items-center gap-2 text-left",
            aberto && "border-casca-marca bg-surface",
          )}
        >
          {atual ? (
            <>
              <Avatar n={atual} tamanho={20} />
              <span className="truncate">{atual.nome}</span>
            </>
          ) : (
            <span className="text-casca-meta">{placeholder ?? t("Selecionar conta")}</span>
          )}
          <ChevronDown
            className={cn("ml-auto size-4 text-casca-suave", aberto && "rotate-180")}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PainelSuspenso
        sideOffset={8}
        className="max-h-[360px] w-(--radix-popover-trigger-width) overflow-y-auto py-2"
      >
        {numeros.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-casca-suave">
            {t("Nenhum dispositivo disponível")}
          </p>
        ) : (
          <div role="listbox" aria-label={t("Dispositivo de WhatsApp")}>
            {grupos.map(([grupo, lista]) => (
              <div key={grupo} role="group" aria-label={grupo}>
                <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-casca-suave uppercase">
                  {grupo}
                </p>
                {lista.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="option"
                    aria-selected={n.id === valor}
                    onClick={() => {
                      aoMudar(n.id);
                      setAberto(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-casca-busca",
                      n.id === valor && "bg-casca-marca-suave",
                    )}
                  >
                    <Avatar n={n} tamanho={28} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-casca-texto">
                        {n.nome}
                      </span>
                      <span className="block truncate text-[12px] text-casca-suave">
                        {[n.telefone ? formatarTelefone(n.telefone) : null, n.setor ?? null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </PainelSuspenso>
    </Popover>
  );
}
