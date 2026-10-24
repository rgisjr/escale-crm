import type { ModeloAprovado } from "@/hooks/escale/useModelosDeMensagem";
import { lerConteudo } from "@/lib/channels/template-conteudo";

import type { MensagemDeModelo } from "./assistente";

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
  for (const s of m.slots ?? []) {
    const salvo = (m.savedValues ?? {})[s.valueKey]?.trim();
    if (s.expects !== "text" && salvo) variaveis[s.valueKey] = { fonte: "fixo", valor: salvo };
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
