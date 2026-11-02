"use client";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  MAXIMO_DA_PALAVRA,
  MAXIMO_DE_PALAVRAS,
  OPERADORES_DO_FILTRO,
  ROTULO_DO_OPERADOR,
  type OperadorDoFiltro,
} from "@/lib/escale/comentarios/constantes";
import { lerFiltro, type CondicaoDoFiltro } from "@/lib/escale/comentarios/filtro";
import type { FiltroDoCaminho } from "@/lib/escale/comentarios/schema";
import { Plus, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O FILTRO COM OPERADORES DA CLINT (fork Escale, Fase 10D, D3): "É", "Contém", "Contém palavra inteira",
 * "Começa com", "Termina com" e "Não contém". Substitui o campo de chips da 10B no caminho do comentário
 * e serve aos gatilhos de direct. Sempre grava no formato `condicoes`. Provisório: sem print do painel.
 */
export function FiltroDePalavras({
  filtro,
  aoMudar,
}: {
  filtro: FiltroDoCaminho;
  aoMudar: (filtro: FiltroDoCaminho) => void;
}) {
  const t = useT();
  const lido = lerFiltroParaTela(filtro);
  if (lido.modo === "qualquer") return null;
  const { condicoes, combinar } = lido;
  const positivas = condicoes.filter((c) => c.operador !== "nao_contem").length;

  const gravar = (proximas: CondicaoDoFiltro[], comb = combinar) =>
    aoMudar({ modo: "palavras", condicoes: proximas, combinar: comb });
  const mudar = (i: number, parte: Partial<CondicaoDoFiltro>) =>
    gravar(condicoes.map((c, j) => (j === i ? { ...c, ...parte } : c)));

  return (
    <div className="flex flex-col gap-2">
      {condicoes.map((c, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={cn("w-[180px] shrink-0", c.operador === "nao_contem" && "text-casca-alerta")}>
              <SeletorDaCasca
                aria-label={t("Operador")}
                aparencia="janela"
                valor={c.operador}
                aoMudar={(v) => v && mudar(i, { operador: v as OperadorDoFiltro })}
                opcoes={OPERADORES_DO_FILTRO.map((op) => ({ valor: op, rotulo: t(ROTULO_DO_OPERADOR[op]) }))}
              />
            </div>
            <input
              value={c.valor}
              maxLength={MAXIMO_DA_PALAVRA}
              onChange={(e) => mudar(i, { valor: e.target.value })}
              aria-label={t("Palavra do filtro")}
              placeholder={t("Digite a palavra")}
              className="h-9 min-w-0 flex-1 rounded-[4px] bg-casca-raia px-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
            <button
              type="button"
              aria-label={t("Remover condição")}
              onClick={() => gravar(condicoes.filter((_, j) => j !== i))}
              className="grid size-7 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
          {c.operador === "nao_contem" ? (
            <p className="flex items-center gap-1.5 text-[11px] text-casca-alerta">
              {t("Bloqueia o disparo")}
              <AjudaDaCasca texto={t("\"Não contém\" sempre impede o disparo, qualquer que seja a combinação.")} />
            </p>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        disabled={condicoes.length >= MAXIMO_DE_PALAVRAS}
        onClick={() => gravar([...condicoes, { operador: "contem", valor: "" }])}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[12px] font-medium text-casca-marca-forte hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={12} aria-hidden />
        {t("Adicionar condição")}
      </button>
      {positivas > 1 ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-casca-suave">{t("Combinar palavras com")}</p>
          <SeletorDaCasca
            aria-label={t("Combinar palavras com")}
            aparencia="janela"
            valor={combinar}
            aoMudar={(v) => v && gravar(condicoes, v)}
            opcoes={[
              { valor: "qualquer", rotulo: t("Qualquer palavra") },
              { valor: "todas", rotulo: t("Todas as palavras") },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Como `lerFiltro`, mas mantém as linhas em branco que a pessoa acabou de adicionar. */
function lerFiltroParaTela(filtro: FiltroDoCaminho) {
  if (filtro.modo === "qualquer") return { modo: "qualquer" as const };
  const apenasPreenchidas = lerFiltro(filtro);
  const emBranco = (filtro.condicoes ?? []).filter((c) => c.valor.trim() === "");
  if (emBranco.length === 0 && apenasPreenchidas.modo === "palavras") return apenasPreenchidas;
  return {
    modo: "palavras" as const,
    condicoes: [
      ...(filtro.palavras ?? []).filter((p) => p.trim() !== "").map((valor) => ({ operador: "contem" as const, valor })),
      ...(filtro.condicoes ?? []),
    ],
    combinar: filtro.combinar,
  };
}
