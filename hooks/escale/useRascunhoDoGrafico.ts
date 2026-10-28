"use client";
import { useCallback, useMemo, useState } from "react";

import type { CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { perguntaDoRascunho, type ErroDoRascunho } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import type { RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";

const SEM_CATALOGO: CatalogoDaTela = {
  assuntos: [],
  camposPersonalizados: { negocio: [], contato: [], empresa: [] },
};

/**
 * O estado do editor (fork Escale, Fase 7D): o rascunho, a "foto" do último Executar (D10: a prévia só
 * roda ao Executar) e os erros das seções. `mudar` recebe uma função pura que devolve uma cópia.
 */
export function useRascunhoDoGrafico(inicial: RascunhoDoGrafico, catalogo: CatalogoDaTela | undefined) {
  const cat = catalogo ?? SEM_CATALOGO;
  const [rascunho, setRascunho] = useState<RascunhoDoGrafico>(inicial);
  const [erros, setErros] = useState<readonly ErroDoRascunho[]>([]);
  const [foto, setFoto] = useState<Pergunta | null>(null);
  const [rodada, setRodada] = useState(-1);

  const mudar = useCallback((f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => {
    setRascunho((atual) => f(atual));
    setErros([]);
  }, []);

  const executar = useCallback((): boolean => {
    const res = perguntaDoRascunho(rascunho, cat);
    if (!res.ok) {
      setErros(res.erros);
      return false;
    }
    setErros([]);
    setFoto(res.pergunta);
    setRodada((r) => r + 1);
    return true;
  }, [rascunho, cat]);

  /** Só confere o rascunho e marca os erros das seções (o "Adicionar ao dashboard" sem consultar). */
  const validar = useCallback((): boolean => {
    const res = perguntaDoRascunho(rascunho, cat);
    setErros(res.ok ? [] : res.erros);
    return res.ok;
  }, [rascunho, cat]);

  /** Mudou algo que muda a consulta desde o último Executar (opções visuais e tipo redesenham sem consultar). */
  const pendente = useMemo(() => {
    if (!foto) return false;
    const agora = perguntaDoRascunho(rascunho, cat);
    return !agora.ok || JSON.stringify(agora.pergunta) !== JSON.stringify(foto);
  }, [foto, rascunho, cat]);

  return { rascunho, mudar, erros, foto, rodada: Math.max(rodada, 0), executar, validar, pendente };
}
