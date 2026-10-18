/**
 * O PLAYBOOK DA ORIGEM (fork Escale, Fase 1I; D10): regras puras das
 * atividades por etapa, como a Clint as guarda (`template_activity`): título,
 * tipo, visibilidade, prazo em MINUTOS depois da entrada na etapa
 * (`time_to_check`), ordem e o conteúdo (mensagem, roteiro ou instrução).
 * Sem React e sem rede.
 *
 * - A tela mostra o prazo na maior unidade que o divide sem sobra
 *   ("1 dia(s)", selo "1D").
 * - A ordem só desempata atividades de mesmo prazo: as setas ↑↓ só trocam
 *   vizinhas de mesmo prazo, como na Clint.
 * - `TIPOS_DE_ATIVIDADE` e `VISIBILIDADES_DA_ATIVIDADE` são os CHECKs da 9009.
 */
import { z } from "zod";

export const TIPOS_DE_ATIVIDADE = [
  "whatsapp",
  "instagram",
  "ligacao",
  "email",
  "agendamento",
  "tarefa",
  "reuniao",
] as const;
export type TipoDeAtividade = (typeof TIPOS_DE_ATIVIDADE)[number];

export const VISIBILIDADES_DA_ATIVIDADE = ["padrao", "nao_listada"] as const;
export type VisibilidadeDaAtividade = (typeof VISIBILIDADES_DA_ATIVIDADE)[number];

export const ROTULO_DO_TIPO: Record<TipoDeAtividade, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  ligacao: "Ligação",
  email: "Email",
  agendamento: "Agendamento",
  tarefa: "Tarefa",
  reuniao: "Reunião",
};

export const EXEMPLO_DO_TITULO: Record<TipoDeAtividade, string> = {
  whatsapp: "Ex: Whatsapp de convite",
  instagram: "Ex: Instagram de convite",
  ligacao: "Ex: Ligação de prospecção",
  email: "Ex: Email de abordagem",
  agendamento: "Ex: Agendamento de reunião",
  tarefa: "Ex: Validar ICP",
  reuniao: "Ex: Reunião de validação",
};

export const AVISO_DO_TIPO: Record<TipoDeAtividade, string> = {
  whatsapp: "Você poderá configurar a mensagem após a criação da atividade.",
  instagram: "Você poderá configurar a mensagem após a criação da atividade.",
  ligacao: "Você poderá configurar o script de ligação após a criação da atividade.",
  email: "Você poderá configurar o email após a criação da atividade.",
  agendamento: "Você poderá configurar o agendamento após a criação da atividade.",
  tarefa: "Você poderá configurar a tarefa após a criação da atividade.",
  reuniao: "Você poderá configurar a reunião após a criação da atividade.",
};

/** O que a caixa do conteúdo mostra vazia (Clint: editores por tipo, `TextTab`). */
export const VAZIO_DO_CONTEUDO: Record<TipoDeAtividade, string> = {
  whatsapp: "Clique aqui para adicionar o conteúdo da mensagem.",
  instagram: "Clique aqui para adicionar o conteúdo da mensagem.",
  ligacao: "Adicione o seu script",
  email: "Adicione o seu texto",
  agendamento: "Adicione o seu texto",
  tarefa: "Adicione o seu texto",
  reuniao: "Adicione o seu texto",
};

export type UnidadeDoPrazo = "minuto" | "hora" | "dia" | "semana" | "mes" | "ano";

export const UNIDADES_DO_PRAZO: readonly {
  unidade: UnidadeDoPrazo;
  minutos: number;
  rotulo: string;
  texto: string;
  inicial: string;
}[] = [
  { unidade: "minuto", minutos: 1, rotulo: "Minuto", texto: "minuto(s)", inicial: "m" },
  { unidade: "hora", minutos: 60, rotulo: "Hora", texto: "hora(s)", inicial: "H" },
  { unidade: "dia", minutos: 1440, rotulo: "Dia", texto: "dia(s)", inicial: "D" },
  { unidade: "semana", minutos: 10080, rotulo: "Semana", texto: "semana(s)", inicial: "S" },
  { unidade: "mes", minutos: 43200, rotulo: "Mês", texto: "mês(es)", inicial: "M" },
  { unidade: "ano", minutos: 525600, rotulo: "Ano", texto: "ano(s)", inicial: "A" },
];

