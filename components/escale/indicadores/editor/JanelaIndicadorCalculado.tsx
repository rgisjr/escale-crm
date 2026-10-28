"use client";
import { useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import { nomeDoChip, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import {
  FORMATOS_NA_ORDEM_DA_TELA,
  ROTULO_DO_FORMATO,
  SIMBOLO_DA_OPERACAO,
  formatosDaOperacao,
  operacoesDoTipo,
  textoDaFormula,
} from "@/lib/escale/indicadores/editor/calculado";
import type { RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { OPERACOES, type Calculado, type FormatoDoCalculado, type Operacao } from "@/lib/escale/indicadores/pergunta";
import { cn } from "@/lib/utils";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela;
  /** O calculado sendo editado; `null` = novo. */
  editando: Calculado | null;
  /** O resultado do último Executar, para a prévia. */
  resultado: Resultado | undefined;
  aoSalvar: (c: Omit<Calculado, "id">) => void;
  aoCancelar: () => void;
};

const MENSAGEM_DA_PIZZA = "Em gráfico de pizza, a conta precisa somar ou multiplicar para as fatias representarem partes do todo.";
const MENSAGEM_DO_PERCENTUAL = "O formato percentual só vale para divisão, porque ele mostra a razão entre os dois indicadores.";

/** O modal "Indicador calculado" (print 10-052): nome, fórmula A op B, formato e a prévia no período atual. */
export function JanelaIndicadorCalculado({ rascunho, catalogo, editando, resultado, aoSalvar, aoCancelar }: Props) {
  const t = useT();
  const assunto = catalogo.assuntos.find((a) => a.id === rascunho.indicadores[0]?.split(".")[0]);
  const medidas = assunto?.medidas ?? [];
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [a, setA] = useState(editando?.a ?? "");
  const [b, setB] = useState(editando?.b ?? "");
  const [op, setOp] = useState<Operacao>(editando?.op ?? "divisao");
  const [formato, setFormato] = useState<FormatoDoCalculado>(editando?.formato ?? "numero");
  const operacoesLiberadas = operacoesDoTipo(rascunho.tipo);
  const formatosLiberados = formatosDaOperacao(op);
  const podeSalvar = nome.trim().length > 0 && a !== "" && b !== "";

  function escolherOperacao(nova: Operacao) {
    setOp(nova);
    // "Percentual" só existe na divisão: saindo dela, o formato volta para Número.
    if (!formatosDaOperacao(nova).includes(formato)) setFormato("numero");
  }

  // A prévia só existe se o calculado já está na foto do último Executar (a coluna `cN` com o mesmo nome).
  const posicao = editando ? rascunho.calculados.findIndex((c) => c.id === editando.id) : -1;
  const valorNaFoto = posicao >= 0 && resultado ? resultado.linhas[0]?.[`c${posicao}`] : undefined;
  const unidade = formato === "moeda" ? "valor" : formato === "percentual" ? "percentual" : "contagem";
  const operandoFora = [a, b].find((id) => id && !rascunho.indicadores.includes(id));
  const nomeDe = (id: string) => (id ? nomeDoChip(id, catalogo) : "…");

  let previa = t("Execute o gráfico para ver a prévia no período atual.");
  if (operandoFora) previa = t("{nome} entra no gráfico ao salvar. Execute o gráfico para ver a prévia.").replace("{nome}", nomeDe(operandoFora));
  else if (valorNaFoto !== undefined) previa = formatarValor(valorNaFoto === null ? null : Number(valorNaFoto), unidade);

  const opcoesDeMedida = medidas.map((m) => ({ valor: m.id, rotulo: nomeDoChip(m.id, catalogo) }));
  const rotuloDeSelecao = t("Selecione o indicador");

  return (
    <JanelaDaCasca aberta onFechar={aoCancelar} className="w-[440px] max-w-[440px] gap-0 p-0">
      <div className="flex h-14 items-center border-b border-casca-divisoria px-6">
        <DialogTitle className="text-[12px] font-semibold tracking-[0.06em] text-casca-texto uppercase">{t("INDICADOR CALCULADO")}</DialogTitle>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">
        <label className="flex flex-col gap-2 text-[13px] font-medium text-casca-texto">
          {t("Nome")}
          <input
            value={nome}
            maxLength={80}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("Ticket médio por vendedor")}
            className="h-8 rounded-[4px] bg-casca-busca px-3 text-[13px] font-normal outline-none focus-visible:ring-2 focus-visible:ring-casca-marca"
          />
        </label>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-casca-texto">{t("Fórmula")}</p>
          <SeletorDaCasca aria-label={t("Indicador A")} className="h-8" vazio={rotuloDeSelecao} valor={a} opcoes={opcoesDeMedida} aoMudar={setA} />
          <div className="flex gap-2">
            {OPERACOES.map((o) => {
              const liberada = operacoesLiberadas.includes(o);
              const botao = (
                <button
                  key={o}
                  type="button"
                  disabled={!liberada}
                  aria-pressed={op === o}
                  aria-label={t(o === "soma" ? "soma" : o === "subtracao" ? "subtração" : o === "multiplicacao" ? "multiplicação" : "divisão")}
                  onClick={() => escolherOperacao(o)}
                  className={cn(
                    "grid size-8 place-items-center rounded-[6px] border text-[14px] disabled:opacity-40",
                    op === o ? "border-casca-marca bg-casca-marca text-white" : "border-casca-borda text-casca-texto hover:bg-casca-raia",
                  )}
                >
                  {SIMBOLO_DA_OPERACAO[o]}
                </button>
              );
              return liberada ? botao : (
                <DicaAoPassar key={o} texto={t(MENSAGEM_DA_PIZZA)}>
                  {botao}
                </DicaAoPassar>
              );
            })}
          </div>
          <SeletorDaCasca aria-label={t("Indicador B")} className="h-8" vazio={rotuloDeSelecao} valor={b} opcoes={opcoesDeMedida} aoMudar={setB} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-casca-texto">{t("Formato do resultado")}</p>
          <div className="flex h-8 overflow-hidden rounded-[6px] border border-casca-borda">
            {FORMATOS_NA_ORDEM_DA_TELA.map((f) => {
              const liberado = formatosLiberados.includes(f);
              const botao = (
                <button
                  key={f}
                  type="button"
                  disabled={!liberado}
                  aria-pressed={formato === f}
                  onClick={() => setFormato(f)}
                  className={cn(
                    "h-full flex-1 text-[13px] disabled:opacity-40",
                    formato === f ? "bg-casca-marca text-white" : "text-casca-texto hover:bg-casca-raia",
                  )}
                >
                  {t(ROTULO_DO_FORMATO[f])}
                </button>
              );
              return liberado ? botao : (
                <DicaAoPassar key={f} texto={t(MENSAGEM_DO_PERCENTUAL)} bloco className="flex-1">
                  {botao}
                </DicaAoPassar>
              );
            })}
          </div>
        </div>
        <div className="rounded-[6px] bg-casca-raia p-4">
          <p className="text-[12px] text-casca-suave">{t("Prévia no período atual")}</p>
          <p className="mt-1 text-[13px] text-casca-texto">{previa}</p>
          {a && b ? <p className="mt-2 text-[13px] text-casca-suave">{textoDaFormula({ a, b, op }, (id) => nomeDe(id))}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-casca-divisoria px-6 py-3">
        <button type="button" onClick={aoCancelar} className="h-8 rounded-[6px] border border-casca-borda px-4 text-[13px] font-medium text-casca-texto hover:bg-casca-raia">
          {t("Cancelar")}
        </button>
        <button
          type="button"
          disabled={!podeSalvar}
          onClick={() => aoSalvar({ nome: nome.trim(), a, op, b, formato })}
          className="h-8 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:opacity-50"
        >
          {t("Salvar indicador")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
