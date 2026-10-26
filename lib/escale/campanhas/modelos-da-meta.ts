import type { ModeloAprovado } from "@/hooks/escale/useModelosDeMensagem";
import { lerConteudo } from "@/lib/channels/template-conteudo";
import { tokenDoCampoAntigo } from "@/lib/variaveis/mapeamento";

import type { MensagemDeModelo } from "./assistente";
import { tokenDaCampanha } from "./modelo";

/** OS MODELOS DA META NO ASSISTENTE (fork Escale, Fase 8B; 09-023 a 09-025; N5). */
export const ROTULO_DA_CATEGORIA: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};
export const rotuloDaCategoria = (c: string | null | undefined): string =>
  c ? (ROTULO_DA_CATEGORIA[c.toUpperCase()] ?? c) : "";

/** "pt_BR" → "BR" (a etiqueta pequena ao lado do nome, 023). */
export const siglaDoIdioma = (idioma: string): string =>
  (idioma.split(/[_-]/)[1] ?? idioma).toUpperCase();

const IDIOMAS: Record<string, string> = {
  pt_BR: "Português (BR)",
  pt_PT: "Português (PT)",
  en_US: "Inglês (EUA)",
  es: "Espanhol",
};
export const rotuloDoIdioma = (idioma: string): string => IDIOMAS[idioma] ?? idioma;

/**
 * Entra na campanha o modelo cujas variáveis de texto estão no CORPO (`{{n}}`)
 * e cujos slots de mídia têm o link salvo (`savedValues`). Variável de texto no
 * cabeçalho ou nos botões fica para depois (declarado no plano).
 */
export function modeloEscolhivel(m: ModeloAprovado): boolean {
  return (m.slots ?? []).every((s) =>
    s.expects === "text"
      ? /^\d+$/.test(s.valueKey)
      : Boolean((m.savedValues ?? {})[s.valueKey]?.trim()),
  );
}

export function mensagemDoModelo(m: ModeloAprovado): MensagemDeModelo {
  const variaveis: MensagemDeModelo["variaveis"] = {};
  const mapeado = m.mapeamento?.variaveis ?? {};
  for (const s of m.slots ?? []) {
    const salvo = (m.savedValues ?? {})[s.valueKey]?.trim();
    if (s.expects !== "text" && salvo) variaveis[s.valueKey] = { fonte: "fixo", valor: salvo };
    // Frente V: a campanha nasce com o que Modelos de mensagem salvou (e a
    // pessoa ainda pode trocar só para esta campanha).
    // Só o que a campanha sabe resolver: um campo que ela não lê (ex.: a etapa)
    // tiraria todo mundo da lista; esse slot fica para a pessoa escolher.
    else if (s.expects === "text" && mapeado[s.valueKey]) {
      const v = mapeado[s.valueKey]!;
      if (v.fonte === "fixo" || tokenDaCampanha(tokenDoCampoAntigo(v.campo))) variaveis[s.valueKey] = v;
    }
  }
  return {
    tipo: "modelo",
    nome: m.name,
    idioma: m.language,
    categoria: m.category ?? null,
    corpo: lerConteudo(m.components ?? []).body?.trim() ?? "",
    variaveis,
  };
}
