/**
 * O FILTRO DO PAINEL ABERTO (fork Escale, Fase 7C) — regras puras. A forma é o `FiltroDoPainel` da 7A;
 * Tags e Campos usam as funções da lista de contatos (2B).
 */
import { contarCondicoes, enxugarFiltros } from "@/lib/escale/contatos/filtros";
import { atalhoDoPeriodo, formatarDataBr, type AtalhoDePeriodo } from "@/lib/escale/ui/periodos";

import type { FiltroDoPainel, Periodo } from "../pergunta";

type AtalhoDoMotor = Periodo["atalho"];

export const FILTRO_PADRAO: FiltroDoPainel = { periodo: { atalho: "este_mes" } };
export const SECOES_DO_PAINEL = ["segmentacao", "tags", "campos"] as const;
export type SecaoDoPainel = (typeof SECOES_DO_PAINEL)[number];
export type ChaveDoChipDoPainel = "periodo" | "usuarios" | "gruposDeOrigem" | "origens" | "tags" | "campos";

const ordenados = (ids: readonly string[] | undefined): string[] | undefined =>
  ids && ids.length > 0 ? [...ids].sort() : undefined;

/** Listas vazias saem, ids ordenados, tags e campos pelas funções da 2B. */
export function enxugarFiltroDoPainel(f: FiltroDoPainel): FiltroDoPainel {
  const { tags, campos } = enxugarFiltros({ tags: f.tags, campos: f.campos });
  const usuarios = ordenados(f.usuarios);
  const gruposDeOrigem = ordenados(f.gruposDeOrigem);
  const origens = ordenados(f.origens);
  return {
    ...(f.periodo ? { periodo: f.periodo } : {}),
    ...(usuarios ? { usuarios } : {}),
    ...(gruposDeOrigem ? { gruposDeOrigem } : {}),
    ...(origens ? { origens } : {}),
    ...(tags ? { tags } : {}),
    ...(campos ? { campos } : {}),
  };
}

export const mesmosFiltrosDoPainel = (a: FiltroDoPainel, b: FiltroDoPainel): boolean =>
  JSON.stringify(enxugarFiltroDoPainel(a)) === JSON.stringify(enxugarFiltroDoPainel(b));

/** Segmentação: 1 por campo preenchido (a captura 10-025 mostra "1" só com o período). */
export function contarNaSecaoDoPainel(f: FiltroDoPainel, s: SecaoDoPainel): number {
  const e = enxugarFiltroDoPainel(f);
  if (s === "segmentacao") {
    return (e.periodo ? 1 : 0) + (e.usuarios ? 1 : 0) + (e.gruposDeOrigem ? 1 : 0) + (e.origens ? 1 : 0);
  }
  return contarCondicoes(s === "tags" ? e.tags?.grupos : e.campos?.grupos);
}

/** O "Filtros (N)" da barra. */
export const contarFiltros = (f: FiltroDoPainel): number =>
  SECOES_DO_PAINEL.reduce((n, s) => n + contarNaSecaoDoPainel(f, s), 0);

export function limparSecaoDoPainel(f: FiltroDoPainel, s: SecaoDoPainel): FiltroDoPainel {
  const e = enxugarFiltroDoPainel(f);
  return enxugarFiltroDoPainel({
    ...(s === "segmentacao" ? {} : { periodo: e.periodo, usuarios: e.usuarios, gruposDeOrigem: e.gruposDeOrigem, origens: e.origens }),
    ...(s === "tags" ? {} : { tags: e.tags }),
    ...(s === "campos" ? {} : { campos: e.campos }),
  });
}

const SECAO_DO_CHIP: Record<ChaveDoChipDoPainel, SecaoDoPainel> = {
  periodo: "segmentacao",
  usuarios: "segmentacao",
  gruposDeOrigem: "segmentacao",
  origens: "segmentacao",
  tags: "tags",
  campos: "campos",
};

export function chipsDoPainel(f: FiltroDoPainel): Array<{ chave: ChaveDoChipDoPainel; secao: SecaoDoPainel; quantidade: number }> {
  const e = enxugarFiltroDoPainel(f);
  const itens: Array<[ChaveDoChipDoPainel, number]> = [
    ["periodo", e.periodo ? 1 : 0],
    ["usuarios", e.usuarios?.length ?? 0],
    ["gruposDeOrigem", e.gruposDeOrigem?.length ?? 0],
    ["origens", e.origens?.length ?? 0],
    ["tags", contarCondicoes(e.tags?.grupos)],
    ["campos", contarCondicoes(e.campos?.grupos)],
  ];
  return itens.filter(([, n]) => n > 0).map(([chave, quantidade]) => ({ chave, secao: SECAO_DO_CHIP[chave], quantidade }));
}

export function removerChipDoPainel(f: FiltroDoPainel, chave: ChaveDoChipDoPainel): FiltroDoPainel {
  const { [chave]: _removido, ...resto } = enxugarFiltroDoPainel(f);
  return enxugarFiltroDoPainel(resto);
}

const DO_MOTOR_PARA_A_CASCA: Partial<Record<AtalhoDoMotor, AtalhoDePeriodo>> = {
  hoje: "hoje",
  ontem: "ontem",
  esta_semana: "essa-semana",
  semana_passada: "semana-passada",
  este_mes: "esse-mes",
  mes_passado: "mes-passado",
  este_ano: "esse-ano",
};
const DA_CASCA_PARA_O_MOTOR = Object.fromEntries(
  Object.entries(DO_MOTOR_PARA_A_CASCA).map(([motor, casca]) => [casca, motor]),
) as Record<AtalhoDePeriodo, AtalhoDoMotor>;

/** Atalho do motor (7A) → atalho do calendário da casca; os sem par ficam `null`. */
export const atalhoDaCasca = (a: AtalhoDoMotor): AtalhoDePeriodo | null => DO_MOTOR_PARA_A_CASCA[a] ?? null;

/** O que o calendário devolveu → período do filtro (atalho reconhecido, ou datas soltas). */
export function periodoDoCalendario(de: string, ate: string, hoje: Date): Periodo {
  const atalho = atalhoDoPeriodo(de, ate, hoje);
  return atalho ? { atalho: DA_CASCA_PARA_O_MOTOR[atalho] } : { atalho: "personalizado", de, ate };
}

const ROTULO_DO_ATALHO: Record<Exclude<AtalhoDoMotor, "personalizado">, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7_dias": "Últimos 7 dias",
  "15_dias": "Últimos 15 dias",
  "1_mes": "Último mês",
  esta_semana: "Essa semana",
  semana_passada: "Semana passada",
  este_mes: "Esse mês",
  mes_passado: "Mês passado",
  este_ano: "Esse ano",
  tudo: "Todo o período",
};

export function textoDoPeriodoDoPainel(p: Periodo, t: (s: string) => string): string {
  if (p.atalho === "personalizado") return p.de && p.ate ? `${formatarDataBr(p.de)} – ${formatarDataBr(p.ate)}` : "";
  return t(ROTULO_DO_ATALHO[p.atalho]);
}

/** O texto do botão do seletor (10-007). `salvo` é o filtro salvo aplicado, enquanto os critérios batem. */
export function rotuloDoSeletor(
  f: FiltroDoPainel,
  salvo: { nome: string; criterios: FiltroDoPainel } | null,
  t: (s: string) => string,
): string {
  if (salvo && mesmosFiltrosDoPainel(f, salvo.criterios)) return salvo.nome;
  if (!salvo && mesmosFiltrosDoPainel(f, FILTRO_PADRAO)) return t("Este mês");
  return t("Personalizado");
}
