"use client";
import { useState, type ReactNode } from "react";

import type { CuratedField } from "@/app/app/webhooks/_components/RuleEditor";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_HORA, type CampoDeHorario, type OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";
import {
  ORDEM_DAS_CATEGORIAS,
  ROTULO_DA_CATEGORIA,
  buscarItens,
  itensDaCategoria,
  rotuloDoItem,
  type CategoriaDaCondicao,
  type ItemDaCondicao,
} from "@/lib/escale/automacoes/fluxo/condicoes";
import { Calendar, Clock, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { EditorDeHorario } from "./EditorDeHorario";

export type EscolhaDaCondicao =
  | { tipo: "campo"; campo: CuratedField }
  | { tipo: "avancado" }
  | { tipo: "horario"; campo: CampoDeHorario; op: OperadorDeHorario; value: string };

/**
 * O SELETOR DE CONDIÇÃO DA CLINT (print de 03/11/2026): busca "Buscar" com a lupa à direita, a coluna
 * de tipos ("Recomendados" em cinza no topo, Campos, Contato, Negócio, Horário atual) e, à direita, as
 * opções do tipo. Hora e Data abrem o editor no mesmo balão.
 */
export function SeletorDeCondicao({
  campos,
  fuso,
  aoEscolher,
  children,
}: {
  campos: readonly CuratedField[];
  fuso: string;
  aoEscolher: (escolha: EscolhaDaCondicao) => void;
  /** O botão que abre o balão (vai em `PopoverTrigger asChild`). */
  children: ReactNode;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDaCondicao>("campos");
  const [busca, setBusca] = useState("");
  const [horario, setHorario] = useState<CampoDeHorario | null>(null);
  const buscando = busca.trim() !== "";
  const itens = buscando ? buscarItens(busca, campos, t) : itensDaCategoria(categoria, campos);

  function mudarAberto(valor: boolean) {
    setAberto(valor);
    if (!valor) {
      setHorario(null);
      setBusca("");
    }
  }

  function escolher(item: ItemDaCondicao) {
    if (item.tipo === "em_breve") return;
    if (item.tipo === "horario") {
      setHorario(item.campo);
      return;
    }
    aoEscolher(item.tipo === "campo" ? { tipo: "campo", campo: item.campo } : { tipo: "avancado" });
    mudarAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PainelSuspenso side="right" align="start" sideOffset={12} className="p-0">
        {horario ? (
          <EditorDeHorario
            campo={horario}
            fuso={fuso}
            aoVoltar={() => setHorario(null)}
            aoCancelar={() => mudarAberto(false)}
            aoConfirmar={(op, value) => {
              aoEscolher({ tipo: "horario", campo: horario, op, value });
              mudarAberto(false);
            }}
          />
        ) : (
          <div className="flex w-[560px] flex-col p-4" data-testid="seletor-de-condicao">
            <label className="flex h-10 items-center gap-2 rounded-md bg-casca-raia px-3">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar")}
                aria-label={t("Buscar")}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-casca-texto outline-hidden placeholder:text-casca-meta"
              />
              <Search size={16} aria-hidden className="text-casca-texto-2" />
            </label>
            <div className="mt-4 flex min-h-[320px]">
              <nav aria-label={t("Tipos de condição")} className="flex w-[170px] shrink-0 flex-col gap-1 border-r border-casca-divisoria">
                <span className="flex h-10 items-center text-[14px] text-casca-meta">{t("Recomendados")}</span>
                {ORDEM_DAS_CATEGORIAS.map((c) => {
                  const ativa = !buscando && categoria === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={ativa}
                      onClick={() => {
                        setBusca("");
                        setCategoria(c);
                      }}
                      className={cn("flex h-10 items-center text-left text-[14px]", ativa ? "font-medium text-casca-marca" : "text-casca-texto")}
                    >
                      {t(ROTULO_DA_CATEGORIA[c])}
                    </button>
                  );
                })}
              </nav>
              <ul className="flex min-w-0 flex-1 flex-col gap-1 pl-10">
                {itens.length === 0 ? (
                  <li className="py-2 text-[13px] text-casca-suave">
                    {buscando ? `${t("Sem resultados para")} “${busca.trim()}”` : t("Nenhuma opção para este gatilho")}
                  </li>
                ) : null}
                {itens.map((item) => (
                  <li key={`${item.tipo}-${rotuloDoItem(item)}`}>
                    <ItemDaLista item={item} aoEscolher={escolher} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </PainelSuspenso>
    </Popover>
  );
}

function ItemDaLista({ item, aoEscolher }: { item: ItemDaCondicao; aoEscolher: (item: ItemDaCondicao) => void }) {
  const t = useT();
  const emBreve = item.tipo === "em_breve";
  const Icone = item.tipo === "horario" ? (item.campo === CAMPO_HORA ? Clock : Calendar) : emBreve ? Clock : null;
  return (
    <button
      type="button"
      aria-disabled={emBreve || undefined}
      onClick={() => aoEscolher(item)}
      className={cn(
        "flex h-10 w-full items-center gap-2 text-left text-[14px] text-casca-texto",
        emBreve ? "cursor-not-allowed opacity-60" : "hover:text-casca-marca",
      )}
    >
      {Icone ? <Icone size={16} aria-hidden className="shrink-0 text-casca-texto-2" /> : null}
      <span className="min-w-0 truncate">{t(rotuloDoItem(item))}</span>
      {emBreve ? <span className="ml-2 rounded bg-casca-raia px-1.5 text-[10px] text-casca-texto-2">{t("Em breve")}</span> : null}
    </button>
  );
}
