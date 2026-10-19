/**
 * Os textos do importador (fork Escale, Fase 2F), copiados das chaves
 * `importStudio.*` da Clint (`pt-BR-DmQ11GIn`), com a Escale OS no lugar da
 * Clint. Saem em pt; a tela traduz com `t()`.
 */
import type { Acao, Motivo, Nivel, TipoDeImportacao } from "./regras";

export const ROTULO_DO_MOTIVO: Record<Motivo, { rotulo: string; descricao: string }> = {
  MISSING_REQUIRED_FIELDS: {
    rotulo: "Sem nome, e-mail e telefone",
    descricao: "A linha não tem nenhum dado para identificar a pessoa. Não há o que importar.",
  },
  INVALID_EMAIL_FORMAT: {
    rotulo: "E-mail inválido",
    descricao: "O e-mail não tem um formato válido (falta @, falta domínio, etc.).",
  },
  INVALID_PHONE_FORMAT: {
    rotulo: "Telefone inválido",
    descricao: "O telefone é curto demais, tem caracteres estranhos ou um DDD que não existe.",
  },
  MATCH_FILL_EMPTY_FIELDS: {
    rotulo: "Preenche campos vazios",
    descricao: "A linha casou com um contato e traz dados em campos que ainda estavam vazios. Sem risco.",
  },
  MATCH_OVERWRITE_FILLED_FIELD: {
    rotulo: "Mudaria um campo já preenchido",
    descricao: "A linha traz um valor diferente em um campo que já está preenchido.",
  },
  MATCH_PHONE_DIFFERS: {
    rotulo: "Telefone diferente do cadastrado",
    descricao: "A linha casou pelo e-mail, mas traz um telefone diferente do que já está cadastrado.",
  },
  MATCH_INSTAGRAM_DIFFERS: {
    rotulo: "Instagram diferente do cadastrado",
    descricao: "A linha casou pelo e-mail, mas traz um Instagram diferente do que já está cadastrado.",
  },
  MERGE_HINT_EMAIL_PHONE_SPLIT: {
    rotulo: "A linha bate com dois contatos",
    descricao:
      "O e-mail desta linha pertence a um contato e o telefone pertence a outro. A Escale OS não decide sozinha.",
  },
  PHONE_HAS_ACTIVE_WHATSAPP: {
    rotulo: "Trocaria um telefone com WhatsApp em andamento",
    descricao:
      "A linha casou pelo e-mail e traz um telefone diferente, mas o atual tem uma conversa de WhatsApp em andamento.",
  },
  DUPLICATE_IN_BATCH: {
    rotulo: "Linha repetida no próprio arquivo",
    descricao:
      "Duas linhas do arquivo têm o mesmo e-mail ou telefone. A primeira é importada; a segunda é descartada.",
  },
  ORIGIN_NAME_NOT_FOUND: {
    rotulo: "Origem não encontrada",
    descricao: "A linha traz uma origem por nome que não existe na conta.",
  },
  STAGE_NAME_NOT_FOUND: {
    rotulo: "Etapa não encontrada",
    descricao: "A linha traz uma etapa por nome que não existe naquela origem.",
  },
  DEAL_DUPLICATE_OPEN: {
    rotulo: "Negócio em aberto repetido",
    descricao: "Esse contato já tem um negócio em aberto na mesma origem.",
  },
  DEAL_VALUE_INVALID: {
    rotulo: "Valor do negócio inválido",
    descricao: "A coluna de valor tem texto que não é um número.",
  },
  DEAL_ID_NOT_FOUND: {
    rotulo: "ID do negócio não encontrado",
    descricao: "O arquivo aponta um negócio por ID que não existe (excluído, de outra conta ou digitado errado).",
  },
};

