/**
 * O HUB ⚙ "CONVERSAS › CONFIGURAÇÕES" (fork Escale, Fase 3C; E5; c37). A ordem,
 * os títulos e as descrições são os da Clint (`component.ConfigurationsOptions.*`).
 * Modelos, Flows e Análise de templates dependem da Meta (decisão 9): "Em breve".
 */
export type IconeDoHub =
  | "dispositivo"
  | "setores"
  | "agendadas"
  | "respostas"
  | "usuarios"
  | "notificacoes"
  | "modelos"
  | "flows"
  | "analise";

export interface CartaoDoHub {
  chave: IconeDoHub;
  titulo: string;
  descricao: string;
  destino: string | null;
  emBreve: boolean;
  soAdmin: boolean;
}

export const CARTOES_DO_HUB: readonly CartaoDoHub[] = [
  {
    chave: "dispositivo",
    titulo: "Dispositivo",
    descricao: "Configure seus dispositivos, atendentes, canais e mais.",
    destino: "/app/inbox/configuracoes/canais",
    emBreve: false,
    soAdmin: false,
  },
  {
    chave: "setores",
    titulo: "Setores",
    descricao: "Gerencie os setores de atendimentos do seu time.",
    destino: "/app/inbox/configuracoes/setores",
    emBreve: false,
    soAdmin: false,
  },
  {
    chave: "agendadas",
    titulo: "Mensagens agendadas",
    descricao: "Agende uma nova mensagem ou veja quais estão programadas para envio.",
    destino: "/app/inbox/configuracoes/mensagens-agendadas",
    emBreve: false,
    soAdmin: false,
  },
  {
    chave: "respostas",
    titulo: "Respostas rápidas",
    descricao: "Ajuste as respostas mais usadas pelo seu time.",
    destino: "/app/inbox/configuracoes/respostas-rapidas",
    emBreve: false,
    soAdmin: false,
  },
  {
    chave: "usuarios",
    titulo: "Usuários e Permissões",
    descricao: "Habilite permissões que cada usuário pode fazer no módulo de conversas.",
    destino: "/app/inbox/configuracoes/usuarios",
    emBreve: false,
    soAdmin: true,
  },
  {
    chave: "notificacoes",
    titulo: "Notificações",
    descricao: "Fique por dentro de todas as notificações de atendimento que você tem acesso.",
    destino: "/app/settings/notifications",
    emBreve: false,
    soAdmin: false,
  },
  {
    chave: "modelos",
    titulo: "Modelos de mensagem",
    descricao: "Gerencie seus modelos de mensagem de WhatsApp.",
    destino: "/app/inbox/configuracoes/modelos-de-mensagem",
    emBreve: false,
    soAdmin: false,
  },
  {
    chave: "flows",
    titulo: "WhatsApp Flows",
    descricao: "Crie formulários com várias telas e dados do contato já preenchidos.",
    destino: null,
    emBreve: true,
    soAdmin: false,
  },
  {
    chave: "analise",
    titulo: "Análise de templates",
    descricao: "Acompanhe entregas, falhas e a saúde dos seus modelos de mensagem.",
    destino: null,
    emBreve: true,
    soAdmin: false,
  },
];
