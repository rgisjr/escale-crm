"use client";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";
import { roleAtLeast } from "@/lib/auth/types";
import { avisoDoNegocioUmaVez, type OrigemQueAvisa } from "@/lib/escale/notificacoes/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { idiomaAtual } from "@/lib/i18n/IdiomaProvider";
import { emitNotification } from "@/lib/notifications/emit";
import type { EntregarAvisoInput } from "@/lib/notifications/deliver";
import { canalLigado } from "@/lib/notifications/prefs";

export const chaveDosAvisosDaOrigem = (orgId: string | null) =>
  ["escale", "avisos-da-origem", orgId] as const;

function lados(payload: unknown): {
  novo: Record<string, unknown> | null;
  antigo: Record<string, unknown> | null;
} {
  const p = (payload ?? {}) as { new?: unknown; old?: unknown };
  const objeto = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  return { novo: objeto(p.new), antigo: objeto(p.old) };
}

/**
 * Como na Clint, o aviso da origem (novo negócio, ganho, perda) não vira pop-up
 * na tela: ela leva esses eventos para a central de notificações, nunca para um
 * toast (código `vha`: DEAL_CREATED, DEAL_STATUS_CHANGED). Fica a notificação
 * do sistema, que respeita a preferência de push da pessoa
 * (N23: novo = lead_assigned, ganho = lead_won, perda = lead_lost).
 */
export function entregarAvisoDaOrigem(aviso: EntregarAvisoInput): void {
  if (!canalLigado(aviso.category, "push")) return;
  emitNotification({
    kind: aviso.kind,
    title: traduzir(aviso.title, idiomaAtual()),
    body: aviso.body,
    tag: aviso.tag,
    href: aviso.href,
    force: true,
  });
}

/**
 * AS NOTIFICAÇÕES DA ORIGEM NA TELA (fork Escale, Fase 1K, D15). Montado no
 * menu do topo da casca. Lê as origens que avisam a pessoa e só então liga o
 * tempo real de `crm_leads` (INSERT para "novo negócio", UPDATE para ganho e
 * perda). A RLS entrega só o que a pessoa vê (1J).
 */
export function useAvisosDaOrigem(): void {
  const org = useActiveOrg();
  const orgId = org?.orgId ?? null;
  // A rota pede agente ou acima: para o leitor (viewer) cada carga da casca seria um 403
  // e uma linha `authz.denied` na auditoria. Quem não pode, nem pergunta.
  const podeReceber = roleAtLeast(org?.role, "agent");
  const user = useUser();
  const consulta = useQuery({
    queryKey: chaveDosAvisosDaOrigem(orgId),
    enabled: !!orgId && podeReceber,
    staleTime: 60_000,
    queryFn: async () =>
      (await apiClient.get<{ data: OrigemQueAvisa[] }>("/api/v1/escale/avisos-da-origem")).data,
  });
  const porId = useMemo(
    () => new Map((consulta.data ?? []).map((o) => [o.id, o])),
    [consulta.data],
  );
  const algumNovo = (consulta.data ?? []).some((o) => o.novo);
  const algumStatus = (consulta.data ?? []).some((o) => o.status.length > 0);

  // negócio+status já avisados nesta sessão (o `old` do tempo real não traz o status)
  const jaAvisados = useRef(new Set<string>());

  const aoChegar = useCallback(
    (tipo: "INSERT" | "UPDATE") => (payload: unknown) => {
      const { novo, antigo } = lados(payload);
      if (!novo) return;
      const origem = porId.get(String(novo.pipeline_id ?? ""));
      const aviso = avisoDoNegocioUmaVez(
        { tipo, novo, antigo, origem, eu: user.id },
        jaAvisados.current,
      );
      if (aviso) entregarAvisoDaOrigem(aviso);
    },
    [porId, user.id],
  );

  useRealtimeChannel({
    name: orgId ? `escale-avisos-novos-${orgId}` : "escale-avisos-novos-desligado",
    postgresChanges: orgId
      ? {
          event: "INSERT",
          schema: "public",
          table: "crm_leads",
          filter: `organization_id=eq.${orgId}`,
        }
      : undefined,
    onChange: aoChegar("INSERT"),
    enabled: !!orgId && algumNovo,
  });
  useRealtimeChannel({
    name: orgId ? `escale-avisos-status-${orgId}` : "escale-avisos-status-desligado",
    postgresChanges: orgId
      ? {
          event: "UPDATE",
          schema: "public",
          table: "crm_leads",
          filter: `organization_id=eq.${orgId}`,
        }
      : undefined,
    onChange: aoChegar("UPDATE"),
    enabled: !!orgId && algumStatus,
  });
}
