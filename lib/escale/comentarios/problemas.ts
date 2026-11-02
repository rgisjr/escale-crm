import { MAXIMO_DA_RESPOSTA, MAXIMO_DE_CAMINHOS, MAXIMO_DE_PUBLICACOES, MAXIMO_DE_VARIACOES } from "./constantes";
import type { ConfigDoComentario } from "./schema";

/** Fica fora de `caminhos.ts` e de `schema.ts` para os dois poderem usá-lo sem ciclo (só tipos vêm do schema). */
const preenchida = (texto: string): boolean => texto.trim() !== "";

/** As recusas do gatilho, com os textos da Clint (plano 10B, seção 1.3). Vazio = pode salvar. */
export function problemasDoGatilho(config: ConfigDoComentario): string[] {
  const problemas: string[] = [];
  const todos = config.escopo === "todos";
  const publicacoes = config.caminhos.flatMap((c) => c.publicacoes);

  if (config.channel_session_id.trim() === "") problemas.push("Selecione um dispositivo para ver as publicações.");
  if (todos && (config.caminhos.length !== 1 || publicacoes.length > 0)) {
    problemas.push("Revise a configuração do gatilho.");
  }
  if (!todos) {
    if (config.caminhos.length === 0) problemas.push("Adicione ao menos uma publicação ao gatilho.");
    if (config.caminhos.length > MAXIMO_DE_CAMINHOS) problemas.push("O gatilho aceita até 10 caminhos de publicação.");
    if (config.caminhos.some((c) => c.publicacoes.length === 0)) {
      problemas.push("Cada caminho precisa ter ao menos uma publicação.");
    }
    if (publicacoes.length > MAXIMO_DE_PUBLICACOES) problemas.push("O gatilho aceita até 20 publicações.");
    const vistas = new Set<string>();
    const repetida = config.caminhos.some((c) => {
      const doCaminho = new Set(c.publicacoes.map((p) => p.id));
      const jaVista = [...doCaminho].some((id) => vistas.has(id));
      doCaminho.forEach((id) => vistas.add(id));
      return jaVista;
    });
    if (repetida) problemas.push("Uma publicação só pode estar em um caminho.");
  }

  const semPalavra = config.caminhos.some(
    (c) => c.filtro.modo === "palavras" && !c.filtro.palavras.some(preenchida),
  );
  if (semPalavra) {
    problemas.push('Preencha a palavra do filtro de cada publicação ou use "Qualquer comentário".');
  }

  const respostas = config.caminhos.flatMap((c) => (c.resposta ? [c.resposta.variacoes] : []));
  if (respostas.some((v) => v.length > MAXIMO_DE_VARIACOES)) problemas.push("Cada resposta aceita até 5 variações.");
  if (respostas.some((v) => v.length === 0 || !v.every(preenchida))) {
    problemas.push("Escreva a resposta ao comentário ou remova a resposta.");
  }
  if (respostas.some((v) => v.some((texto) => texto.length > MAXIMO_DA_RESPOSTA))) {
    problemas.push("A resposta ao comentário aceita até 300 caracteres.");
  }
  return problemas;
}
