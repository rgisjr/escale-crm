"use client";
import { ReactFlowProvider } from "@xyflow/react";
import { useRouter } from "next/navigation";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useOrganizarAoCriar } from "@/hooks/escale/useAutomacoesDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAutomationRule } from "@/hooks/webhooks/useAutomationRules";
import { ApiError } from "@/lib/api/types";
import { ROTA_DA_LISTA_DE_AUTOMACOES } from "@/lib/escale/automacoes/rotas";

import { TelaDoFluxo } from "./TelaDoFluxo";

/** O cabeçalho de 56 px com esqueletos (E28): nome 200×20, selo 80×20, data 100×16, abas 160×32. */
function Carregando() {
  const bloco = "animate-pulse rounded bg-casca-raia";
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="fluxo-carregando">
      <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-casca-divisoria bg-surface pl-5">
        <div className="flex items-center gap-3">
          <div className={`${bloco} h-5 w-[200px]`} />
          <div className={`${bloco} h-5 w-20`} />
          <div className={`${bloco} h-4 w-[100px]`} />
        </div>
        <div className={`${bloco} h-8 w-40`} />
        <div />
      </header>
      <div className="flex-1 bg-casca-fluxo" />
    </div>
  );
}

/**
 * O FLUXO DA CASCA (07-013): lê a automação do banco a cada abertura (nunca da cópia
 * da lista, que pode estar velha) e monta a tela. `id = "nova"` abre uma automação nova.
 */
export function FluxoDaCasca({
  id,
  fuso,
  nomeInicial,
  pastaInicial = null,
}: {
  id: string;
  fuso: string;
  nomeInicial?: string;
  pastaInicial?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const organizarAoCriar = useOrganizarAoCriar();
  const nova = id === "nova";
  const { data, isPending, isError, error } = useAutomationRule(nova ? null : id);
  // 404 é "não existe"; qualquer outra falha é leitura que não deu certo.
  const falhou = isError && !(error instanceof ApiError && error.code === "not_found");

  if (!nova && isPending && !isError) return <Carregando />;

  const regra = nova ? null : (data?.data ?? null);
  if (!nova && !regra) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-[13px] text-casca-suave">
          {falhou
            ? t("Não consegui carregar as automações agora. Recarregue a página; se continuar, avise quem cuida da instalação.")
            : t("Esta automação não existe mais, ou não é desta organização.")}
        </p>
        <BotaoDaCasca variante="marca" onClick={() => router.push(ROTA_DA_LISTA_DE_AUTOMACOES)}>
          {t("Voltar para as automações")}
        </BotaoDaCasca>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      {/* A chave remonta a tela quando a automação nova vira gravada (o id muda). */}
      <TelaDoFluxo
        key={regra?.id ?? "nova"}
        regra={regra}
        fuso={fuso}
        nomeInicial={nomeInicial}
        aoCriar={
          nomeInicial !== undefined
            ? (novaId) => organizarAoCriar(novaId, { pasta_id: pastaInicial, forma: "fluxo" })
            : undefined
        }
      />
    </ReactFlowProvider>
  );
}
