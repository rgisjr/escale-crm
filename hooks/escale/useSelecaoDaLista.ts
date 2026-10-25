"use client";
import { useEffect, useRef, useState } from "react";

import {
  SELECIONAR_TODOS,
  SEM_SELECAO,
  alternarLinha,
  estadoDaPagina,
  linhaMarcada,
  marcarPagina,
  selecaoDeIds,
  selecionarQuantidade,
  IDS_MAX,
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
  resolverPrimeiros,
  aoFalharAoResolver,
}: {
  linhas: ReadonlyArray<{ id: string }>;
  total: number;
  primeiro: number;
  chaveDaConsulta: string;
  /** Os ids dos N primeiros da consulta de agora (até `IDS_MAX`): congelam o "Selecionar [N]". */
  resolverPrimeiros?: (n: number) => Promise<string[]>;
  aoFalharAoResolver?: () => void;
}) {
  const [selecao, setSelecao] = useState<Selecao>(SEM_SELECAO);
  // A consulta que valia no clique: se mudou até a resposta chegar, a resposta é de outra lista.
  const consultaAtual = useRef(chaveDaConsulta);
  useEffect(() => {
    consultaAtual.current = chaveDaConsulta;
  }, [chaveDaConsulta]);

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
    selecionarQuantidade: (n: number) => {
      const porQuantidade = selecionarQuantidade(n, total);
      const quantos = porQuantidade.tipo === "todos" ? porQuantidade.quantidade : null;
      // Só congela o que cabe numa seleção por ids; o resto segue por quantidade.
      if (resolverPrimeiros === undefined || quantos === null || quantos > IDS_MAX)
        return setSelecao(porQuantidade);
      const chave = chaveDaConsulta;
      resolverPrimeiros(quantos)
        .then((ids) => {
          if (consultaAtual.current !== chave) return;
          setSelecao(selecaoDeIds(ids));
        })
        .catch(() => aoFalharAoResolver?.());
    },
    limpar: () => setSelecao(SEM_SELECAO),
  };
}
