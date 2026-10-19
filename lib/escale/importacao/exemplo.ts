/** O arquivo de exemplo da Clint (`uo`), gerado no navegador (fork Escale, Fase 2F). */
import type { TipoDeImportacao } from "./regras";

const DO_CONTATO = ["nome", "email", "telefone", "instagram", "empresa", "tag"];
const DO_NEGOCIO = ["titulo", "valor", "etapa", "status"];
const CONTATOS = [
  ["Maria Silva", "maria@exemplo.com", "11999990000", "@mariasilva", "Acme", "Lead quente"],
  ["João Souza", "joao@exemplo.com", "21988887777", "", "Beta Ltda", "Cliente"],
];
const NEGOCIOS = [
  ["Proposta site", "1500", "Qualificação", "OPEN"],
  ["Renovação", "900", "Negociação", "OPEN"],
];

export function csvDeExemplo(tipo: TipoDeImportacao): string {
  const negocio = tipo === "negocio";
  const cabecalho = negocio ? [...DO_CONTATO, ...DO_NEGOCIO] : DO_CONTATO;
  const linhas = CONTATOS.map((c, i) => (negocio ? [...c, ...(NEGOCIOS[i] ?? [])] : c));
  return [cabecalho, ...linhas].map((l) => l.join(",")).join("\n");
}

export const nomeDoExemplo = (tipo: TipoDeImportacao) => (tipo === "negocio" ? "exemplo-negocios.csv" : "exemplo-contatos.csv");
