"use client";
import { useCallback, useSyncExternalStore } from "react";

import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import {
  chaveDosRecentes,
  comRecente,
  desafixar,
  fixar,
  lerRecentes,
  type NegocioRecente,
  type Recentes,
} from "@/lib/escale/recentes/regras";

const EVENTO = "escale:negocios-recentes";
/** O vazio é UMA constante: a mesma referência no servidor e no cliente (o React compara por referência). */
const VAZIO: Recentes = { fixados: [], recentes: [] };
/** O último texto lido por chave: o mesmo texto devolve o MESMO objeto. */
const ultimos = new Map<string, { bruto: string | null; estado: Recentes }>();

function lerBruto(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function instantaneo(chave: string | null): Recentes {
  if (!chave) return VAZIO;
  const bruto = lerBruto(chave);
  const visto = ultimos.get(chave);
  if (visto && visto.bruto === bruto) return visto.estado;
  const estado = lerRecentes(bruto);
  ultimos.set(chave, { bruto, estado });
  return estado;
}

function assinar(avisar: () => void): () => void {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

/** Grava o estado e avisa esta aba. `false` quando o navegador não guarda (aba anônima, cota cheia). */
function gravar(chave: string, estado: Recentes): boolean {
  try {
    window.localStorage.setItem(chave, JSON.stringify(estado));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(EVENTO));
  return true;
}

/**
 * OS NEGÓCIOS FIXADOS E RECENTES (fork Escale, Fase 1E). No servidor, e sem
 * chave, o estado é o vazio: o primeiro render não lê o navegador (ver
 * `tests/unit/hidratacao-useState-nao-le-o-navegador.test.ts`). O evento próprio
 * avisa esta aba; o `storage`, as outras.
 */
export function useNegociosRecentes(chave: string | null) {
  const { fixados, recentes } = useSyncExternalStore(
    assinar,
    () => instantaneo(chave),
    () => VAZIO,
  );

  const registrar = useCallback(
    (novo: NegocioRecente) => {
      if (!chave) return;
      gravar(chave, comRecente(lerRecentes(lerBruto(chave)), novo));
    },
    [chave],
  );

  /** Fixa ou desafixa. `"limite"` quando já há 5 fixados (nada é gravado); `null` quando deu certo. */
  const alternarFixo = useCallback(
    (id: string): "limite" | null => {
      if (!chave) return null;
      const estado = lerRecentes(lerBruto(chave));
      const proximo = estado.fixados.some((x) => x.id === id)
        ? desafixar(estado, id)
        : fixar(estado, id);
      if (proximo === "limite") return "limite";
      gravar(chave, proximo);
      return null;
    },
    [chave],
  );

  return { fixados, recentes, registrar, alternarFixo };
}

/** A chave desta pessoa nesta organização, ou `null` antes de a sessão chegar. */
export function useChaveDosRecentes(): string | null {
  const usuario = useUser();
  const org = useActiveOrg();
  return org && usuario ? chaveDosRecentes(org.orgId, usuario.id) : null;
}
