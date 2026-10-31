import type { ComponentType } from "react";

import type { ActionType } from "@/app/app/webhooks/_components/labels";
import type { FonteDoGatilho, IconeDoGatilho } from "@/lib/escale/automacoes/fluxo/gatilhos";
import type { TipoDoNo } from "@/lib/escale/automacoes/fluxo/paleta";
import { WhatsappLogo } from "@/lib/ui/icons";
import {
  ArrowLeftRight,
  Bell,
  Briefcase,
  Cake,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  CircleX,
  Clock,
  Flag,
  ListChecks,
  Mail,
  MessageCircle,
  MessageCircleOff,
  MessageCircleWarning,
  Phone,
  RotateCcw,
  Sparkles,
  SquareDashedKanban,
  Tag,
  Trophy,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Webhook,
  Workflow,
  Zap,
} from "@/lib/ui/icons-da-casca";

/**
 * FORK ESCALE · Fase 5B: a cara de cada tipo de nó do fluxo da casca (07-013,
 * 07-014, 07-025, 07-027; material 6). Gatilho, WhatsApp, canal e Ações têm a
 * cor de tipo da Clint; Condições e IA (o roxo da Clint) usam a marca.
 */
export type IconeDoFluxo = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;

export interface VisualDoNo {
  icone: IconeDoFluxo;
  /** Letra miúda em cima do título ("WhatsApp", "Ações"); null no gatilho e nas condições, que têm título grande. */
  rotulo: string | null;
  /** Classe da cor do título e do ícone. */
  texto: string;
  /** Classe da borda do nó selecionado. */
  borda: string;
  /** Fundo suave: quadrado do ícone na paleta e cabeçalho do painel. */
  fundo: string;
}

export const VISUAL_DO_NO: Record<TipoDoNo, VisualDoNo> = {
  gatilho: { icone: Flag, rotulo: null, texto: "text-casca-fluxo-gatilho", borda: "border-casca-fluxo-gatilho", fundo: "bg-casca-fluxo-gatilho-suave" },
  condicoes: { icone: ArrowLeftRight, rotulo: null, texto: "text-casca-marca", borda: "border-casca-marca", fundo: "bg-casca-marca-suave" },
  whatsapp: { icone: WhatsappLogo as IconeDoFluxo, rotulo: "WhatsApp", texto: "text-casca-fluxo-whatsapp", borda: "border-casca-fluxo-whatsapp", fundo: "bg-casca-fluxo-whatsapp-suave" },
  email: { icone: Mail, rotulo: "E-mail", texto: "text-casca-fluxo-canal", borda: "border-casca-fluxo-canal", fundo: "bg-casca-fluxo-canal-suave" },
  acoes: { icone: Zap, rotulo: "Ações", texto: "text-casca-fluxo-acoes", borda: "border-casca-fluxo-acoes", fundo: "bg-casca-fluxo-acoes-suave" },
  ia: { icone: Sparkles, rotulo: "Inteligência Artificial", texto: "text-casca-marca", borda: "border-casca-marca", fundo: "bg-casca-marca-suave" },
};

export const ICONE_DO_GATILHO: Record<IconeDoGatilho, IconeDoFluxo> = {
  maleta: Briefcase,
  trofeu: Trophy,
  fechado: CircleX,
  reaberto: RotateCcw,
  dono: UserRound,
  relogio: Clock,
  tag: Tag,
  telefone: Phone,
  mensagem: MessageCircle,
  falha: MessageCircleWarning,
  silencio: MessageCircleOff,
  agenda: CalendarPlus,
  confirmado: CalendarCheck,
  remarcado: CalendarClock,
  cancelado: CalendarX,
  compareceu: UserCheck,
  faltou: UserX,
  data: CalendarDays,
  aniversario: Cake,
};

export const ICONE_DA_FONTE: Record<FonteDoGatilho, IconeDoFluxo> = {
  negocios: Briefcase,
  contatos: UserRound,
  mensagens: MessageCircle,
  agenda: CalendarDays,
  datas: CalendarClock,
};

export const ICONE_DA_ACAO: Record<ActionType, IconeDoFluxo> = {
  create_or_move_lead: SquareDashedKanban,
  assign_owner: UserPlus,
  create_task: Bell,
  apply_task_plan: ListChecks,
  add_tag: Tag,
  call_webhook: Webhook,
  send_whatsapp_message: WhatsappLogo as IconeDoFluxo,
  send_email: Mail,
  send_ai_message: Sparkles,
  start_message_flow: Workflow,
};
