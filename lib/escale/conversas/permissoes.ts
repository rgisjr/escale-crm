/**
 * AS 19 PERMISSÕES DE CONVERSAS DA CLINT (fork Escale, Fase 3C; E4; seção 5 do
 * PRD; prints c92 e c93). Nome = `label.tChat*` da Clint; descrição = a dos
 * prints. O papel padrão é o da seção 5. O MODO diz quem decide:
 *
 *   - `editavel`: o fork aplica no servidor (`fn_crm_pode`); cada pessoa pode ter
 *     exceção em `crm_permissoes_de_atendimento`, a partir do `piso`;
 *   - `papel`: o motor do original decide pelo papel (e pelo `visibility_mode`);
 *     o toggle mostra o valor real e fica travado;
 *   - `segue`: acompanha outra chave (enviar segue ver, no original);
 *   - `em_breve`: depende de recurso que ainda não existe.
 *
 * ⚠️ O papel padrão de cada chave editável tem espelho em SQL
 * (`fn_crm_papel_padrao`, migration 9203). O teste da Task 2 compara os dois.
 */
export type Papel = "viewer" | "agent" | "manager" | "admin";
export type ModoDaPermissao = "editavel" | "papel" | "segue" | "em_breve";
export type VisibilidadeDaOrganizacao = "all" | "own_and_unassigned" | "own";

const RANK: Readonly<Record<Papel, number>> = { viewer: 1, agent: 2, manager: 3, admin: 4 };
const ROTULO_DO_PAPEL: Readonly<Record<Papel, string>> = {
  viewer: "Leitor",
  agent: "Atendente",
  manager: "Gerente",
  admin: "Administrador",
};

export const papelAlcanca = (papel: Papel, minimo: Papel): boolean => RANK[papel] >= RANK[minimo];

