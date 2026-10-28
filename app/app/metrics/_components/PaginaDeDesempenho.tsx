import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { traduzir } from "@/lib/i18n/dicionario";

import { MetricsClient } from "./MetricsClient";

/**
 * A PÁGINA DESEMPENHO (o corpo que vivia em `app/app/metrics/page.tsx`). FORK
 * ESCALE · Fase 7B: virou componente para abrir também em `/app/ai/desempenho`
 * ("Desempenho do atendimento", PRD 7, decisão 8), com o título por parâmetro.
 */
export async function PaginaDeDesempenho({ titulo }: { titulo: "Desempenho" | "Desempenho do atendimento" }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  // spec 13 §6.1: agent vê as próprias (RLS); a comparação por atendente é manager+.
  const canCompare = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;
  // `t` local em vez do hook: esta página é componente de SERVIDOR, e lá o
  // idioma vem resolvido em `user.idioma` (a cadeia pessoa → organização →
  // padrão vive em `lib/auth/server.ts`), sem reler o `locale` cru.
  const idioma = user.idioma;
  const t = (texto: string) => traduzir(texto, idioma);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo === "Desempenho" ? t("Desempenho") : t("Desempenho do atendimento")}</h1>
        <p className="text-sm text-muted-foreground">
          {canCompare
            ? t("Atrito, funil e performance por atendente nos últimos 30 dias.")
            : t("Atrito, seu funil e sua performance nos últimos 30 dias.")}
        </p>
      </header>

      <MetricsClient canCompare={canCompare} currentUserId={user.id} />
    </div>
  );
}
