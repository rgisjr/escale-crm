"use client";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  OPCOES_DE_TELEFONE,
  ROTULO_DO_TELEFONE,
  textoDoPeriodo,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";
import { Calendar } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { GrupoDoFiltro } from "./PecasDoFiltro";

/** Seção Contato (Clint `index-A38akjUb`): "Data de criação" e "Telefone". */
export function SecaoContatoDoFiltro({
  filtros,
  aoMudar,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
}) {
  const t = useT();
  const periodo = filtros.criadoEm;
  return (
    <>
      <GrupoDoFiltro rotulo={t("Data de criação")}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Data de criação")}
              className={cn(CLASSE_DO_CAMPO, "flex items-center justify-between text-left")}
            >
              <span className={periodo ? "text-casca-texto" : "text-casca-meta"}>
                {periodo ? textoDoPeriodo(periodo) : t("Filtrar por data de criação")}
              </span>
              <Calendar size={14} aria-hidden className="text-casca-suave" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso className="w-auto p-0">
            <CalendarioDePeriodo
              valor={{ tipo: "criacao", de: periodo?.de, ate: periodo?.ate }}
              tiposDisponiveis={["criacao"]}
              aoMudar={(p) =>
                aoMudar({
                  ...filtros,
                  criadoEm:
                    p.de || p.ate
                      ? { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) }
                      : undefined,
                })
              }
            />
          </PainelSuspenso>
        </Popover>
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Telefone")}>
        <SeletorDaCasca
          valor={filtros.telefone ?? ""}
          opcoes={OPCOES_DE_TELEFONE.map((o) => ({ valor: o, rotulo: t(ROTULO_DO_TELEFONE[o]) }))}
          aoMudar={(v) => aoMudar({ ...filtros, telefone: v || undefined })}
          vazio={t("Com/Sem Telefone")}
          aria-label={t("Telefone")}
        />
      </GrupoDoFiltro>
    </>
  );
}
