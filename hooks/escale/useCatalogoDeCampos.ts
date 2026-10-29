"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NovoCampo, OrdemDoCatalogo, PatchDoCampo } from "@/lib/escale/campos/banco";
import { CATALOGO_VAZIO, type Catalogo, type ObjetoDeCampo } from "@/lib/escale/campos/regras";

export const CHAVE_DO_CATALOGO = (objeto: ObjetoDeCampo) => ["catalogo-de-campos", objeto] as const;

/**
 * Tempo máximo de uma gravação do catálogo (Frente E, 29/10/2026). Em 29/10 o
 * "Adicionar campo" ficou preso sem fim: o POST era um `fetch` cru, e o banco
 * (plano Free, 426 MB) demorou mais que a paciência da pessoa. 20 s cobre o
 * banco lento sem prender a janela; o GET do catálogo é mais curto porque a
 * tela tem como mostrar "Carregando…" e tentar de novo.
 *
 * ⚠️ O servidor NÃO cancela nada quando o cliente desiste (mesma lição do
 * `lib/api/client.ts`): o campo pode ter sido gravado DEPOIS do corte. Por isso
 * quem estoura o tempo recarrega o catálogo antes de avisar — a pessoa vê o
 * campo na lista (ou não) em vez de tentar de novo e levar "nome repetido".
 */
export const TEMPO_MAXIMO_MS = 20_000;
const TEMPO_MAXIMO_DO_GET_MS = 10_000;

export class ErroDoCatalogoNoCliente extends Error {
  constructor(message: string, readonly tempoEsgotado: boolean) {
    super(message);
    this.name = "ErroDoCatalogoNoCliente";
  }
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const mutante = Boolean(init?.method && init.method !== "GET");
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), mutante ? TEMPO_MAXIMO_MS : TEMPO_MAXIMO_DO_GET_MS);
  try {
    const r = await fetch(url, { ...init, signal: controle.signal, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
    const corpo = await r.json().catch(() => null);
    if (!r.ok) throw new ErroDoCatalogoNoCliente(corpo?.error?.message ?? "Ocorreu um erro ao salvar", false);
    return corpo.data as T;
  } catch (e) {
    // DOMException nem sempre é `instanceof Error` (jsdom, Safari antigo): compara pelo nome.
    if ((e as { name?: string } | null)?.name === "AbortError") {
      throw new ErroDoCatalogoNoCliente("Demorou demais. Confira a lista e tente de novo.", true);
    }
    throw e;
  } finally {
    clearTimeout(relogio);
  }
}

export function useCatalogoDeCampos(objeto: ObjetoDeCampo, ativo = true) {
  const q = useQuery({
    queryKey: CHAVE_DO_CATALOGO(objeto),
    queryFn: () => pedir<Catalogo>(`/api/v1/campos-do-crm?objeto=${objeto}`),
    enabled: ativo,
    staleTime: 60_000,
  });
  return { catalogo: q.data ?? CATALOGO_VAZIO, carregando: q.isLoading, erro: q.isError };
}

export function useMudarCatalogo(objeto: ObjetoDeCampo) {
  const qc = useQueryClient();
  // `alvo` é o objeto do catálogo mexido: o da aba, ou o escolhido no formulário de novo campo.
  //
  // Frente E (29/10/2026): não recarrega mais `["board"]` nem `["contact"]`. Quem
  // desenha rótulo e tipo lê o catálogo; valor de campo novo não existe em negócio
  // nenhum, e valor órfão de campo excluído ninguém desenha. Recarregar o quadro
  // inteiro e todos os contatos em memória era rajada sobre o banco já engasgado.
  // `["pipelines"]` fica: a tela de funis lista os campos obrigatórios por etapa.
  const depoisEm = (alvo: ObjetoDeCampo) => {
    void qc.invalidateQueries({ queryKey: CHAVE_DO_CATALOGO(alvo) });
    if (alvo === "negocio") void qc.invalidateQueries({ queryKey: ["pipelines"] });
  };
  const depois = () => depoisEm(objeto);
  // Estourou o tempo: o servidor pode ter gravado. Recarrega o catálogo do alvo
  // para a lista dizer a verdade antes de a pessoa repetir.
  const seEstourouEm = (alvo: ObjetoDeCampo) => (erro: Error) => {
    if (erro instanceof ErroDoCatalogoNoCliente && erro.tempoEsgotado) depoisEm(alvo);
  };
  const seEstourou = seEstourouEm(objeto);
  const base = `/api/v1/campos-do-crm`;
  return {
    criarCampo: useMutation({
      mutationFn: (e: NovoCampo) => pedir(base, { method: "POST", body: JSON.stringify(e) }),
      onSuccess: (_dados, e) => depoisEm(e.objeto),
      onError: (erro: Error, e) => seEstourouEm(e.objeto)(erro),
    }),
    mudarCampo: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: PatchDoCampo }) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "PATCH", body: JSON.stringify(patch) }),
      onSuccess: depois,
      onError: seEstourou,
    }),
    excluirCampo: useMutation({ mutationFn: (id: string) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "DELETE" }), onSuccess: depois, onError: seEstourou }),
    // Pelo formulário de novo campo o grupo nasce no objeto escolhido lá, que pode não ser o da aba.
    criarGrupo: useMutation({
      mutationFn: (g: string | { nome: string; objeto: ObjetoDeCampo }) => {
        const { nome, objeto: alvo } = typeof g === "string" ? { nome: g, objeto } : g;
        return pedir(`${base}/grupos`, { method: "POST", body: JSON.stringify({ objeto: alvo, nome }) });
      },
      onSuccess: (_dados, g) => depoisEm(typeof g === "string" ? objeto : g.objeto),
      onError: (erro: Error, g) => seEstourouEm(typeof g === "string" ? objeto : g.objeto)(erro),
    }),
    renomearGrupo: useMutation({
      mutationFn: ({ id, nome }: { id: string; nome: string }) => pedir(`${base}/grupos/${id}`, { method: "PATCH", body: JSON.stringify({ nome }) }),
      onSuccess: depois,
      onError: seEstourou,
    }),
    excluirGrupo: useMutation({ mutationFn: (id: string) => pedir(`${base}/grupos/${id}`, { method: "DELETE" }), onSuccess: depois, onError: seEstourou }),
    reordenar: useMutation({ mutationFn: (ordem: OrdemDoCatalogo) => pedir(`${base}/ordem`, { method: "PUT", body: JSON.stringify(ordem) }), onSuccess: depois, onError: seEstourou }),
  };
}
