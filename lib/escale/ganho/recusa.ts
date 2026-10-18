import { traduzir } from "@/lib/i18n/dicionario";
import { IDIOMA_PADRAO, type Idioma } from "@/lib/i18n/idiomas";

/** O texto da Clint (`component.Deal.noPermissionToWin`). */
export const MENSAGEM_DO_GANHO_BLOQUEADO =
  "Você não possui permissão para dar ganho neste negócio.";

/**
 * A recusa do gatilho `trg_escale_so_admin_marca_ganho` (migration 9014, N15)
 * vira recusa de negócio (403 com o texto da Clint), nunca 500. Reconhece pelo
 * código E pela marca (`PT403` + `so_administrador_marca_ganho`).
 */
export function recusaDoGanhoPeloBanco(
  erro: { code?: string | null; message?: string | null } | null | undefined,
  idioma?: Idioma | null,
): { codigo: "forbidden"; mensagem: string } | null {
  if (erro?.code !== "PT403" || !(erro.message ?? "").includes("so_administrador_marca_ganho"))
    return null;
  return {
    codigo: "forbidden",
    mensagem: traduzir(MENSAGEM_DO_GANHO_BLOQUEADO, idioma ?? IDIOMA_PADRAO),
  };
}
