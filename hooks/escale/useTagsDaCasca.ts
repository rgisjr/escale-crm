"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { invalidarCoresDasEtiquetas } from "@/components/tags/CoresDasEtiquetas";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";

const ERRO: Record<string, string> = {
  validation_failed: "Confira o nome, a cor e a descrição.",
  forbidden: "Só um gerente ou administrador da organização pode mudar as tags.",
  unauthenticated: "Sua sessão expirou. Entre de novo.",
  mfa_required: "Confirme o segundo fator para mudar as tags.",
};

/** As escritas da tela de Tags da casca. Cada uma devolve `false` quando o servidor recusou (com toast). */
export function useTagsDaCasca() {
  const t = useT();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function enviar(caminho: string, corpo: unknown, sucesso: string): Promise<boolean> {
    try {
      await apiClient.post(caminho, corpo);
      invalidarCoresDasEtiquetas(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["contact-tag-vocabulary"] });
      router.refresh();
      if (sucesso) toast.success(sucesso);
      return true;
    } catch (erro) {
      const codigo = (erro as { code?: string } | null)?.code ?? "";
      toast.error(t(ERRO[codigo] ?? "Não foi possível concluir agora. Tente de novo."));
      return false;
    }
  }

  return {
    gravar: (tag: string, cor: string | null, descricao: string | null) =>
      enviar("/api/v1/escale/tags", { tag, cor, descricao }, t("As alterações foram salvas com sucesso.")),
    // sem toast próprio: no "Atualizar" o renomear vem antes do gravar, que já avisa.
    renomear: (de: string, para: string) =>
      enviar("/api/v1/tags/vocabulario", { acao: "renomear", tag: de, destino: para, cor: null }, ""),
    remover: (tag: string) =>
      enviar("/api/v1/tags/vocabulario", { acao: "excluir", tag, destino: null, cor: null }, t("Tag removida.")),
  };
}