export const PERMISSOES_DE_CONVERSAS = [
  {
    chave: "CHAT_VIEW_CHANNEL_ACCOUNT",
    rotulo: "Visualizar todos os dispositivos",
    descricao:
      "Permite visualizar todos os dispositivos nas Configurações de canais na tela de atendimento.",
    papelPadrao: "admin",
    modo: "editavel",
    piso: "agent",
  },
  {
    chave: "CHAT_ADD_CHANNEL_ACCOUNT",
    rotulo: "Adicionar um novo dispositivo",
    descricao: "Permite adicionar um novo dispositivo a conta",
    papelPadrao: "admin",
    modo: "papel",
  },
  {
    chave: "CHAT_DELETE_CHANNEL_ACCOUNT",
    rotulo: "Remover contas/dispositivos",
    descricao: "Permite remover uma conta ou dispositivo nas Configurações de canais",
    papelPadrao: "admin",
    modo: "papel",
  },
  {
    chave: "CHAT_CHANGE_STATUS_TEAM",
    rotulo: "Alterar status do atendimento do setor",
    descricao: "Permite alterar o status de atendimento de conversas de outros atendentes do setor",
    papelPadrao: "agent",
    modo: "papel",
  },
  {
    chave: "CHAT_CHANGE_STATUS_ALL",
    rotulo: "Alterar status do atendimento",
    descricao: "Permite alterar o status de atendimento de conversas de todos os setores",
    papelPadrao: "agent",
    modo: "papel",
  },
  {
    chave: "CHAT_DEAL_ACTIVITIES",
    rotulo: "Envio de mensagens nas atividades",
    descricao: "Permite enviar mensagens nas atividades através de um dispositivo cadastrado.",
    papelPadrao: "agent",
    modo: "papel",
  },
  {
    chave: "CHAT_VIEW_TEAM",
    rotulo: "Visualização de atendimento do setor",
    descricao: "Permite visualizar todos os atendimentos do setor.",
    papelPadrao: "agent",
    modo: "editavel",
    piso: "agent",
  },
  {
    chave: "CHAT_VIEW_UNASSIGNED",
    rotulo: "Visualizar conversas sem atendente",
    descricao:
      "Permite visualizar conversas sem atendente (não atribuídos) de acordo com as permissões de dispositivo.",
    papelPadrao: "agent",
    modo: "papel",
  },
  {
    chave: "CHAT_VIEW_ALL",
    rotulo: "Visualização de atendimento",
    descricao: "Permite a visualização de todos os atendimentos em dispositivos com permissão.",
    papelPadrao: "manager",
    modo: "papel",
  },
  {
    chave: "CHAT_SEND_MESSAGE_TEAM",
    rotulo: "Enviar mensagem no atendimento do setor",
    descricao: "Permissão para enviar mensagem para qualquer atendimento no setor.",
    papelPadrao: "agent",
    modo: "segue",
    segue: "CHAT_VIEW_TEAM",
  },
  {
    chave: "CHAT_CHANGE_ATTENDANT_TEAM",
    rotulo: "Alterar atendentes do setor",
    descricao: "Permite alterar o atendente de qualquer atendimento do setor.",
    papelPadrao: "manager",
    modo: "editavel",
    piso: "agent",
  },
  {
    chave: "CHAT_CHANGE_ATTENDANT_ALL",
    rotulo: "Alterar atendentes",
    descricao: "Permite alterar o atendente de qualquer atendimento.",
    papelPadrao: "manager",
    modo: "editavel",
    piso: "agent",
  },
  {
    chave: "CHAT_SEND_MESSAGE_ALL",
    rotulo: "Enviar mensagem no atendimento",
    descricao: "Permissão para enviar mensagem para qualquer atendimento.",
    papelPadrao: "manager",
    modo: "segue",
    segue: "CHAT_VIEW_ALL",
  },
  {
    chave: "CHAT_BULK_ACTIONS",
    rotulo: "Ações em massa",
    descricao:
      "Permite realizar ações em massa no chat. Exemplo: Alterar status, atendente, setor...",
    papelPadrao: "manager",
    modo: "editavel",
    piso: "agent",
  },
  {
    chave: "CHAT_EDIT_QUICK_RESPONSE",
    rotulo: "Editar ou excluir respostas rápidas",
    descricao: "Permite editar ou excluir respostas rápidas de outros usuários.",
    papelPadrao: "manager",
    modo: "editavel",
    piso: "agent",
  },
  {
    chave: "CHAT_SHARE_QUICK_RESPONSE",
    rotulo: "Compartilhar respostas rápidas",
    descricao: "Permite compartilhar respostas rápidas com outros usuários.",
    papelPadrao: "agent",
    modo: "editavel",
    piso: "agent",
  },
  {
    chave: "CHAT_EDIT_TEAMS",
    rotulo: "Editar ou excluir setores",
    descricao: "Permite editar ou excluir setores de outros usuários.",
    papelPadrao: "admin",
    modo: "editavel",
    piso: "manager",
  },
  {
    chave: "CHAT_CONFIG_MESSAGE_TEMPLATES",
    rotulo: "Configurar modelos de mensagem",
    descricao: "Permite acessar e configurar os modelos de mensagem de WhatsApp Oficial.",
    papelPadrao: "admin",
    modo: "em_breve",
  },
  {
    chave: "CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS",
    rotulo: "Consultar respostas rápidas de outros setores",
    descricao: "Permite, no chat, filtrar respostas rápidas por setores diferentes dos seus.",
    papelPadrao: "agent",
    modo: "editavel",
    piso: "agent",
  },
] as const satisfies ReadonlyArray<{
  chave: string;
  rotulo: string;
  descricao: string;
  papelPadrao: Papel;
  modo: ModoDaPermissao;
  piso?: Papel;
  segue?: string;
}>;

export type PermissaoDeConversas = (typeof PERMISSOES_DE_CONVERSAS)[number];
export type ChaveDePermissao = PermissaoDeConversas["chave"];
export type Excecoes = Partial<Record<ChaveDePermissao, boolean>>;

export const CHAVES_EDITAVEIS: ReadonlySet<ChaveDePermissao> = new Set(
  PERMISSOES_DE_CONVERSAS.filter((p) => p.modo === "editavel").map((p) => p.chave),
);

export const permissaoPorChave = (chave: ChaveDePermissao): PermissaoDeConversas =>
  PERMISSOES_DE_CONVERSAS.find((p) => p.chave === chave)!;

export interface ContextoDaPessoa {
  papel: Papel;
  visibilidade: VisibilidadeDaOrganizacao;
  excecoes: Excecoes;
}
export interface EstadoDoToggle {
  ligado: boolean;
  travado: boolean;
  dica: string | null;
}

/** O que o motor do ORIGINAL faz por papel (as chaves `papel`). Espelha `fn_can_view_conversation`. */
function valorDoOriginal(chave: ChaveDePermissao, ctx: ContextoDaPessoa): boolean {
  if (chave === "CHAT_VIEW_ALL") return ctx.papel !== "agent" || ctx.visibilidade === "all";
  if (chave === "CHAT_VIEW_UNASSIGNED") return ctx.papel !== "agent" || ctx.visibilidade !== "own";
  return papelAlcanca(ctx.papel, permissaoPorChave(chave).papelPadrao);
}

