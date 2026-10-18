"use client";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

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
 * Como o `entregarAviso` do original, com o botão "Abrir negócio" (o original
 * escreve "Abrir conversa" em todo aviso com destino). Respeita as preferências
 * de canal da pessoa (N23: novo = lead_assigned, ganho = lead_won, perda = lead_lost).
 */
function entregar(aviso: EntregarAvisoInput) {
  const idioma = idiomaAtual();
  const title = traduzir(aviso.title, idioma);
  if (canalLigado(aviso.category, "in_app")) {
    toast(title, {
      description: aviso.body,
      action: aviso.href
        ? {
            label: traduzir("Abrir negócio", idioma),
            onClick: () => window.location.assign(aviso.href!),
          }
        : undefined,
    });
  }
  if (canalLigado(aviso.category, "push")) {
    emitNotification({
      kind: aviso.kind,
      title,
      body: aviso.body,
      tag: aviso.tag,
      href: aviso.href,
      force: true,
    });
  }
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
      if (aviso) entregar(aviso);
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
