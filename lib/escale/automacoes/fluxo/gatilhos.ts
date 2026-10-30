import type { TriggerEvent } from "@/app/app/webhooks/_components/labels";

/**
 * FORK ESCALE · Fase 5B: o catálogo dos gatilhos agrupado por fonte, como a
 * escolha do gatilho da Clint (07-019, 07-022, 07-024). Só o que o motor tem:
 * Instagram, Atendimento e CTWA ficam de fora. Títulos entre aspas no plano são
 * os da Clint; os outros são nossos, no mesmo molde. Tudo passa por `t()`.
 */
export type FonteDoGatilho = "negocios" | "contatos" | "mensagens" | "agenda" | "datas";

/** Chaves de ícone (o mapa para componente fica em `visual-do-fluxo.ts`; aqui não entra React). */
export type IconeDoGatilho =
  | "maleta"
  | "trofeu"
  | "fechado"
  | "reaberto"
  | "dono"
  | "relogio"
  | "tag"
  | "telefone"
  | "mensagem"
  | "falha"
  | "silencio"
  | "agenda"
  | "confirmado"
  | "remarcado"
  | "cancelado"
  | "compareceu"
  | "faltou"
  | "data"
  | "aniversario";

export interface OpcaoDeGatilho {
  evento: TriggerEvent;
  titulo: string;
  descricao: string;
  icone: IconeDoGatilho;
}
export interface FonteDosGatilhos {
  fonte: FonteDoGatilho;
  rotulo: string;
  opcoes: readonly OpcaoDeGatilho[];
}

export const FONTES_DOS_GATILHOS: readonly FonteDosGatilhos[] = [
  {
    fonte: "negocios",
    rotulo: "Negócios",
    opcoes: [
      { evento: "lead.created", titulo: "Negócio criado pelo formulário", descricao: "Um negócio entrou por um formulário (webhook)", icone: "maleta" },
      { evento: "lead.stage_changed", titulo: "Negócio entrou na etapa", descricao: "Um negócio mudou de etapa no funil", icone: "maleta" },
      { evento: "lead.won", titulo: "Negócio ganho", descricao: "Um negócio foi marcado como ganho", icone: "trofeu" },
      { evento: "lead.lost", titulo: "Negócio perdido", descricao: "Um negócio foi marcado como perdido", icone: "fechado" },
      { evento: "lead.reopened", titulo: "Negócio reaberto", descricao: "Um negócio encerrado foi reaberto", icone: "reaberto" },
      { evento: "lead.assigned", titulo: "Dono do negócio", descricao: "Um negócio teve o dono alterado", icone: "dono" },
      { evento: "lead.stage_stale", titulo: "Tempo na etapa", descricao: "Um negócio completou um determinado tempo numa etapa", icone: "relogio" },
      { evento: "lead.tag_added", titulo: "Tag adicionada ao negócio", descricao: "Uma tag foi adicionada a um negócio", icone: "tag" },
    ],
  },
  {
    fonte: "contatos",
    rotulo: "Contatos",
    opcoes: [
      { evento: "contact.tag_added", titulo: "Tag adicionada ao contato", descricao: "Uma tag foi adicionada a um contato", icone: "tag" },
      { evento: "contact.phone_added", titulo: "Telefone adicionado ao contato", descricao: "Um contato sem telefone ganhou um número", icone: "telefone" },
    ],
  },
  {
    fonte: "mensagens",
    rotulo: "Mensagens",
    opcoes: [
      { evento: "message.received", titulo: "Contato envia uma mensagem", descricao: "O contato envia uma mensagem para o WhatsApp", icone: "mensagem" },
      { evento: "message.failed", titulo: "Mensagem não entregue", descricao: "Uma mensagem enviada não foi entregue", icone: "falha" },
      { evento: "lead.silent_for", titulo: "Tempo sem mensagem", descricao: "Uma conversa ficou um determinado tempo sem mensagem", icone: "silencio" },
    ],
  },
  {
    fonte: "agenda",
    rotulo: "Agenda",
    opcoes: [
      { evento: "appointment.created", titulo: "Horário marcado", descricao: "Um horário foi marcado na agenda", icone: "agenda" },
      { evento: "appointment.confirmed", titulo: "Horário confirmado", descricao: "Um horário pendente foi confirmado", icone: "confirmado" },
      { evento: "appointment.rescheduled", titulo: "Horário remarcado", descricao: "Um horário foi remarcado", icone: "remarcado" },
      { evento: "appointment.cancelled", titulo: "Horário cancelado", descricao: "Um horário foi cancelado", icone: "cancelado" },
      { evento: "appointment.completed", titulo: "Compareceu ao compromisso", descricao: "A equipe marcou que o contato compareceu", icone: "compareceu" },
      { evento: "appointment.no_show", titulo: "Faltou ao compromisso", descricao: "A equipe marcou que o contato faltou", icone: "faltou" },
    ],
  },
  {
    fonte: "datas",
    rotulo: "Datas",
    opcoes: [
      { evento: "lead.date_field_due", titulo: "Gatilho baseado em data", descricao: "Dispara N dias antes ou depois de uma data gravada num campo do funil", icone: "data" },
      { evento: "contact.birthday", titulo: "Aniversário do contato", descricao: "Dispara no dia do aniversário do contato", icone: "aniversario" },
    ],
  },
];

const COM_FORMULARIO: ReadonlySet<string> = new Set(["lead.created", "lead.date_field_due", "lead.silent_for", "lead.stage_stale"]);

/** Fonte do evento; evento desconhecido (ou vazio) → "negocios", a primeira. */
export function fonteDoEvento(evento: string): FonteDoGatilho {
  return FONTES_DOS_GATILHOS.find((f) => f.opcoes.some((o) => o.evento === evento))?.fonte ?? "negocios";
}

export function opcaoDoEvento(evento: string): OpcaoDeGatilho | null {
  for (const f of FONTES_DOS_GATILHOS) {
    const o = f.opcoes.find((x) => x.evento === evento);
    if (o) return o;
  }
  return null;
}

/** Os que têm configuração no gatilho (abre o formulário depois de escolher). */
export function precisaDeFormulario(evento: string): boolean {
  return COM_FORMULARIO.has(evento);
}
