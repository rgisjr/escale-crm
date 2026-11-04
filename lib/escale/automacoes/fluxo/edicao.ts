/**
 * FORK ESCALE · 5D: a edição do desenho em MODO FLUXO (várias saídas por caixa, várias entradas por
 * caixa). O modo regra (a fila de hoje) continua nas funções de `desenho-da-regra.ts`; estas valem
 * quando o desenho tem Atraso, ramos, botões com saída ou tempo de resposta.
 */
import {
  proximoId,
  RECUSAS_DE_LIGACAO,
  type CaixaDoDesenho,
  type Desenho,
  type LigacaoDoDesenho,
} from "@/lib/automation/desenho-da-regra";
import { saidasDaCaixa, type SaidaDoNo } from "@/lib/escale/automacoes/fluxo/caixas";
import { modoDoDesenho } from "@/lib/escale/automacoes/fluxo/compilar";
import { ALTURA_ESTIMADA_DO_NO, ESPACO_ENTRE_NOS, LARGURA_DO_NO, organizarNaHorizontal } from "@/lib/escale/automacoes/fluxo/layout";

export const emModoFluxo = (d: Desenho): boolean => modoDoDesenho(d) === "fluxo";
const saidaDe = (l: LigacaoDoDesenho): SaidaDoNo => l.saida ?? "proximo";
const comSaida = (saida: SaidaDoNo) => (saida === "proximo" ? {} : { saida });

/** Toda caixa de Condições passa a ter `grupos` (g1 com as linhas de hoje); a ligação dela vira `grupo:g1`. */
export function comGrupos(d: Desenho): Desenho {
  const antigas = new Set<string>();
  const caixas = d.caixas.map((c): CaixaDoDesenho => {
    if (c.data.kind !== "condicoes" || c.data.grupos) return c;
    antigas.add(c.id);
    return { ...c, data: { ...c.data, grupos: [{ id: "g1", modo: "todas", linhas: c.data.linhas }] } };
  });
  const ligacoes = d.ligacoes.map((l): LigacaoDoDesenho => (antigas.has(l.source) && !l.saida ? { ...l, saida: "grupo:g1" } : l));
  return { caixas, ligacoes };
}

function alcanca(d: Desenho, de: string, ate: string): boolean {
  const vistas = new Set<string>();
  const fila = [de];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    if (atual === ate) return true;
    if (vistas.has(atual)) continue;
    vistas.add(atual);
    for (const l of d.ligacoes) if (l.source === atual) fila.push(l.target);
  }
  return false;
}

/** Liga UMA saída de uma caixa a uma caixa; ligar de novo a mesma saída troca o destino. */
export function ligarNoFluxo(
  d: Desenho,
  origem: string,
  saida: SaidaDoNo,
  destino: string,
): { ok: true; desenho: Desenho } | { ok: false; recusa: string | null } {
  const de = d.caixas.find((c) => c.id === origem);
  const para = d.caixas.find((c) => c.id === destino);
  if (!de || !para || origem === destino) return { ok: false, recusa: null };
  if (para.data.kind === "gatilho") return { ok: false, recusa: RECUSAS_DE_LIGACAO.noGatilho };
  if (!saidasDaCaixa(de).includes(saida)) return { ok: false, recusa: null };
  if (alcanca(d, destino, origem)) return { ok: false, recusa: RECUSAS_DE_LIGACAO.circulo };
  const ligacoes = d.ligacoes.filter((l) => !(l.source === origem && saidaDe(l) === saida));
  const id = proximoId(d.ligacoes.map((l) => l.id), "ligacao");
  ligacoes.push({ id, source: origem, target: destino, ...comSaida(saida) });
  return { ok: true, desenho: { caixas: d.caixas, ligacoes } };
}

/** O fim da cadeia "Próximo passo" a partir do gatilho: onde um passo novo entra quando nada está selecionado. */
function fimDaCadeia(d: Desenho): CaixaDoDesenho | null {
  let atual: CaixaDoDesenho | null = d.caixas.find((c) => c.data.kind === "gatilho") ?? null;
  const vistas = new Set<string>();
  while (atual && !vistas.has(atual.id)) {
    vistas.add(atual.id);
    const origem: string = atual.id;
    const l = d.ligacoes.find((x) => x.source === origem && saidaDe(x) === "proximo");
    const prox = l ? d.caixas.find((c) => c.id === l.target) : undefined;
    if (!prox) break;
    atual = prox;
  }
  return atual;
}

