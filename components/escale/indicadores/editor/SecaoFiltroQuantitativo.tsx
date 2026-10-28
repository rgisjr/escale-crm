"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoChip, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { ROTULO_DO_OPERADOR, textoDoNumeroBr } from "@/lib/escale/indicadores/editor/operadores";
import type { ErroDoRascunho } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import {
  adicionarFiltroQuantitativo,
  mudarFiltroQuantitativo,
  removerFiltroQuantitativo,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { FILTROS_QUANTITATIVOS_MAX } from "@/lib/escale/indicadores/catalogo/tipos";
import { OPERADORES_QUANTITATIVOS } from "@/lib/escale/indicadores/pergunta";
import { ListFilter, Plus, X } from "@/lib/ui/icons-da-casca";

import { AjudaDoEditor } from "./AjudaDoEditor";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  erros: readonly ErroDoRascunho[];
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
};

const SEM_CATALOGO: CatalogoDaTela = { assuntos: [], camposPersonalizados: { negocio: [], contato: [], empresa: [] } };

/** "Filtro Quantitativo" (print 10-038): condição sobre o VALOR de um indicador depois de agrupar (a condição é provisória). */
export function SecaoFiltroQuantitativo({ rascunho, catalogo, erros, mudar }: Props) {
  const t = useT();
  const cat = catalogo ?? SEM_CATALOGO;
  const [aberto, setAberto] = useState(false);
  const alvos = [
    ...rascunho.indicadores.map((id) => ({ id, nome: nomeDoChip(id, cat) })),
    ...rascunho.calculados.map((c) => ({ id: c.id, nome: c.nome })),
  ];
  const nomeDe = (id: string | null) => alvos.find((a) => a.id === id)?.nome ?? id ?? "";

  return (
    <section aria-label={t("Filtro Quantitativo")} className="mt-10">
      <h3 className="flex items-center gap-2 text-[13px] font-bold text-casca-texto">
        <ListFilter size={14} aria-hidden className="text-casca-suave" />
        {t("Filtro Quantitativo")}
        <AjudaDoEditor texto={t("Filtra pelo valor de um indicador depois de agrupar: por exemplo, só as origens com mais de 10 ganhos.")} />
      </h3>
      <ul className="mt-3 flex flex-col gap-3">
        {rascunho.filtroQuantitativo.map((f) => {
          const comErro = erros.some((e) => e.secao === "filtro_quantitativo" && e.condicao === f.chave);
          const unidade = rascunho.calculados.find((c) => c.id === f.indicador)?.formato;
          return (
            <li key={f.chave} className="rounded-[6px] border border-casca-borda p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-casca-texto">{nomeDe(f.indicador)}</span>
                <button
                  type="button"
                  aria-label={t("Remover {nome}").replace("{nome}", nomeDe(f.indicador))}
                  onClick={() => mudar((r) => removerFiltroQuantitativo(r, f.chave))}
                  className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[13px] text-casca-suave">{t("é")}</span>
                <SeletorDaCasca
                  aria-label={t("Operador")}
                  className="h-8 flex-1"
                  valor={f.op}
                  opcoes={OPERADORES_QUANTITATIVOS.map((op) => ({ valor: op, rotulo: t(ROTULO_DO_OPERADOR[op]) }))}
                  aoMudar={(v) => v && mudar((r) => mudarFiltroQuantitativo(r, f.chave, { op: v }))}
                />
                <span className="flex items-center gap-1">
                  {unidade === "moeda" ? <span className="text-[13px] text-casca-suave">R$</span> : null}
                  <input
                    inputMode="decimal"
                    aria-label={t("Valor")}
                    defaultValue={f.valor === null ? "" : String(f.valor).replace(".", ",")}
                    onChange={(e) => mudar((r) => mudarFiltroQuantitativo(r, f.chave, { valor: textoDoNumeroBr(e.target.value) }))}
                    className="h-8 w-20 rounded-[4px] border border-casca-borda bg-surface px-2 text-[13px] outline-none focus-visible:border-casca-marca"
                  />
                  {unidade === "percentual" ? <span className="text-[13px] text-casca-suave">%</span> : null}
                </span>
              </div>
              {comErro ? <p className="mt-1 text-[12px] text-casca-alerta">{t("campo obrigatório")}</p> : null}
            </li>
          );
        })}
      </ul>
      {rascunho.filtroQuantitativo.length < FILTROS_QUANTITATIVOS_MAX ? (
        <div className="mt-2">
          <Popover open={aberto} onOpenChange={setAberto}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-[13px] text-casca-marca hover:bg-casca-raia">
                <Plus size={14} aria-hidden />
                {t("Adicionar indicador")}
              </button>
            </PopoverTrigger>
            <PainelSuspenso className="w-[260px] p-1" sideOffset={4}>
              {alvos.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-casca-suave">{t("Nenhum indicador selecionado")}</p>
              ) : (
                <ul>
                  {alvos.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => {
                          mudar((r) => adicionarFiltroQuantitativo(r, a.id));
                          setAberto(false);
                        }}
                        className="flex h-9 w-full items-center rounded-[2px] px-3 text-left text-[13px] text-casca-texto hover:bg-casca-marca-suave"
                      >
                        {a.nome}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </PainelSuspenso>
          </Popover>
        </div>
      ) : null}
    </section>
  );
}