function valorEditavel(p: PermissaoDeConversas, ctx: ContextoDaPessoa): boolean {
  const excecao = ctx.excecoes[p.chave];
  return excecao ?? papelAlcanca(ctx.papel, p.papelPadrao);
}

export function estadoDoToggle(p: PermissaoDeConversas, ctx: ContextoDaPessoa): EstadoDoToggle {
  if (ctx.papel === "admin") return { ligado: true, travado: true, dica: "Usuário administrador" };
  switch (p.modo) {
    case "editavel": {
      const piso = p.piso;
      if (!papelAlcanca(ctx.papel, piso)) {
        return {
          ligado: false,
          travado: true,
          dica: `Disponível a partir de ${ROTULO_DO_PAPEL[piso]}`,
        };
      }
      return { ligado: valorEditavel(p, ctx), travado: false, dica: null };
    }
    case "segue": {
      const seguida = permissaoPorChave(p.segue);
      const ligado =
        seguida.modo === "editavel"
          ? valorEditavel(seguida, ctx)
          : valorDoOriginal(seguida.chave, ctx);
      const dica =
        p.segue === "CHAT_VIEW_TEAM"
          ? "Segue a visualização do atendimento do setor"
          : "Segue a visualização de atendimento";
      return { ligado, travado: true, dica };
    }
    case "em_breve":
      return { ligado: papelAlcanca(ctx.papel, p.papelPadrao), travado: true, dica: "Em breve" };
    case "papel":
    default:
      return {
        ligado: valorDoOriginal(p.chave, ctx),
        travado: true,
        dica:
          p.chave === "CHAT_VIEW_UNASSIGNED"
            ? "Definido pelo modo de visibilidade da organização"
            : "Definido pelo papel do usuário",
      };
  }
}

/** A exceção a gravar quando o toggle muda: `null` quando o valor volta a ser o do papel (a linha sai). */
export function excecaoAoMudar(
  p: PermissaoDeConversas,
  papel: Papel,
  ligado: boolean,
): boolean | null {
  return ligado === papelAlcanca(papel, p.papelPadrao) ? null : ligado;
}

/** "Desativar todos" (c92): todas as editáveis que a pessoa pode ter, desligadas. */
export function desativarTodos(papel: Papel): Excecoes {
  const saida: Excecoes = {};
  for (const p of PERMISSOES_DE_CONVERSAS) {
    if (p.modo !== "editavel") continue;
    if (!papelAlcanca(papel, p.piso)) continue;
    saida[p.chave] = false;
  }
  return saida;
}

export type GrupoDePermissao = Papel | "personalizado";
export const grupoDoUsuario = (papel: Papel, excecoes: Excecoes): GrupoDePermissao =>
  Object.keys(excecoes).length > 0 ? "personalizado" : papel;

/** O "Grupo de permissão" (c94): os papéis do original e "Personalizado" (N6). */
export const GRUPOS_DE_PERMISSAO: ReadonlyArray<{ valor: GrupoDePermissao; rotulo: string }> = [
  { valor: "admin", rotulo: "Administrador" },
  { valor: "manager", rotulo: "Gerente" },
  { valor: "agent", rotulo: "Atendente" },
  { valor: "viewer", rotulo: "Leitor" },
  { valor: "personalizado", rotulo: "Personalizado" },
];
export const rotuloDoGrupo = (g: GrupoDePermissao): string =>
  GRUPOS_DE_PERMISSAO.find((x) => x.valor === g)!.rotulo;

/** O menu à esquerda da aba Permissões (c92): só Conversas é desta fase. */
export const SECOES_DE_PERMISSAO = [
  { chave: "paginas", rotulo: "Páginas", ativa: false },
  { chave: "conversas", rotulo: "Conversas", ativa: true },
  { chave: "crm", rotulo: "CRM", ativa: false },
  { chave: "origens", rotulo: "Origens", ativa: false },
  { chave: "contatos", rotulo: "Contatos", ativa: false },
  { chave: "conta", rotulo: "Conta", ativa: false },
  { chave: "transcricao", rotulo: "Transcrição de chamada", ativa: false },
  { chave: "indicadores", rotulo: "Indicadores", ativa: false },
  { chave: "empresas", rotulo: "Empresas", ativa: false },
] as const;
