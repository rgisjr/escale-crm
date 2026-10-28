/**
 * Ida e volta entre o rascunho da tela e a pergunta do motor (fork Escale, Fase 7D).
 *
 * Como o motor (7A) combina o filtro: `modo` junta as `condicoes` soltas e cada item de `grupos`. Para as
 * caixas da tela valerem como a Clint (caixas independentes, E entre elas):
 *  - caixa principal "todas" → ela vira as `condicoes`, as demais caixas viram `grupos`;
 *  - caixa principal "qualquer" (com mais caixas) → todas viram `grupos` e as `condicoes` ficam vazias.
 */
import { randomId } from "@/lib/random-id";

import { opcoesComPadrao } from "../graficos/opcoes";
import { ehTipoPrincipal } from "../graficos/tipos";
import { perguntaSchema, type Condicao, type Pergunta } from "../pergunta";
import { tipoDoCampo, type CatalogoDaTela } from "./catalogo-da-tela";
import { precisaDeValor, textoDoNumeroBr } from "./operadores";
import {
  rascunhoNovo,
  type CaixaDoFiltro,
  type CondicaoDoRascunho,
  type RascunhoDoGrafico,
  type ValorDaCondicao,
} from "./rascunho";
import { periodoPadrao } from "./periodo-do-editor";
import { limiteDoTipo, TIPO_PADRAO } from "./tipos-de-grafico";

export type ErroDoRascunho = { secao: "indicador" | "filtro"; condicao?: string };
export type ResultadoDaPergunta = { ok: true; pergunta: Pergunta } | { ok: false; erros: readonly ErroDoRascunho[] };

const vazio = (v: ValorDaCondicao | undefined): boolean =>
  v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "number" && Number.isNaN(v));

/** O valor como o motor o espera; `undefined` = incompleto. Números em texto brasileiro viram número. */
function valorParaOMotor(c: CondicaoDoRascunho, tipo: string | null): ValorDaCondicao | undefined {
  if (!precisaDeValor(c.op)) return undefined;
  if (vazio(c.valor)) return undefined;
  if (tipo === "numero" && typeof c.valor === "string") return textoDoNumeroBr(c.valor) ?? undefined;
  return c.valor;
}

function condicoesDaCaixa(
  caixa: CaixaDoFiltro,
  cat: CatalogoDaTela,
  erros: ErroDoRascunho[],
): Condicao[] {
  const saida: Condicao[] = [];
  for (const c of caixa.condicoes) {
    if (!c.campo) {
      erros.push({ secao: "filtro", condicao: c.chave });
      continue;
    }
    const valor = valorParaOMotor(c, tipoDoCampo(c.campo, cat));
    if (precisaDeValor(c.op) && valor === undefined) {
      erros.push({ secao: "filtro", condicao: c.chave });
      continue;
    }
    saida.push({ campo: c.campo, op: c.op, ...(valor !== undefined ? { valor } : {}) });
  }
  return saida;
}

export function perguntaDoRascunho(r: RascunhoDoGrafico, cat: CatalogoDaTela): ResultadoDaPergunta {
  const erros: ErroDoRascunho[] = [];
  if (r.indicadores.length === 0) erros.push({ secao: "indicador" });

  const caixas = r.filtro
    .map((c) => ({ modo: c.modo, condicoes: condicoesDaCaixa(c, cat, erros) }))
    .filter((c) => c.condicoes.length > 0);
  if (erros.length > 0) return { ok: false, erros };

  const [principal, ...demais] = caixas;
  const filtro = !principal
    ? { modo: "todas" as const, condicoes: [], grupos: [] }
    : demais.length === 0
      ? { modo: principal.modo, condicoes: principal.condicoes, grupos: [] }
      : principal.modo === "todas"
        ? { modo: "todas" as const, condicoes: principal.condicoes, grupos: demais }
        : { modo: "todas" as const, condicoes: [], grupos: caixas };

  const periodo =
    r.tempo.periodo.atalho === "personalizado" && !(r.tempo.periodo.de && r.tempo.periodo.ate) ? periodoPadrao() : r.tempo.periodo;
  const indicadores = r.indicadores.slice(0, limiteDoTipo(r.tipo));
  const ordemValida = r.ordem.por && [...indicadores, ...r.variaveis].includes(r.ordem.por);

  return {
    ok: true,
    pergunta: perguntaSchema.parse({
      indicadores,
      variaveis: r.variaveis,
      ...(r.tempo.campo
        ? {
            tempo: {
              campo: r.tempo.campo,
              ...(r.tempo.granularidade ? { granularidade: r.tempo.granularidade } : {}),
              periodo,
              fixo: r.tempo.fixo,
            },
          }
        : {}),
      filtro,
      ...(ordemValida ? { ordem: { por: r.ordem.por, direcao: r.ordem.direcao } } : {}),
    }),
  };
}

const comChave = (c: Condicao): CondicaoDoRascunho => ({
  chave: randomId(),
  campo: c.campo,
  op: c.op,
  ...(c.valor !== undefined ? { valor: c.valor } : {}),
});

/** Reabre um gráfico salvo. Pergunta inválida (a 7A pode passar a recusar) → rascunho novo com o tipo gravado. */
export function rascunhoDoGrafico(g: { tipo: string; pergunta: unknown; opcoes: unknown }): RascunhoDoGrafico {
  const tipo = ehTipoPrincipal(g.tipo) ? g.tipo : TIPO_PADRAO;
  const lida = perguntaSchema.safeParse(g.pergunta);
  if (!lida.success) return { ...rascunhoNovo(tipo), opcoes: opcoesComPadrao(g.opcoes) };
  const p = lida.data;
  const caixas: CaixaDoFiltro[] =
    p.filtro.condicoes.length === 0 && p.filtro.grupos.length > 0
      ? p.filtro.grupos.map((x) => ({ chave: randomId(), modo: x.modo, condicoes: x.condicoes.map(comChave) }))
      : [
          { chave: randomId(), modo: p.filtro.modo, condicoes: p.filtro.condicoes.map(comChave) },
          ...p.filtro.grupos.map((x) => ({ chave: randomId(), modo: x.modo, condicoes: x.condicoes.map(comChave) })),
        ];
  return {
    tipo,
    indicadores: p.indicadores,
    variaveis: p.variaveis,
    tempo: {
      campo: p.tempo?.campo ?? null,
      granularidade: p.tempo?.granularidade ?? null,
      periodo: p.tempo?.periodo ?? periodoPadrao(),
      fixo: p.tempo?.fixo ?? false,
    },
    filtro: caixas,
    ordem: { por: p.ordem && p.ordem.por !== "tempo" ? p.ordem.por : null, direcao: p.ordem?.direcao ?? "asc" },
    opcoes: opcoesComPadrao(g.opcoes),
  };
}
