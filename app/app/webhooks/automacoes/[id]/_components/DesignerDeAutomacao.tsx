"use client";

import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/i18n/useT";
import { useAutomationRule } from "@/hooks/webhooks/useAutomationRules";
import { ApiError } from "@/lib/api/types";

import { CanvasDaAutomacao } from "./CanvasDaAutomacao";

/**
 * O designer de automações (fase 1): abre uma automação gravada — ou uma nova,
 * com `id = "nova"` — no canvas. A automação é lida do banco a cada abertura
 * (`useAutomationRule`), nunca da cópia da lista: ela podia estar velha e o
 * canvas, que monta o desenho uma vez só, mostrava a versão de antes do salvar.
 * Grava pelas mesmas mutações do editor em lista.
 */
export function DesignerDeAutomacao({ id }: { id: string }) {
  const t = useT();
  const nova = id === "nova";
  const { data, isPending, isError, error } = useAutomationRule(nova ? null : id);
  // 404 é "não existe"; qualquer outra falha é leitura que não deu certo.
  const falhou = isError && !(error instanceof ApiError && error.code === "not_found");

  if (!nova && isPending && !isError) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const regra = nova ? null : (data?.data ?? null);
  if (!nova && !regra) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="max-w-md text-sm text-text-muted">
          {falhou
            ? t("Não consegui carregar as automações agora. Recarregue a página; se continuar, avise quem cuida da instalação.")
            : t("Esta automação não existe mais, ou não é desta organização.")}
        </p>
        <Button asChild variant="secondary">
          <Link href="/app/webhooks?aba=automacoes">{t("Voltar para as automações")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      {/* A chave remonta o canvas quando a automação nova vira gravada (o id muda). */}
      <CanvasDaAutomacao key={regra?.id ?? "nova"} regra={regra} />
    </ReactFlowProvider>
  );
}
