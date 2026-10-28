"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { ApiError } from "@/lib/api/types";
import type {
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from "@/lib/schemas/webhooks";

export interface AutomationRuleRow {
  id: string;
  organization_id: string;
  name: string;
  trigger_event: string;
  conditions: Array<{ field: string; op: "eq" | "neq" | "contains"; value: string }>;
  actions: Array<{ type: string; config: Record<string, unknown> }>;
  /**
   * O que o gatilho precisa saber além do nome (#989, migration 0268). Só o
   * gatilho de data do funil usa (`{ pipeline_id, campo, dias }`); nas regras
   * anteriores à coluna, e nas dos outros gatilhos, é o objeto vazio.
   */
  trigger_config: Record<string, unknown> | null;
  is_active: boolean;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
  /** Quem mexeu por último (migration 0101). `null` nas regras anteriores a ela. */
  last_change_actor_kind: string | null;
  last_change_at: string | null;
}

const RULES_KEY = ["automation-rules"];

export function useAutomationRules() {
  return useQuery({
    queryKey: RULES_KEY,
    queryFn: async () => apiClient.get<{ data: AutomationRuleRow[] }>("/api/v1/automation-rules"),
    staleTime: 15_000,
  });
}

/**
 * Uma automação lida do banco NA HORA, para abrir no editor. A cópia da lista
 * pode estar velha (a recarga depois de salvar falhou ou ainda não voltou), e
 * abrir dela mostrava a versão antiga como se o salvar não tivesse valido; pior,
 * salvar de novo dali gravava a versão antiga por cima da boa.
 *
 * `staleTime: 0` + `gcTime: 0`: nada fica guardado entre uma abertura e outra.
 */
export function opcoesDaRegra(id: string) {
  return {
    queryKey: ["automation-rule", id] as const,
    queryFn: async () => apiClient.get<{ data: AutomationRuleRow }>(`/api/v1/automation-rules/${id}`),
    staleTime: 0,
    gcTime: 0,
  };
}

export function useAutomationRule(id: string | null) {
  return useQuery({
    ...opcoesDaRegra(id ?? ""),
    enabled: !!id,
    // O editor monta o desenho uma vez; recarregar ao voltar para a aba não muda nada na tela.
    refetchOnWindowFocus: false,
    // Automação apagada (404) não volta tentando de novo.
    retry: (falhas: number, erro: unknown) =>
      !(erro instanceof ApiError && erro.code === "not_found") && falhas < 2,
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAutomationRuleInput) =>
      apiClient.post<{ data: AutomationRuleRow }>("/api/v1/automation-rules", input),
    onError: showApiError,
    onSuccess: () => qc.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

export function useUpdateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAutomationRuleInput & { id: string }) =>
      apiClient.patch<{ data: AutomationRuleRow }>(`/api/v1/automation-rules/${id}`, input),
    onError: showApiError,
    onSuccess: (resposta) => {
      // A versão gravada entra na lista já, sem depender da recarga: se ela
      // falhar, a lista não fica mostrando a versão de antes do salvar.
      qc.setQueryData<{ data: AutomationRuleRow[] }>(RULES_KEY, (velho) =>
        velho ? { data: velho.data.map((r) => (r.id === resposta.data.id ? resposta.data : r)) } : velho,
      );
      return qc.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/automation-rules/${id}`),
    onError: showApiError,
    onSuccess: () => qc.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

export interface AutomationRuleRunActionResult {
  type: string;
  status: "success" | "failed" | "skipped" | "postponed";
  error?: string;
  detail?: Record<string, unknown>;
}

/** Espelha o CHECK de `automation_rule_runs.status` (migrations 0038 e 0175). */
export type AutomationRunStatus = "success" | "failed" | "partial" | "adiado";

export interface AutomationRuleRunRow {
  id: string;
  organization_id: string;
  rule_id: string;
  event_id: string | null;
  /**
   * Espelha o CHECK de `automation_rule_runs.status` — `adiado` entrou na
   * migration 0175 (a espera é um estado; sem ele a tela não mostrava NADA
   * enquanto a regra aguardava a janela de envio).
   */
  status: AutomationRunStatus;
  actions_result: AutomationRuleRunActionResult[];
  error: string | null;
  created_at: string;
  automation_rules: { name: string } | null;
}

const RUNS_KEY = ["automation-rule-runs"];

export function useAutomationRuns() {
  return useQuery({
    queryKey: RUNS_KEY,
    queryFn: async () =>
      apiClient.get<{ data: AutomationRuleRunRow[] }>("/api/v1/automation-rules/runs?limit=50"),
    staleTime: 15_000,
  });
}

export function useResendAutomationRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) =>
      apiClient.post<{ data: AutomationRuleRunRow }>(
        `/api/v1/automation-rules/runs/${runId}/resend`,
        undefined,
      ),
    onError: showApiError,
    onSuccess: () => qc.invalidateQueries({ queryKey: RUNS_KEY }),
  });
}
