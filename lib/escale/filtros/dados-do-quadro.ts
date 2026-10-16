import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { Lead } from "@/lib/types/leads";

/**
 * O QUE OS FILTROS DO QUADRO LEEM E O CARD NÃO TINHA (fork Escale, Fase 1D).
 *
 * A rota do quadro anexa isto a cada negócio (`filtros_escale`) numa etapa do
 * fork (`ler-dados-do-quadro.ts`). Não é coluna e não entra no tipo `Lead` do
 * original: quem lê usa `dadosDeFiltro(lead)`, e ausente (payload antigo, quadro
 * de teste) vale como "nada a dizer".
 *
 * PURO de propósito, como `anexarDadosDoContato`: a regra fica testável sem banco.
 */
export interface ConversaDoFiltro {
  /** `conversations.status` cru; "aberta/encerrada" é decisão de `aplicar.ts`. */
  status: string;
  canal: string;
  atendente_id: string | null;
  /** Última mensagem do cliente e última da equipe: "não respondida" compara as duas. */
  ultima_entrada: string | null;
  ultima_saida: string | null;
}

export interface DadosDeFiltroDoNegocio {
  atividades_concluidas: number;
  /** Nulo sem contato, com contato anonimizado (LGPD) ou sem nome. */
  contato_nome: string | null;
  /**
   * FORK ESCALE · Casca V4: o contato tem foto. A tela pede a imagem pela rota
   * `GET /api/v1/contacts/{id}/avatar` (URL assinada curta, cache privado, nunca
   * para anonimizado): assinar aqui expiraria com o quadro aberto.
   */
  contato_tem_foto: boolean;
  /** A conversa MAIS RECENTE do contato: a mesma da capa (`withConversas`). */
  conversa: ConversaDoFiltro | null;
}

export type NegocioComFiltros = Lead & { filtros_escale?: DadosDeFiltroDoNegocio };

export function dadosDeFiltro(lead: Lead): DadosDeFiltroDoNegocio | undefined {
  return (lead as NegocioComFiltros).filtros_escale;
}

export interface LinhasDosFiltros {
  concluidas: ReadonlyArray<{ lead_id: string; total: number }>;
  contatos: ReadonlyArray<{
    id: string;
    name: string | null;
    display_name: string | null;
    is_anonymized: boolean | null;
    avatar_storage_path?: string | null;
  }>;
  conversas: ReadonlyArray<{
    contact_id: string;
    status: string;
    channel: string;
    assigned_to_user_id: string | null;
    last_inbound_at: string | null;
    last_outbound_at: string | null;
    last_message_at: string | null;
  }>;
}

const instante = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

export function anexarDadosDosFiltros(leads: readonly Lead[], linhas: LinhasDosFiltros): Lead[] {
  const concluidas = new Map(linhas.concluidas.map((c) => [c.lead_id, c.total]));
  // O nome de gente vem do helper central (`name` escolhido antes do `display_name`
  // do canal; identificador técnico nunca vira nome). Anonimizado (LGPD) não tem nome.
  const nomes = new Map(linhas.contatos.map((c) => [c.id, c.is_anonymized ? null : nomeDoContato(c)]));
  const comFoto = new Set(linhas.contatos.filter((c) => !c.is_anonymized && c.avatar_storage_path).map((c) => c.id));
  // A mais recente primeiro, sem data por último: a ordem de `withConversas`.
  const conversas = new Map<string, ConversaDoFiltro>();
  for (const c of [...linhas.conversas].sort((a, b) => instante(b.last_message_at) - instante(a.last_message_at))) {
    if (conversas.has(c.contact_id)) continue;
    conversas.set(c.contact_id, {
      status: c.status,
      canal: c.channel,
      atendente_id: c.assigned_to_user_id,
      ultima_entrada: c.last_inbound_at,
      ultima_saida: c.last_outbound_at,
    });
  }
  return leads.map(
    (lead): NegocioComFiltros => ({
      ...lead,
      filtros_escale: {
        atividades_concluidas: concluidas.get(lead.id) ?? 0,
        contato_nome: lead.contact_id ? (nomes.get(lead.contact_id) ?? null) : null,
        contato_tem_foto: lead.contact_id ? comFoto.has(lead.contact_id) : false,
        conversa: lead.contact_id ? (conversas.get(lead.contact_id) ?? null) : null,
      },
    }),
  );
}