export const PRAZO_PADRAO_EM_MINUTOS = 1440;
export const QUANTIDADE_MAXIMA_DO_PRAZO = 999;
export const PRAZO_MAXIMO_EM_MINUTOS = QUANTIDADE_MAXIMA_DO_PRAZO * 525600;
export const MAX_ATIVIDADES_DO_PLAYBOOK = 300;
/** O teto de uma mensagem no original (`sendMessageSchema.body`). */
export const MAX_CONTEUDO_DA_ATIVIDADE = 4096;

/** Os atalhos do popover do prazo. "No mesmo dia" é 23 horas na Clint. */
export const ATALHOS_DO_PRAZO: readonly { rotulo: string; minutos: number }[] = [
  { rotulo: "No mesmo dia", minutos: 23 * 60 },
  { rotulo: "Em um dia", minutos: 1440 },
  { rotulo: "Em 3 dias", minutos: 3 * 1440 },
  { rotulo: "Em uma semana", minutos: 10080 },
  { rotulo: "Em duas semanas", minutos: 2 * 10080 },
];

export interface AtividadeDoPlaybook {
  id: string;
  etapaId: string;
  titulo: string;
  tipo: TipoDeAtividade;
  visibilidade: VisibilidadeDaAtividade;
  prazoMinutos: number;
  ordem: number;
  conteudo: string | null;
}

/** A linha como a rota e o banco a conhecem (`crm_atividades_da_etapa`). */
export interface ModeloDaEtapa {
  id: string;
  stage_id: string;
  titulo: string;
  tipo: TipoDeAtividade;
  visibilidade: VisibilidadeDaAtividade;
  prazo_minutos: number;
  ordem: number;
  conteudo: string | null;
}

const unidade = (u: UnidadeDoPrazo) => UNIDADES_DO_PRAZO.find((x) => x.unidade === u)!;

export function prazoPorUnidade(minutos: number): { quantidade: number; unidade: UnidadeDoPrazo } {
  if (minutos <= 0) return { quantidade: 0, unidade: "dia" };
  for (const u of [...UNIDADES_DO_PRAZO].reverse()) {
    if (minutos % u.minutos === 0) return { quantidade: minutos / u.minutos, unidade: u.unidade };
  }
  return { quantidade: minutos, unidade: "minuto" };
}

export const minutosDoPrazo = (quantidade: number, u: UnidadeDoPrazo): number =>
  quantidade * unidade(u).minutos;

export const quantidadeDoPrazoValida = (q: number): boolean =>
  Number.isInteger(q) && q >= 1 && q <= QUANTIDADE_MAXIMA_DO_PRAZO;

export function textoDoPrazo(minutos: number, t: (s: string) => string): string {
  if (minutos <= 0) return t("Ao entrar na etapa");
  const p = prazoPorUnidade(minutos);
  return `${p.quantidade} ${t(unidade(p.unidade).texto)}`;
}

export function seloDoPrazo(minutos: number): {
  numero: number;
  inicial: string;
  unidade: UnidadeDoPrazo;
} {
  const p = prazoPorUnidade(minutos);
  return { numero: p.quantidade, inicial: unidade(p.unidade).inicial, unidade: p.unidade };
}

export const doServidor = (m: ModeloDaEtapa): AtividadeDoPlaybook => ({
  id: m.id,
  etapaId: m.stage_id,
  titulo: m.titulo,
  tipo: m.tipo,
  visibilidade: m.visibilidade,
  prazoMinutos: m.prazo_minutos,
  ordem: m.ordem,
  conteudo: m.conteudo,
});

export const paraOServidor = (a: AtividadeDoPlaybook): ModeloDaEtapa => ({
  id: a.id,
  stage_id: a.etapaId,
  titulo: a.titulo,
  tipo: a.tipo,
  visibilidade: a.visibilidade,
  prazo_minutos: a.prazoMinutos,
  ordem: a.ordem,
  conteudo: a.conteudo,
});

export function compararAtividades(
  a: Pick<AtividadeDoPlaybook, "prazoMinutos" | "ordem" | "titulo">,
  b: Pick<AtividadeDoPlaybook, "prazoMinutos" | "ordem" | "titulo">,
): number {
  return (
    a.prazoMinutos - b.prazoMinutos ||
    a.ordem - b.ordem ||
    a.titulo.localeCompare(b.titulo, "pt-BR")
  );
}

export function atividadesDaEtapa(
  lista: readonly AtividadeDoPlaybook[],
  etapaId: string,
): AtividadeDoPlaybook[] {
  return lista.filter((a) => a.etapaId === etapaId).sort(compararAtividades);
}

