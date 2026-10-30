"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import {
  ORDEM_PADRAO,
  type AgenteDoFiltro,
  type ColunaDeOrdem,
  type Ordem,
  type StatusDoFiltro,
  type Visao,
} from "@/lib/escale/automacoes/tipos";

export const CHAVE_DA_LISTA = "escale:automacoes:lista";
const TODAS: Visao = { tipo: "todas" };

type Guardado = { visao: Visao; ordem: Ordem; porPagina: number };

function lerGuardado(): Partial<Guardado> {
  try {
    const bruto = window.localStorage.getItem(CHAVE_DA_LISTA);
    return bruto ? (JSON.parse(bruto) as Partial<Guardado>) : {};
  } catch {
    return {};
  }
}

function gravarGuardado(g: Guardado): void {
  try {
    window.localStorage.setItem(CHAVE_DA_LISTA, JSON.stringify(g));
  } catch {
    /* navegador sem armazenamento: a lista só não lembra */
  }
}

/**
 * O ESTADO DA LISTA DE AUTOMAÇÕES (4.12): visão, busca, filtros, ordem, página e seleção.
 * A visão, a ordem e o "por página" são lembrados no navegador (L26); busca e filtros
 * recomeçam vazios. Mudar visão, busca, filtro, ordem ou "por página" volta à página 1;
 * mudar visão ou filtro também limpa a seleção. Tudo imutável.
 */
export function useEstadoDaLista(pastasExistentes: readonly string[]) {
  const [visaoGuardada, setVisaoGuardada] = useState<Visao>(TODAS);
  const [busca, setBuscaBruta] = useState("");
  const [status, setStatusBruto] = useState<readonly StatusDoFiltro[]>([]);
  const [agentes, setAgentesBruto] = useState<readonly AgenteDoFiltro[]>([]);
  const [ordem, setOrdem] = useState<Ordem>(ORDEM_PADRAO);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPaginaBruto] = useState<number>(POR_PAGINA_PADRAO);
  const [selecionadas, setSelecionadas] = useState<ReadonlySet<string>>(new Set());
  const [lido, setLido] = useState(false);

  useEffect(() => {
    const g = lerGuardado();
    if (g.visao) setVisaoGuardada(g.visao);
    if (g.ordem) setOrdem(g.ordem);
    if (typeof g.porPagina === "number") setPorPaginaBruto(g.porPagina);
    setLido(true);
  }, []);

  useEffect(() => {
    if (lido) gravarGuardado({ visao: visaoGuardada, ordem, porPagina });
  }, [lido, visaoGuardada, ordem, porPagina]);

  // Pasta que não existe mais vira "Todas" (sem apagar o que foi guardado).
  const visao: Visao =
    visaoGuardada.tipo === "pasta" && !pastasExistentes.includes(visaoGuardada.id) ? TODAS : visaoGuardada;

  const limparSelecao = useCallback(() => setSelecionadas(new Set()), []);

  const setVisao = useCallback((v: Visao) => {
    setVisaoGuardada(v);
    setPagina(1);
    setSelecionadas(new Set());
  }, []);
  const setBusca = useCallback((q: string) => {
    setBuscaBruta(q);
    setPagina(1);
  }, []);
  const setStatus = useCallback((s: readonly StatusDoFiltro[]) => {
    setStatusBruto(s);
    setPagina(1);
    setSelecionadas(new Set());
  }, []);
  const setAgentes = useCallback((a: readonly AgenteDoFiltro[]) => {
    setAgentesBruto(a);
    setPagina(1);
    setSelecionadas(new Set());
  }, []);
  const setPorPagina = useCallback((n: number) => {
    setPorPaginaBruto(n);
    setPagina(1);
  }, []);

  /** Clicar na coluna atual inverte; em outra, começa em `asc` (a data começa em `desc`). */
  const alternarOrdem = useCallback((coluna: ColunaDeOrdem) => {
    setOrdem((o) =>
      o.coluna === coluna
        ? { coluna, direcao: o.direcao === "asc" ? "desc" : "asc" }
        : { coluna, direcao: coluna === "atualizada" ? "desc" : "asc" },
    );
    setPagina(1);
  }, []);

  const alternarSelecao = useCallback((id: string) => {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }, []);

  const selecionarPagina = useCallback((ids: readonly string[], marcar: boolean) => {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      for (const id of ids) {
        if (marcar) nova.add(id);
        else nova.delete(id);
      }
      return nova;
    });
  }, []);

  return useMemo(
    () => ({
      visao,
      setVisao,
      busca,
      setBusca,
      status,
      setStatus,
      agentes,
      setAgentes,
      ordem,
      alternarOrdem,
      pagina,
      setPagina,
      porPagina,
      setPorPagina,
      selecionadas,
      alternarSelecao,
      selecionarPagina,
      limparSelecao,
    }),
    [
      visao, setVisao, busca, setBusca, status, setStatus, agentes, setAgentes, ordem, alternarOrdem,
      pagina, porPagina, setPorPagina, selecionadas, alternarSelecao, selecionarPagina, limparSelecao,
    ],
  );
}
