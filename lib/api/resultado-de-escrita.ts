/**
 * O desfecho de uma escrita extraída da rota REST para `lib/**`, para que a rota e a
 * ferramenta MCP chamem a MESMA função. `mensagem` está em português de gente: a rota
 * a traduz com `traduzir()`, a ferramenta a devolve como está.
 */
export type FalhaDeEscrita = {
  ok: false;
  codigo: string;
  mensagem: string;
  status: number;
  detalhes?: unknown;
};

export type ResultadoDeEscrita<T> = { ok: true; dado: T } | FalhaDeEscrita;

export function falhaDeEscrita(
  codigo: string,
  mensagem: string,
  status: number,
  detalhes?: unknown,
): FalhaDeEscrita {
  return detalhes === undefined
    ? { ok: false, codigo, mensagem, status }
    : { ok: false, codigo, mensagem, status, detalhes };
}
