import { roleAtLeast, type Role } from "@/lib/auth/types";
import type { CanalDoRoteamento } from "@/lib/escale/conversas/canais";

/**
 * FORK ESCALE · Fase 10A: quem atende a conta e quem apaga (D7). A parte do servidor
 * (`contasDaCaixa`, `contaDaCaixa`) fica em `contas-da-caixa.ts` para este arquivo seguir puro.
 */

/** D7. `canal` null = conta sem política de roteamento (todos os atendentes). */
export function podeAtenderAConta(e: { papel: Role; userId: string; canal: CanalDoRoteamento | null }): boolean {
  if (e.papel === "admin") return true;
  if (!roleAtLeast(e.papel, "agent")) return false;
  if (e.canal === null || e.canal.mode === "legacy_unconfigured") return true;
  if (e.canal.mode === "restricted_empty") return false;
  return e.canal.user_ids.includes(e.userId);
}

export const podeApagarComentario = (papel: Role): boolean => roleAtLeast(papel, "manager");