/** O passo novo entra logo depois da âncora, na primeira saída dela, assumindo o destino que essa saída tinha. */
export function inserirNoFluxo(d: Desenho, ancoraId: string | null, nova: CaixaDoDesenho): Desenho {
  const ancora = d.caixas.find((c) => c.id === ancoraId) ?? fimDaCadeia(d);
  const caixas = [...d.caixas, nova];
  if (!ancora) return { caixas, ligacoes: d.ligacoes };
  const saida = saidasDaCaixa(ancora)[0] ?? "proximo";
  const antiga = d.ligacoes.find((l) => l.source === ancora.id && saidaDe(l) === saida);
  const ids = d.ligacoes.map((l) => l.id);
  const primeira = proximoId(ids, "ligacao");
  const ligacoes = d.ligacoes.filter((l) => l !== antiga);
  ligacoes.push({ id: primeira, source: ancora.id, target: nova.id, ...comSaida(saida) });
  if (antiga) {
    const saidaDaNova = saidasDaCaixa(nova)[0] ?? "proximo";
    ligacoes.push({ id: proximoId([...ids, primeira], "ligacao"), source: nova.id, target: antiga.target, ...comSaida(saidaDaNova) });
  }
  return { caixas, ligacoes };
}

/** Tira as ligações cuja saída deixou de existir (botão apagado, grupo apagado, tempo de resposta desligado). */
export function semSaidasInvalidas(d: Desenho): Desenho {
  const validas = new Map(d.caixas.map((c) => [c.id, new Set<SaidaDoNo>(saidasDaCaixa(c))]));
  return { caixas: d.caixas, ligacoes: d.ligacoes.filter((l) => validas.get(l.source)?.has(saidaDe(l)) ?? false) };
}

const ESPACO_ENTRE_LINHAS = 40;

/** O fluxo em colunas: a coluna de cada caixa é o caminho mais longo até ela; dentro da coluna, de cima para baixo. */
export function organizarGrafo(d: Desenho, alturas?: ReadonlyMap<string, number>): Desenho {
  const gatilho = d.caixas.find((c) => c.data.kind === "gatilho");
  const altura = (id: string) => alturas?.get(id) ?? ALTURA_ESTIMADA_DO_NO;
  const coluna = new Map<string, number>(gatilho ? [[gatilho.id, 0]] : []);
  for (let volta = 0; volta < d.caixas.length; volta += 1) {
    let mudou = false;
    for (const l of d.ligacoes) {
      const de = coluna.get(l.source);
      if (de === undefined || (coluna.get(l.target) ?? -1) >= de + 1 || de + 1 > d.caixas.length) continue;
      coluna.set(l.target, de + 1);
      mudou = true;
    }
    if (!mudou) break;
  }
  const passo = LARGURA_DO_NO + ESPACO_ENTRE_NOS;
  const alturaDaColuna = new Map<number, number>();
  const posicoes = new Map<string, { x: number; y: number }>();
  for (const c of d.caixas) {
    const col = coluna.get(c.id);
    if (col === undefined) continue;
    const y = alturaDaColuna.get(col) ?? 0;
    posicoes.set(c.id, { x: col * passo, y });
    alturaDaColuna.set(col, y + altura(c.id) + ESPACO_ENTRE_LINHAS);
  }
  const ySolta = Math.max(0, ...alturaDaColuna.values()) + ESPACO_ENTRE_NOS;
  let x = 0;
  for (const c of d.caixas) {
    if (posicoes.has(c.id)) continue;
    posicoes.set(c.id, { x, y: ySolta });
    x += passo;
  }
  return { caixas: d.caixas.map((c) => ({ ...c, position: posicoes.get(c.id) ?? c.position })), ligacoes: d.ligacoes };
}

/** A arrumação certa para o modo do desenho: a linha de hoje ou as colunas do fluxo. */
export function organizarDoModo(d: Desenho, alturas?: ReadonlyMap<string, number>): Desenho {
  return emModoFluxo(d) ? organizarGrafo(d, alturas) : organizarNaHorizontal(d, alturas);
}

/** Uma caixa de Condições com `grupos` só tem as saídas dos grupos: a ligação sem saída vai para o primeiro grupo. */
export function normalizarSaidas(d: Desenho): Desenho {
  const primeiro = new Map<string, string>();
  for (const c of d.caixas) {
    const g = c.data.kind === "condicoes" ? c.data.grupos?.[0] : undefined;
    if (g) primeiro.set(c.id, g.id);
  }
  if (primeiro.size === 0) return d;
  return {
    caixas: d.caixas,
    ligacoes: d.ligacoes.map((l): LigacaoDoDesenho => (primeiro.has(l.source) && !l.saida ? { ...l, saida: `grupo:${primeiro.get(l.source)}` } : l)),
  };
}
