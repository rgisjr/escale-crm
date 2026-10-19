"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { STATUS_EM_ANDAMENTO } from "@/lib/escale/importacao/textos";
import type { ImportacaoLida } from "@/lib/escale/importacao/tipos";

const CHAVE = "escale:importacoes";
const INTERVALO_MS = 5000;

function ler(): string[] {
  try {
    const lido: unknown = JSON.parse(window.sessionStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lido) ? lido.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function gravar(ids: string[]) {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(ids));
  } catch {
    // o navegador pode recusar; o aviso vale só enquanto a página estiver aberta
  }
}

/** Marca a importação recém-criada para o aviso de fim (N16). */
export function acompanharImportacao(id: string) {
  gravar([...new Set([...ler(), id])]);
}

/**
 * O AVISO DE FIM DAS IMPORTAÇÕES (fork Escale, Fase 2F; molde de
 * `useAcompanharAcoes` da 2B): pergunta a cada 5 s pelas importações desta aba
 * e, quando uma termina, avisa "Importação concluída" ou "{n} linhas precisam de
 * revisão" (com "Revisar").
 */
export function AcompanharImportacoes() {
  const t = useT();
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(async () => {
      const acompanhadas = ler();
      if (acompanhadas.length === 0) return;
      const ainda: string[] = [];
      for (const imp of acompanhadas) {
        try {
          const i = (await apiClient.get<{ data: ImportacaoLida }>(`/api/v1/importacoes/${imp}`)).data;
          if (STATUS_EM_ANDAMENTO.includes(i.status)) {
            ainda.push(imp);
          } else if (i.status === "aguardando_revisao") {
            toast(t("{n} linhas precisam de revisão").replace("{n}", String(i.revisar)), {
              action: { label: t("Revisar"), onClick: () => router.push(`/app/imports/${imp}?revisar=1`) },
            });
          } else if (i.status === "concluida") {
            toast.success(t("Importação concluída"), {
              action: { label: t("Relatório"), onClick: () => router.push(`/app/imports/${imp}`) },
            });
          } else if (i.status === "falhou") {
            toast.error(t("A importação falhou. Tente novamente ou fale com o suporte."));
          }
        } catch {
          ainda.push(imp);
        }
      }
      gravar(ainda);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [router, t]);
  return null;
}