export const ROTULO_DA_ACAO: Record<Acao, { rotulo: string; curto: string }> = {
  SKIP_ROW: { rotulo: "Descartar a linha", curto: "Descartar" },
  SKIP_PHONE_KEEP_REST: { rotulo: "Ignorar o telefone", curto: "Sem telefone" },
  UPDATE: { rotulo: "Atualizar (preencher vazios)", curto: "Preencher" },
  KEEP_DB: { rotulo: "Manter o que já existe", curto: "Manter atual" },
  OVERWRITE: { rotulo: "Substituir pelo arquivo", curto: "Substituir" },
  UPDATE_EMAIL_CONTACT: { rotulo: "Atualizar o contato do e-mail (A)", curto: "Atualizar A" },
  UPDATE_PHONE_CONTACT: { rotulo: "Atualizar o contato do telefone (B)", curto: "Atualizar B" },
  MERGE_CONTACTS: { rotulo: "Juntar os dois contatos", curto: "Juntar" },
  USE_DEFAULT: { rotulo: "Usar o padrão da importação", curto: "Padrão" },
  PICK_MANUALLY: { rotulo: "Escolher na lista", curto: "Escolher" },
  USE_FIRST: { rotulo: "Usar a 1ª etapa", curto: "1ª etapa" },
  UPDATE_EXISTING: { rotulo: "Atualizar o negócio existente", curto: "Atualizar" },
  CREATE_NEW: { rotulo: "Criar contato novo", curto: "Criar" },
  CREATE_NO_VALUE: { rotulo: "Criar sem valor", curto: "Sem valor" },
  CREATE_WITH_PARSED_VALUE: { rotulo: "Interpretar o valor", curto: "Interpretar" },
  PENDING_REVIEW: { rotulo: "Enviar para revisão", curto: "Revisar" },
};

const MOTIVOS_DE_NEGOCIO: readonly Motivo[] = ["DEAL_DUPLICATE_OPEN", "DEAL_ID_NOT_FOUND"];

/** Nos motivos de negócio, "Criar" é "Criar novo negócio" (Clint `dealLabel`). */
export function rotuloDaAcao(acao: Acao, motivo: Motivo): { rotulo: string; curto: string } {
  if (acao === "CREATE_NEW" && MOTIVOS_DE_NEGOCIO.includes(motivo)) {
    return { rotulo: "Criar novo negócio", curto: ROTULO_DA_ACAO.CREATE_NEW.curto };
  }
  return ROTULO_DA_ACAO[acao];
}

export const ROTULO_DO_NIVEL: Record<Nivel, { rotulo: string; texto: string }> = {
  conservador: {
    rotulo: "Conservador",
    texto: "Tudo que pode mudar um dado já cadastrado vai para revisão. Recomendado na primeira importação.",
  },
  padrao: {
    rotulo: "Padrão",
    texto:
      "Resolve sozinho o que é seguro; mudanças de campo, WhatsApp em andamento e negócios repetidos vão para revisão.",
  },
  agressivo: {
    rotulo: "Agressivo",
    texto:
      "Resolve quase tudo. Só telefone com WhatsApp em andamento e linhas que batem com dois contatos ficam para você.",
  },
};

export const ROTULO_DO_TIPO: Record<TipoDeImportacao, string> = { contato: "Contatos", negocio: "Negócios" };

export const STATUS_DA_IMPORTACAO = [
  "preparando",
  "na_fila",
  "importando",
  "aguardando_revisao",
  "concluida",
  "cancelada",
  "falhou",
] as const;
export type StatusDaImportacao = (typeof STATUS_DA_IMPORTACAO)[number];
export const STATUS_EM_ANDAMENTO: readonly StatusDaImportacao[] = ["preparando", "na_fila", "importando"];

export const ROTULO_DO_STATUS: Record<StatusDaImportacao, string> = {
  preparando: "Na fila",
  na_fila: "Na fila",
  importando: "Importando",
  aguardando_revisao: "Aguardando revisão",
  concluida: "Concluída",
  cancelada: "Cancelada",
  falhou: "Erro",
};

export const STATUS_DA_LINHA = ["na_fila", "processando", "importada", "revisar", "pulada", "erro"] as const;
export type StatusDaLinha = (typeof STATUS_DA_LINHA)[number];
