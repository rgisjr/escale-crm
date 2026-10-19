"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";
import type { ChannelRoutingSettings } from "@/lib/routing/channel-policies";

/**
 * OS DISPOSITIVOS NA CASCA (fork Escale, Fase 3C; E2; N10) sobre as rotas do
 * original: os responsáveis por canal (0228; gerente + MFA) e as ações do
 * dispositivo (admin).
 */
export function useRoteamentoDosCanais(enabled = true) {
  return useQuery({
    queryKey: ["channel-routing-settings"],
    enabled,
    queryFn: async () =>
      apiClient.get<{ data: ChannelRoutingSettings }>("/api/v1/settings/routing/channels"),
    select: (r) => r.data,
    retry: false,
    staleTime: 30_000,
  });
}

const ehMfa = (err: unknown) => (err as { code?: string }).code === "mfa_required";

export function useGravarRoteamento() {
  const t = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { channel_session_id: string; user_ids: string[] }) =>
      apiClient.patch("/api/v1/settings/routing/channels", { ...args, reset: false }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["channel-routing-settings"] });
    },
    onError: (err) =>
      ehMfa(err) ? toast.error(t("Confirme a verificação em duas etapas.")) : showApiError(err),
  });
}

function useAcaoNoDispositivo<A>(fn: (args: A) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["channel-sessions"] });
    },
    onError: showApiError,
  });
}

export const useRenomearDispositivo = () =>
  useAcaoNoDispositivo((a: { id: string; nome: string }) =>
    apiClient.patch(`/api/v1/channel-sessions/${a.id}/name`, { display_name: a.nome }),
  );
export const useExcluirDispositivo = () =>
  useAcaoNoDispositivo((id: string) => apiClient.delete(`/api/v1/channel-sessions/${id}`));
