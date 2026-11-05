import type { Desenho, ProblemaDoDesenho } from "@/lib/automation/desenho-da-regra";
import { janelaDoAtrasoSchema } from "@/lib/followup/janela-do-atraso";

import { RECUSA_JANELA_DO_ATRASO } from "./caixas";

/**
 * FORK ESCALE · automações: o que o painel do Atraso deixava de salvar e agora salva (a caixa guarda a
 * janela como foi digitada). A PUBLICAÇÃO confere aqui, para nada sair incompleto. A caixa de Mensagem
 * segue travando o que não sabe reler (botão grande, texto vazio): guardar isso faria a caixa reabrir
 * vazia, e o trabalho se perderia.
 */
export function pendenciasDasCaixas(desenho: Desenho): ProblemaDoDesenho[] {
  const problemas: ProblemaDoDesenho[] = [];
  for (const c of desenho.caixas) {
    if (c.data.kind === "atraso" && c.data.janela && !janelaDoAtrasoSchema.safeParse(c.data.janela).success) {
      problemas.push({ caixa: c.id, mensagem: RECUSA_JANELA_DO_ATRASO });
    }
  }
  return problemas;
}
