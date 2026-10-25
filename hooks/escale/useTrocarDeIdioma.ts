"use client";
import { useTransition } from "react";
import { toast } from "sonner";

import { trocarIdioma } from "@/app/actions/settings/trocarIdioma";
import { useT } from "@/hooks/i18n/useT";
import { useAplicarIdioma, useIdioma } from "@/lib/i18n/IdiomaProvider";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * Trocar de idioma pelo menu do avatar da casca (fork Escale, V2). É a MESMA
 * sequência do `SeletorDeIdioma` do original:
 *   - pinta na hora;
 *   - grava;
 *   - se o servidor recusar, volta ao idioma anterior e avisa;
 *   - se gravou, recarrega a página inteira. O `router.refresh()` foi medido no
 *     original e não resolve: o cache do cliente guarda o layout no idioma velho.
 */
export function useTrocarDeIdioma(): { idioma: Idioma; salvando: boolean; escolher: (novo: Idioma) => void } {
  const t = useT();
  const idioma = useIdioma();
  const aplicar = useAplicarIdioma();
  const [salvando, startTransition] = useTransition();

  const escolher = (novo: Idioma) => {
    if (novo === idioma) return;
    const anterior = idioma;
    aplicar(novo);
    startTransition(async () => {
      let resultado: Awaited<ReturnType<typeof trocarIdioma>>;
      try {
        resultado = await trocarIdioma(novo);
      } catch {
        resultado = { ok: false } as Awaited<ReturnType<typeof trocarIdioma>>;
      }
      if (!resultado.ok) {
        aplicar(anterior);
        toast.error(t("Não foi possível trocar o idioma. Tente de novo."));
        return;
      }
      window.location.reload();
    });
  };

  return { idioma, salvando, escolher };
}
