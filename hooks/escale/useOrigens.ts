"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { IconeDeGrupo, Origens } from "@/lib/escale/origens/regras";

/**
 * A ESCRITA DO PAINEL ORIGENS (fork Escale, Fases 1A e 1B).
 *
 * Toda mutação RESOLVE as origens relidas do banco e a tela aplica isso — o
 * desenho de `hooks/pipelines/usePipelines.ts`: depender do `router.refresh()`
 * para mostrar o efeito da própria ação é corrida contra os prefetches. As rotas
 * do fork já devolvem `{ data: Origens }`; depois de uma rota do ORIGINAL
 * (`/api/v1/pipelines…`, que devolve a lista de funis dele) a mutação relê pelo
 * `GET /api/v1/pipeline-groups`. O refresh continua, para a PRÓXIMA navegação.
 */
export type RespostaDeOrigens = { data: Origens };
type ListaDoOriginal = { data: { pipelines: Array<{ id: string; name: string }> } };

const GRUPOS = "/api/v1/pipeline-groups";
const doGrupo = (id: string) => `${GRUPOS}/${encodeURIComponent(id)}`;
const doFunil = (id: string) => `/api/v1/pipelines/${encodeURIComponent(id)}`;
const grupoDoFunil = (id: string) => `${doFunil(id)}/grupo`;

async function reler(): Promise<Origens> {
  return (await apiClient.get<RespostaDeOrigens>(GRUPOS)).data;
}

function useAoTerminar() {
  const router = useRouter();
  return () => router.refresh();
}

export function useCriarGrupo() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.post<RespostaDeOrigens>(GRUPOS, { name })).data,
    onSettled,
  });
}

export interface MudancaDeGrupo {
  name?: string;
  color?: string | null;
  icon?: IconeDeGrupo;
  is_archived?: boolean;
  /** 1J (Q6): quem tem acesso ao grupo (ids); vazia = sem restrição. */
  pessoas?: string[];
}

export function useAtualizarGrupo() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: MudancaDeGrupo }) =>
      (await apiClient.patch<RespostaDeOrigens>(doGrupo(id), mudanca)).data,
    onSettled,
  });
}

export function useExcluirGrupo() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, destino }: { id: string; destino: string | null }) => {
      const caminho = destino ? `${doGrupo(id)}?destino=${encodeURIComponent(destino)}` : doGrupo(id);
      return (await apiClient.delete<RespostaDeOrigens>(caminho)).data;
    },
    onSettled,
  });
}

export function useMoverFunil() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ funilId, groupId }: { funilId: string; groupId: string }) =>
      (await apiClient.put<RespostaDeOrigens>(grupoDoFunil(funilId), { group_id: groupId })).data,
    onSettled,
  });
}

/**
 * Cria pela rota do original (que dá as etapas iniciais e o slug) e depois põe
 * no grupo. Entre as duas escritas o funil fica no "Geral" (gatilho da 9002) —
 * se a segunda falhar, ele aparece lá, nunca some.
 */
export function useCriarOrigem() {
  const onSettled = useAoTerminar();
  const t = useT();
  return useMutation({
    mutationFn: async ({ name, groupId }: { name: string; groupId: string }) => {
      const nome = name.trim();
      const lista = await apiClient.post<ListaDoOriginal>("/api/v1/pipelines", { name: nome });
      const novo = lista.data.pipelines.find((p) => p.name === nome);
      if (!novo) throw new Error(t("A origem foi criada, mas não apareceu na lista. Recarregue a página."));
      const origens = (await apiClient.put<RespostaDeOrigens>(grupoDoFunil(novo.id), { group_id: groupId })).data;
      return { origens, id: novo.id };
    },
    onSettled,
  });
}

export interface MudancaDeOrigem {
  name?: string;
  groupId?: string;
  tornarPadrao?: boolean;
}

export function useAtualizarOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: MudancaDeOrigem }) => {
      if (mudanca.name !== undefined) await apiClient.patch(doFunil(id), { name: mudanca.name.trim() });
      if (mudanca.tornarPadrao) await apiClient.patch(doFunil(id), { is_default: true });
      if (mudanca.groupId !== undefined) {
        return (await apiClient.put<RespostaDeOrigens>(grupoDoFunil(id), { group_id: mudanca.groupId })).data;
      }
      return reler();
    },
    onSettled,
  });
}

export function useArquivarOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(doFunil(id));
      return reler();
    },
    onSettled,
  });
}

export function useDesarquivarOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(doFunil(id), { is_archived: false });
      return reler();
    },
    onSettled,
  });
}

export function useExcluirOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${doFunil(id)}?definitivo=1`);
      return reler();
    },
    onSettled,
  });
}
