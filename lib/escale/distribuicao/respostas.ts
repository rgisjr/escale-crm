import { fail } from "@/lib/api/wrappers";
import { falhaInesperada, type OndeFalhou } from "@/lib/escale/configuracoes/respostas";

import type { ErroDoBanco } from "./ler";
import { ERRO_DA_SOMA } from "./regras";

/**
 * O erro das funções da 9013 com nome (N7): `22023 distribuicao_invalida` é a
 * soma ou um percentual; `PT422 pessoa_sem_permissao` é quem não pode receber;
 * `PT404` é a origem de outra organização ou apagada. O resto é 500 com o log.
 */
export function respostaDoBancoDaDistribuicao(
  erro: ErroDoBanco,
  onde: OndeFalhou,
  t: (texto: string) => string,
  requestId: string,
): Response {
  if (erro.code === "22023")
    return fail("unprocessable_entity", t(ERRO_DA_SOMA), 422, { requestId });
  if (erro.code === "PT422") {
    return fail("unprocessable_entity", t("Este usuário não possui permissão nesta origem."), 422, {
      requestId,
    });
  }
  if (erro.code === "PT404")
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  return falhaInesperada(erro, onde, t, requestId);
}
