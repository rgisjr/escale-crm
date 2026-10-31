import type { ActionType } from "@/app/app/webhooks/_components/labels";
import { semAcento } from "@/lib/escale/automacoes/regras";

/**
 * FORK ESCALE · Fase 5B: a paleta "Adicionar passo" (07-014, 07-015) e o modal
 * "Ações" (D9, D10) do fluxo da casca. Só o que funciona no motor entra.
 */
export type SecaoDaPaleta = "comecar" | "canais" | "logica" | "ia";
export type PassoDaPaleta =
  | "gatilho"
  | "send_whatsapp_message"
  | "send_email"
  | "acoes"
  | "condicoes"
  | "send_ai_message"
  | "start_message_flow";
export interface ItemDaPaleta {
  passo: PassoDaPaleta;
  secao: SecaoDaPaleta;
  titulo: string;
  descricao: string;
}

export const ROTULO_DA_SECAO: Record<SecaoDaPaleta, string> = {
  comecar: "Começar",
  canais: "Canais",
  logica: "Lógica",
  ia: "Inteligência Artificial",
};
export const SECOES_DA_PALETA: readonly SecaoDaPaleta[] = ["comecar", "canais", "logica", "ia"];

export const ITENS_DA_PALETA: readonly ItemDaPaleta[] = [
  { passo: "gatilho", secao: "comecar", titulo: "Gatilho", descricao: "Quando a automação inicia" },
  { passo: "send_whatsapp_message", secao: "canais", titulo: "WhatsApp", descricao: "Enviar mensagem no WhatsApp" },
  { passo: "send_email", secao: "canais", titulo: "E-mail", descricao: "Enviar e-mail" },
  { passo: "acoes", secao: "logica", titulo: "Ações", descricao: "Mover etapa, tags e tarefas" },
  { passo: "condicoes", secao: "logica", titulo: "Condições", descricao: "Filtrar quem segue no fluxo" },
  { passo: "send_ai_message", secao: "ia", titulo: "Mensagem pela IA", descricao: "A IA escreve e envia a mensagem" },
  { passo: "start_message_flow", secao: "ia", titulo: "Iniciar follow-up", descricao: "Começa um fluxo de follow-up" },
];

/** Busca sem acento e sem caixa sobre título e descrição JÁ traduzidos; vazia devolve tudo. */
export function filtrarPaleta(busca: string, t: (s: string) => string): ItemDaPaleta[] {
  const termo = semAcento(busca.trim());
  if (!termo) return [...ITENS_DA_PALETA];
  return ITENS_DA_PALETA.filter((i) => semAcento(`${t(i.titulo)} ${t(i.descricao)}`).includes(termo));
}

export type AbaDasAcoes = "contatos" | "integracoes" | "crm";
export interface CartaoDeAcao {
  tipo: ActionType;
  titulo: string;
  descricao: string;
}
export interface AbaDeAcoes {
  aba: AbaDasAcoes;
  titulo: string;
  descricao: string;
  cartoes: readonly CartaoDeAcao[];
}

/**
 * As abas do modal "Realizar ação" (07, ao vivo): Dados do contato, Conversas, Integrações
 * e CRM na Clint. Aqui só as que têm ação no nosso motor: sem Conversas, e só com os
 * cartões que funcionam (nada de "Meta Ads" ou "Salvar campos").
 */
export const ABAS_DAS_ACOES: readonly AbaDeAcoes[] = [
  {
    aba: "contatos",
    titulo: "Dados do contato",
    descricao: "Gerencie as informações relacionadas ao contato",
    cartoes: [
      { tipo: "add_tag", titulo: "Adicionar tag", descricao: "Inclua tags aos seus contatos para facilitar a organização" },
      { tipo: "remove_tag", titulo: "Remover tag", descricao: "Remova tags dos seus contatos para reorganizar sua base" },
    ],
  },
  {
    aba: "integracoes",
    titulo: "Integrações",
    descricao: "Gerencie as informações relacionadas a integrações",
    cartoes: [{ tipo: "call_webhook", titulo: "Enviar Webhook", descricao: "Envie um Webhook quando uma determinada ação acontecer" }],
  },
  {
    aba: "crm",
    titulo: "CRM",
    descricao: "Gerencie as informações relacionadas ao CRM",
    cartoes: [
      { tipo: "create_or_move_lead", titulo: "Criar ou mover negócio", descricao: "Cria o negócio ou move para uma etapa do funil" },
      { tipo: "assign_owner", titulo: "Atribuir dono do negócio", descricao: "Defina quem atende o negócio" },
      { tipo: "create_task", titulo: "Tarefa interna", descricao: "Cria uma tarefa para a equipe, sem mensagem ao cliente" },
      { tipo: "apply_task_plan", titulo: "Plano de tarefas", descricao: "Aplica uma sequência de tarefas salva" },
    ],
  },
];

/** O título curto de um tipo de ação, como a paleta e o modal o chamam. */
export function tituloDaAcaoNoFluxo(tipo: string): string | null {
  const cartao = ABAS_DAS_ACOES.flatMap((a) => a.cartoes).find((c) => c.tipo === tipo);
  if (cartao) return cartao.titulo;
  return ITENS_DA_PALETA.find((i) => i.passo === tipo)?.titulo ?? null;
}

export type TipoDoNo = "gatilho" | "condicoes" | "whatsapp" | "email" | "acoes" | "ia";

/** send_whatsapp_message → whatsapp; send_email → email; send_ai_message, start_message_flow, ai_decide → ia; o resto (e o desconhecido) → acoes. */
export function tipoDoNo(
  dados: { kind: "gatilho" } | { kind: "condicoes" } | { kind: "acao"; acao: { type: string } },
): TipoDoNo {
  if (dados.kind === "gatilho") return "gatilho";
  if (dados.kind === "condicoes") return "condicoes";
  switch (dados.acao.type) {
    case "send_whatsapp_message":
      return "whatsapp";
    case "send_email":
      return "email";
    case "send_ai_message":
    case "start_message_flow":
    case "ai_decide":
      return "ia";
    default:
      return "acoes";
  }
}
