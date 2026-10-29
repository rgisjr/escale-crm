"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ContatoDaEmpresa, FichaDaEmpresa, NegocioDaEmpresa } from "@/lib/escale/empresas/banco";
import { fetchComTempoMaximo } from "@/lib/escale/fetch-com-tempo-maximo";

/** Erro da API com o status, para a ficha separar "não achei" de "falhou". */
export class ErroDaApiDaEmpresa extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

// `fetchComTempoMaximo` (Frente F, 29/10/2026): com o banco engasgado a ficha ficava
// presa sem fim; agora a leitura desiste em 10 s e a escrita em 20 s, e o erro
// chega com a mensagem de tela. 404 continua ErroDaApiDaEmpresa com status.
async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetchComTempoMaximo(url, init);
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new ErroDaApiDaEmpresa(corpo?.error?.message ?? "Não foi possível completar a ação.", r.status);
  return corpo.data as T;
}

const json = (metodo: string, corpo: unknown): RequestInit => ({
  method: metodo,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(corpo),
});

export function useEmpresa(id: string) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => pedir<FichaDaEmpresa>(`/api/v1/empresas/${id}`),
    staleTime: 15_000,
    retry: (vezes, erro) => !(erro instanceof ErroDaApiDaEmpresa && erro.status === 404) && vezes < 2,
  });
}

export function useContatosDaEmpresa(id: string) {
  return useQuery({
    queryKey: ["companies", id, "contatos"],
    queryFn: () => pedir<ContatoDaEmpresa[]>(`/api/v1/empresas/${id}/contatos`),
    staleTime: 15_000,
  });
}

export function useNegociosDaEmpresa(id: string, ativo = true) {
  return useQuery({
    queryKey: ["companies", id, "negocios"],
    queryFn: () => pedir<NegocioDaEmpresa[]>(`/api/v1/empresas/${id}/negocios`),
    enabled: ativo,
    staleTime: 15_000,
  });
}

/** As escritas da ficha da empresa; cada uma invalida só a ficha dela, a lista de empresas e os contatos. */
export function useMudarEmpresa(idOuNulo: string | null) {
  const qc = useQueryClient();
  // Sem empresa (a aba Empresa do negócio, antes do vínculo) as escritas ficam sem alvo e falham.
  const id = idOuNulo ?? "";
  const depois = () => {
    void qc.invalidateQueries({ queryKey: ["companies", id] });
    void qc.invalidateQueries({ queryKey: ["companies", "lista-da-casca"] });
    void qc.invalidateQueries({ queryKey: ["companies", "total-da-casca"] });
    void qc.invalidateQueries({ queryKey: ["contacts"] });
    void qc.invalidateQueries({ queryKey: ["empresa-do-contato"] });
  };
  return {
    mudarCampo: useMutation({
      mutationFn: (p: { chave: string; valor: unknown }) => pedir(`/api/v1/empresas/${id}`, json("PATCH", p)),
      onSuccess: depois,
    }),
    vincular: useMutation({
      mutationFn: (contatoId: string) => pedir(`/api/v1/empresas/${id}/contatos`, json("POST", { contato_id: contatoId })),
      onSuccess: depois,
    }),
    remover: useMutation({
      mutationFn: (p: { contatoId: string; novoPrincipal?: string | null }) =>
        pedir<{ desfecho: "removido" | "empresa_excluida" }>(
          `/api/v1/empresas/${id}/contatos/${p.contatoId}${p.novoPrincipal ? `?novo_principal=${p.novoPrincipal}` : ""}`,
          { method: "DELETE" },
        ),
      onSuccess: depois,
    }),
    tornarPrincipal: useMutation({
      mutationFn: (contatoId: string | null) => pedir(`/api/v1/empresas/${id}/principal`, json("PUT", { contato_id: contatoId })),
      onSuccess: depois,
    }),
    excluir: useMutation({
      mutationFn: () => pedir(`/api/v1/empresas/${id}`, { method: "DELETE" }),
      onSuccess: depois,
    }),
  };
}
