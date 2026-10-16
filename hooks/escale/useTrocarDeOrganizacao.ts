"use client";
import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { setActiveOrg } from "@/app/actions/shell/setActiveOrg";
import { useOrganizationTransition } from "@/components/shell/OrganizationTransitionProvider";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";

/**
 * Trocar de organização pelo menu do avatar da casca (fork Escale, V2).
 *
 * A Clint não tem seletor de organização no topo, então a casca nova não monta o
 * `TenantSwitcher` do original. A troca, porém, é a MESMA sequência dele, e
 * precisa continuar sendo:
 *   1. aviso de transição pintado antes de qualquer espera (`flushSync`);
 *   2. server action;
 *   3. documento novo em /app/inbox, que elimina QueryClient, assinaturas e
 *      respostas em voo da organização anterior.
 * Se o original mudar essa sequência, este gancho acompanha.
 */
export function useTrocarDeOrganizacao(): { trocando: boolean; trocar: (orgId: string) => Promise<void> } {
  const t = useT();
  const ativa = useActiveOrg();
  const transicao = useOrganizationTransition();
  const [trocando, setTrocando] = useState(false);

  const trocar = async (orgId: string) => {
    if (orgId === ativa?.orgId) return;
    flushSync(() => {
      setTrocando(true);
      transicao.begin(t("Carregando organização…"));
    });
    try {
      const resultado = await setActiveOrg(orgId);
      if (!resultado.ok) throw new Error(resultado.error);
      window.location.assign("/app/inbox");
    } catch {
      transicao.cancel();
      setTrocando(false);
      toast.error(t("Não foi possível trocar de organização. Seu acesso pode ter mudado. Tente novamente."));
    }
  };

  return { trocando, trocar };
}