export function adicionarAtividade(
  lista: readonly AtividadeDoPlaybook[],
  nova: Omit<AtividadeDoPlaybook, "ordem">,
): AtividadeDoPlaybook[] {
  const daEtapa = lista.filter((a) => a.etapaId === nova.etapaId);
  const ordem = daEtapa.length > 0 ? Math.max(...daEtapa.map((a) => a.ordem)) + 1 : 0;
  return [...lista, { ...nova, ordem }];
}

export function atualizarAtividade(
  lista: readonly AtividadeDoPlaybook[],
  id: string,
  mudanca: Partial<Omit<AtividadeDoPlaybook, "id" | "ordem">>,
): AtividadeDoPlaybook[] {
  const atual = lista.find((a) => a.id === id);
  if (!atual) return [...lista];
  if (mudanca.etapaId && mudanca.etapaId !== atual.etapaId) {
    const { ordem: _ordem, ...resto } = { ...atual, ...mudanca };
    return adicionarAtividade(
      lista.filter((a) => a.id !== id),
      resto,
    );
  }
  return lista.map((a) => (a.id === id ? { ...a, ...mudanca } : a));
}

export const removerAtividade = (
  lista: readonly AtividadeDoPlaybook[],
  id: string,
): AtividadeDoPlaybook[] => lista.filter((a) => a.id !== id);

export function vizinhaDeMesmoPrazo(
  lista: readonly AtividadeDoPlaybook[],
  id: string,
  passo: -1 | 1,
): string | null {
  const atual = lista.find((a) => a.id === id);
  if (!atual) return null;
  const daEtapa = atividadesDaEtapa(lista, atual.etapaId);
  const vizinha = daEtapa[daEtapa.findIndex((a) => a.id === id) + passo];
  return vizinha && vizinha.prazoMinutos === atual.prazoMinutos ? vizinha.id : null;
}

/** Troca com a vizinha de mesmo prazo e renumera a ordem da etapa (0, 1, 2…). Sem vizinha, devolve a MESMA lista. */
export function trocarDeLugar(
  lista: readonly AtividadeDoPlaybook[],
  id: string,
  passo: -1 | 1,
): readonly AtividadeDoPlaybook[] {
  if (!vizinhaDeMesmoPrazo(lista, id, passo)) return lista;
  const atual = lista.find((a) => a.id === id)!;
  const daEtapa = atividadesDaEtapa(lista, atual.etapaId);
  const i = daEtapa.findIndex((a) => a.id === id);
  const trocada = [...daEtapa];
  [trocada[i], trocada[i + passo]] = [trocada[i + passo]!, trocada[i]!];
  const ordem = new Map(trocada.map((a, k) => [a.id, k]));
  return lista.map((a) => (ordem.has(a.id) ? { ...a, ordem: ordem.get(a.id)! } : a));
}

const chaveDoPlaybook = (lista: readonly AtividadeDoPlaybook[]) =>
  JSON.stringify(lista.map(paraOServidor).sort((a, b) => a.id.localeCompare(b.id)));

export const playbookMudou = (
  rascunho: readonly AtividadeDoPlaybook[],
  salvo: readonly AtividadeDoPlaybook[],
) => chaveDoPlaybook(rascunho) !== chaveDoPlaybook(salvo);

/** O selo do canto da aba (Q12): sem modelos no Escale, só "customizada" ou "nenhum". */
export const rotuloDoModelo = (temAtividadeSalva: boolean): string =>
  temAtividadeSalva ? "Origem customizada" : "Nenhum modelo";

export const modeloSchema = z
  .object({
    id: z.string().uuid(),
    stage_id: z.string().uuid(),
    titulo: z.string().trim().min(1).max(255),
    tipo: z.enum(TIPOS_DE_ATIVIDADE),
    visibilidade: z.enum(VISIBILIDADES_DA_ATIVIDADE),
    prazo_minutos: z.number().int().min(0).max(PRAZO_MAXIMO_EM_MINUTOS),
    ordem: z.number().int().min(0).max(9999),
    conteudo: z.string().max(MAX_CONTEUDO_DA_ATIVIDADE).nullable(),
  })
  .strict();

export const playbookSchema = z
  .object({ atividades: z.array(modeloSchema).max(MAX_ATIVIDADES_DO_PLAYBOOK) })
  .strict()
  .refine((v) => new Set(v.atividades.map((a) => a.id)).size === v.atividades.length, {
    message: "Atividade repetida.",
  });

export type PedidoDoPlaybook = z.infer<typeof playbookSchema>;
