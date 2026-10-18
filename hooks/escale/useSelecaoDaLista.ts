"use client";
import { useEffect, useState } from "react";

import {
  SELECIONAR_TODOS,
  SEM_SELECAO,
  alternarLinha,
  estadoDaPagina,
  linhaMarcada,
  marcarPagina,
  selecionarQuantidade,
  todosMarcados,
  totalSelecionado,
  type Selecao,
} from "@/lib/escale/contatos/selecao";

/**
 * A seleção da lista de contatos (fork Escale, Fase 2B; decisão B3). Mudar
 * busca, visão ou filtro (`chaveDaConsulta`) limpa; mudar de página não.
 */
export function useSelecaoDaLista({
  linhas,
  total,
  primeiro,
  chaveDaConsulta,
}: {
  linhas: ReadonlyArray<{ id: string }>;
  total: number;
  primeiro: number;
  chaveDaConsulta: string;
}) {
  const [selecao, setSelecao] = useState<Selecao>(SEM_SELECAO);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- a seleção é da consulta: outra busca, outro conjunto
  useEffect(() => setSelecao(SEM_SELECAO), [chaveDaConsulta]);

  const estado = estadoDaPagina(selecao, linhas, primeiro);
  const modoDaFaixa: "pagina" | "todos" | null = todosMarcados(selecao)
    ? "todos"
    : selecao.tipo === "ids" && estado === true && total > linhas.length
      ? "pagina"
      : null;

  return {
    selecao,
    estado,
    quantidade: totalSelecionado(selecao, total),
    modoDaFaixa,
    marcada: (id: string, i: number) => linhaMarcada(selecao, id, primeiro + i),
    alternar: (id: string, i: number, marcar: boolean) =>
      setSelecao((s) => alternarLinha(s, id, primeiro + i, marcar)),
    marcarPagina: (marcar: boolean) => setSelecao((s) => marcarPagina(s, linhas, primeiro, marcar)),
    selecionarTodos: () => setSelecao(SELECIONAR_TODOS),
    selecionarQuantidade: (n: number) => setSelecao(selecionarQuantidade(n, total)),
    limpar: () => setSelecao(SEM_SELECAO),
  };
}
