/**
 * OS PORTÕES DA IMPORTAÇÃO (fork Escale, Fase 2F; Clint "Import Studio": as
 * situações de `M` e a tela de revisão `oo`). Cada linha passa pelos portões
 * na ordem (A → C → B/D → E). O primeiro que pede "Revisar" para a linha com
 * aquele motivo; "Descartar" pula; as outras escolhas seguem adiante. Ao
 * resolver na revisão, a linha roda de novo com `resolucoes` e pode parar num
 * portão seguinte. Puro: o contexto (o que o banco já tem) vem pronto.
 */
import { samePhone } from "@/lib/channels/phone-variants";

import { TAGS_MAX, interpretarValor, type DadosDaLinha, type StatusDoNegocio, type ValorDeCampo } from "./linhas";
import { decisaoDe, type Acao, type Decisoes, type Motivo, type TipoDeImportacao } from "./regras";

export const MOTIVO_PADRAO_DE_PERDA = "other";

export interface ContatoExistente {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  nascimento: string | null;
  campos: Record<string, unknown>;
  tags: string[];
  empresa: { id: string; nome: string | null } | null;
}

export interface NegocioExistente {
  id: string;
  titulo: string;
  origemId: string;
  campos: Record<string, unknown>;
}

export interface ContextoDoNegocio {
  porId: NegocioExistente | null;
  abertoNaOrigem: (contatoId: string, origemId: string) => NegocioExistente | null;
  origemPorNome: (nome: string) => string | null;
  etapaPorNome: (origemId: string, nome: string) => string | null;
  primeiraEtapa: (origemId: string) => string | null;
  donoPorTexto: (texto: string) => string | null;
  padrao: { origemId: string; etapaId: string; status: StatusDoNegocio; motivoDePerda: string | null };
}

export interface ContextoDaLinha {
  tipo: TipoDeImportacao;
  porId: ContatoExistente | null;
  porEmail: ContatoExistente | null;
  porTelefone: ContatoExistente | null;
  whatsappAtivo: (contatoId: string) => boolean;
  tagsDaImportacao: readonly string[];
  negocio: ContextoDoNegocio | null;
}

export interface Resolucao {
  acao: Acao;
  dados?: { origemId?: string; etapaId?: string; sobrescrever?: string[] };
}
export type Resolucoes = Partial<Record<Motivo, Resolucao>>;

export type CasouPor = "id" | "email" | "telefone";
export interface ResumoDoContato {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  casouPor: CasouPor;
  whatsapp: boolean;
}
export interface Diferenca {
  campo: string;
  valorAtual: unknown;
  valorDoArquivo: unknown;
}
export interface Avisos {
  id?: string;
  negocioId?: string;
  email?: string;
  telefone?: string;
  dono?: string;
  campos?: Array<{ campo: string; valor: string }>;
}
export interface Detalhe {
  casouPor?: CasouPor;
  contato?: ResumoDoContato;
  contatos?: ResumoDoContato[];
  campo?: string;
  valorAtual?: unknown;
  valorDoArquivo?: unknown;
  outrasDiferencas?: Diferenca[];
  preenchimentos?: Array<{ campo: string; valor: unknown }>;
  telefoneAtual?: string;
  telefoneDoArquivo?: string;
  instagramAtual?: string;
  instagramDoArquivo?: string;
  emailInvalido?: string;
  telefoneInvalido?: string;
  primeiraLinha?: number;
  origemDoArquivo?: string;
  etapaDoArquivo?: string;
  origemId?: string;
  negocioIdDoArquivo?: string;
  negocioAtual?: string;
  valorInvalido?: string;
  avisos: Avisos;
}

export interface NovoContato {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  nascimento: string | null;
  cpf: string | null;
  campos: Record<string, ValorDeCampo>;
  tags: string[];
}
export interface MudancasDoContato {
  nome?: string;
  email?: string;
  telefone?: string;
  instagram?: string;
  nascimento?: string;
  empresa?: string;
  campos?: Record<string, ValorDeCampo>;
  tags?: string[];
}
export type PlanoDoContato = { tipo: "criar"; dados: NovoContato } | { tipo: "atualizar"; id: string; mudancas: MudancasDoContato };
/** `nome` e `cnpj` nulos = a empresa atual do contato (ou uma nova sem nome). Os campos só preenchem vazios (N9). */
export interface PlanoDaEmpresa {
  nome: string | null;
  cnpj: { formatado: string; normalizado: string } | null;
  campos: Record<string, ValorDeCampo>;
}
export type PlanoDoNegocio =
  | {
      tipo: "criar";
      origemId: string;
      etapaId: string;
      titulo: string | null;
      valorCentavos: number | null;
      donoId: string | null;
      campos: Record<string, ValorDeCampo>;
      status: StatusDoNegocio;
      motivoDePerda: string | null;
      ganhoEm: string | null;
    }
  | {
      tipo: "atualizar";
      id: string;
      titulo: string | null;
      valorCentavos: number | null;
      donoId: string | null;
      campos: Record<string, ValorDeCampo>;
    };
export interface Plano {
  contato: PlanoDoContato;
  empresa: PlanoDaEmpresa | null;
  negocio: PlanoDoNegocio | null;
}
export type Desfecho =
  | { tipo: "pular"; motivo: Motivo; detalhe: Detalhe }
  | { tipo: "revisar"; motivo: Motivo; detalhe: Detalhe }
  | { tipo: "importar"; plano: Plano; detalhe: Detalhe };

const vazio = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const igual = (a: unknown, b: unknown) => {
  if (typeof a === "string" && typeof b === "string") return a.trim().toLowerCase() === b.trim().toLowerCase();
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify([...a].map(String).sort()) === JSON.stringify([...b].map(String).sort());
  return String(a) === String(b);
};

function somarTags(...listas: ReadonlyArray<readonly string[]>): string[] {
  return [...new Set(listas.flat())].slice(0, TAGS_MAX);
}

function resumo(c: ContatoExistente, casouPor: CasouPor, ctx: ContextoDaLinha): ResumoDoContato {
  return { id: c.id, nome: c.nome, email: c.email, telefone: c.telefone, casouPor, whatsapp: ctx.whatsappAtivo(c.id) };
}

function aplicar(m: MudancasDoContato, campo: string, valor: unknown): MudancasDoContato {
  if (campo.startsWith("campo:")) return { ...m, campos: { ...m.campos, [campo.slice(6)]: valor as ValorDeCampo } };
  const chave = { nome: "nome", email: "email", telefone: "telefone", instagram: "instagram", nascimento: "nascimento", empresa: "empresa" }[
    campo
  ] as keyof MudancasDoContato | undefined;
  return chave ? { ...m, [chave]: valor } : m;
}

export function classificar(
  l: DadosDaLinha,
  repetidaDe: number | null,
  ctx: ContextoDaLinha,
  decisoes: Decisoes,
  resolucoes: Resolucoes = {},
): Desfecho {
  const avisos: Avisos = {};
  if (l.invalidos.id) avisos.id = l.invalidos.id;
  if (l.invalidos.negocioId) avisos.negocioId = l.invalidos.negocioId;
  if (l.descartados.length > 0) avisos.campos = [...l.descartados];
  const detalhe: Detalhe = { avisos };
  const escolha = (m: Motivo): Resolucao => resolucoes[m] ?? { acao: decisaoDe(m, decisoes) };
  const parar = (m: Motivo, r: Resolucao): Desfecho | null => {
    if (r.acao === "SKIP_ROW") return { tipo: "pular", motivo: m, detalhe };
    if (r.acao === "PENDING_REVIEW") return { tipo: "revisar", motivo: m, detalhe };
    return null;
  };
  const pular = (m: Motivo): Desfecho => ({ tipo: "pular", motivo: m, detalhe });

  let telefone = l.telefone;
  let email = l.email;
  const semIdentidade = () => !l.id && !l.nome && !email && !telefone;

  // ── A: linhas novas e inválidas ──
  if (semIdentidade() && !l.invalidos.telefone && !l.invalidos.email) return pular("MISSING_REQUIRED_FIELDS");
  if (l.invalidos.email) {
    detalhe.emailInvalido = l.invalidos.email;
    return pular("INVALID_EMAIL_FORMAT");
  }
  if (repetidaDe !== null) {
    detalhe.primeiraLinha = repetidaDe;
    return pular("DUPLICATE_IN_BATCH");
  }
  if (l.invalidos.telefone) {
    detalhe.telefoneInvalido = l.invalidos.telefone;
    const fim = parar("INVALID_PHONE_FORMAT", escolha("INVALID_PHONE_FORMAT"));
    if (fim) return fim;
    avisos.telefone = l.invalidos.telefone;
    if (semIdentidade()) return pular("MISSING_REQUIRED_FIELDS");
  }

  // ── C: quem é o contato ──
  let alvo: ContatoExistente | null = null;
  let casouPor: CasouPor | null = null;
  if (ctx.porId) {
    alvo = ctx.porId;
    casouPor = "id";
  } else {
    const a = email ? ctx.porEmail : null;
    const b = telefone ? ctx.porTelefone : null;
    if (a && b && a.id !== b.id) {
      detalhe.contatos = [resumo(a, "email", ctx), resumo(b, "telefone", ctx)];
      const r = escolha("MERGE_HINT_EMAIL_PHONE_SPLIT");
      const fim = parar("MERGE_HINT_EMAIL_PHONE_SPLIT", r);
      if (fim) return fim;
      if (r.acao === "UPDATE_EMAIL_CONTACT") {
        alvo = a;
        casouPor = "email";
        if (telefone) avisos.telefone = telefone;
        telefone = null;
      } else {
        alvo = b;
        casouPor = "telefone";
        if (email) avisos.email = email;
        email = null;
      }
    } else if (a) {
      alvo = a;
      casouPor = "email";
    } else if (b) {
      alvo = b;
      casouPor = "telefone";
    }
  }
  // O e-mail ou o telefone que já é de OUTRO contato não pode ser gravado (N8).
  if (alvo && email && ctx.porEmail && ctx.porEmail.id !== alvo.id) {
    avisos.email = email;
    email = null;
  }
  if (alvo && telefone && ctx.porTelefone && ctx.porTelefone.id !== alvo.id) {
    avisos.telefone = telefone;
    telefone = null;
  }

  const empresaDaLinha: PlanoDaEmpresa | null =
    l.empresa || l.cnpj || Object.keys(l.camposDaEmpresa).length > 0
      ? { nome: l.empresa, cnpj: l.cnpj, campos: l.camposDaEmpresa }
      : null;

  let planoDoContato: PlanoDoContato;
  let empresa = empresaDaLinha;
  if (!alvo || !casouPor) {
    planoDoContato = {
      tipo: "criar",
      dados: {
        nome: l.nome,
        email,
        telefone,
        instagram: l.instagram,
        nascimento: l.nascimento,
        cpf: l.cpf,
        campos: l.campos,
        tags: somarTags(l.tags, ctx.tagsDaImportacao),
      },
    };
  } else {
    detalhe.casouPor = casouPor;
    detalhe.contato = resumo(alvo, casouPor, ctx);
    let mudancas: MudancasDoContato = {};
    const preenchimentos: Array<{ campo: string; valor: unknown }> = [];
    const diferencas: Diferenca[] = [];
    const comparar = (campo: string, atual: unknown, doArquivo: unknown) => {
      if (vazio(doArquivo)) return;
      if (vazio(atual)) preenchimentos.push({ campo, valor: doArquivo });
      else if (!igual(atual, doArquivo)) diferencas.push({ campo, valorAtual: atual, valorDoArquivo: doArquivo });
    };

    // ── B/D: telefone ──
    if (telefone) {
      if (!alvo.telefone) preenchimentos.push({ campo: "telefone", valor: telefone });
      else if (!samePhone(telefone, alvo.telefone)) {
        detalhe.telefoneAtual = alvo.telefone;
        detalhe.telefoneDoArquivo = telefone;
        const m: Motivo = ctx.whatsappAtivo(alvo.id) ? "PHONE_HAS_ACTIVE_WHATSAPP" : "MATCH_PHONE_DIFFERS";
        const r = escolha(m);
        const fim = parar(m, r);
        if (fim) return fim;
        if (r.acao === "OVERWRITE") mudancas = aplicar(mudancas, "telefone", telefone);
        else if (m === "PHONE_HAS_ACTIVE_WHATSAPP") avisos.telefone = telefone;
      }
    }
    // ── B: Instagram ──
    if (l.instagram) {
      if (!alvo.instagram) preenchimentos.push({ campo: "instagram", valor: l.instagram });
      else if (!igual(alvo.instagram, l.instagram)) {
        detalhe.instagramAtual = alvo.instagram;
        detalhe.instagramDoArquivo = l.instagram;
        const r = escolha("MATCH_INSTAGRAM_DIFFERS");
        const fim = parar("MATCH_INSTAGRAM_DIFFERS", r);
        if (fim) return fim;
        if (r.acao === "OVERWRITE") mudancas = aplicar(mudancas, "instagram", l.instagram);
      }
    }
    // ── B: os outros campos ──
    comparar("nome", alvo.nome, l.nome);
    if (email && casouPor !== "email") comparar("email", alvo.email, email);
    comparar("nascimento", alvo.nascimento, l.nascimento);
    if (l.empresa) comparar("empresa", alvo.empresa?.nome ?? null, l.empresa);
    for (const [chave, valor] of Object.entries(l.campos)) comparar(`campo:${chave}`, alvo.campos[chave], valor);

    if (diferencas.length > 0) {
      const [primeira, ...outras] = diferencas as [Diferenca, ...Diferenca[]];
      detalhe.campo = primeira.campo;
      detalhe.valorAtual = primeira.valorAtual;
      detalhe.valorDoArquivo = primeira.valorDoArquivo;
      detalhe.outrasDiferencas = outras;
      const r = escolha("MATCH_OVERWRITE_FILLED_FIELD");
      const fim = parar("MATCH_OVERWRITE_FILLED_FIELD", r);
      if (fim) return fim;
      const trocar = r.acao === "OVERWRITE" ? diferencas.map((d) => d.campo) : (r.dados?.sobrescrever ?? []);
      for (const d of diferencas) if (trocar.includes(d.campo)) mudancas = aplicar(mudancas, d.campo, d.valorDoArquivo);
    }

    detalhe.preenchimentos = preenchimentos;
    const r = escolha("MATCH_FILL_EMPTY_FIELDS");
    const fim = parar("MATCH_FILL_EMPTY_FIELDS", r);
    if (fim) return fim;
    for (const p of preenchimentos) mudancas = aplicar(mudancas, p.campo, p.valor);
    const tags = somarTags(alvo.tags, l.tags, ctx.tagsDaImportacao);
    if (tags.length !== alvo.tags.length) mudancas = { ...mudancas, tags };
    planoDoContato = { tipo: "atualizar", id: alvo.id, mudancas };

    // Empresa diferente mantida: os campos vão para a empresa atual (N9).
    if (empresa && alvo.empresa && l.empresa && !igual(alvo.empresa.nome ?? "", l.empresa) && !mudancas.empresa) {
      empresa = { nome: null, cnpj: null, campos: l.camposDaEmpresa };
    }
  }

  // ── E: negócios ──
  let negocio: PlanoDoNegocio | null = null;
  const n = l.negocio;
  const cn = ctx.negocio;
  if (ctx.tipo === "negocio" && n && cn) {
    const contatoId = alvo?.id ?? null;
    let existente = n.id ? cn.porId : null;
    if (n.id && !existente) {
      detalhe.negocioIdDoArquivo = n.id;
      const fim = parar("DEAL_ID_NOT_FOUND", escolha("DEAL_ID_NOT_FOUND"));
      if (fim) return fim;
    }

    let origemId = cn.padrao.origemId;
    if (n.origem) {
      const achada = cn.origemPorNome(n.origem);
      if (achada) origemId = achada;
      else {
        detalhe.origemDoArquivo = n.origem;
        const r = escolha("ORIGIN_NAME_NOT_FOUND");
        const fim = parar("ORIGIN_NAME_NOT_FOUND", r);
        if (fim) return fim;
        if (r.acao === "PICK_MANUALLY" && r.dados?.origemId) origemId = r.dados.origemId;
      }
    }

    let etapaId = origemId === cn.padrao.origemId ? cn.padrao.etapaId : cn.primeiraEtapa(origemId);
    if (n.etapa) {
      const achada = cn.etapaPorNome(origemId, n.etapa);
      if (achada) etapaId = achada;
      else {
        detalhe.etapaDoArquivo = n.etapa;
        detalhe.origemId = origemId;
        const r = escolha("STAGE_NAME_NOT_FOUND");
        const fim = parar("STAGE_NAME_NOT_FOUND", r);
        if (fim) return fim;
        etapaId = r.acao === "PICK_MANUALLY" && r.dados?.etapaId ? r.dados.etapaId : cn.primeiraEtapa(origemId);
      }
    }

    let valorCentavos = n.valorCentavos;
    if (n.valorInvalido) {
      detalhe.valorInvalido = n.valorInvalido;
      const r = escolha("DEAL_VALUE_INVALID");
      const fim = parar("DEAL_VALUE_INVALID", r);
      if (fim) return fim;
      valorCentavos = r.acao === "CREATE_WITH_PARSED_VALUE" ? interpretarValor(n.valorInvalido) : null;
    }

    if (!existente && !n.id && contatoId) {
      const aberto = cn.abertoNaOrigem(contatoId, origemId);
      if (aberto) {
        detalhe.negocioAtual = aberto.titulo;
        const r = escolha("DEAL_DUPLICATE_OPEN");
        const fim = parar("DEAL_DUPLICATE_OPEN", r);
        if (fim) return fim;
        if (r.acao === "UPDATE_EXISTING") existente = aberto;
      }
    }

    const donoId = n.dono ? cn.donoPorTexto(n.dono) : null;
    if (n.dono && !donoId) avisos.dono = n.dono;

    if (existente) {
      negocio = { tipo: "atualizar", id: existente.id, titulo: n.titulo, valorCentavos, donoId, campos: n.campos };
    } else {
      if (!etapaId) return pular("STAGE_NAME_NOT_FOUND");
      const status = n.status ?? cn.padrao.status;
      negocio = {
        tipo: "criar",
        origemId,
        etapaId,
        titulo: n.titulo ?? l.nome ?? alvo?.nome ?? null,
        valorCentavos,
        donoId,
        campos: n.campos,
        status,
        motivoDePerda: status === "lost" ? (cn.padrao.motivoDePerda ?? MOTIVO_PADRAO_DE_PERDA) : null,
        ganhoEm: status === "won" ? n.ganhoEm : null,
      };
    }
  }

  return { tipo: "importar", plano: { contato: planoDoContato, empresa, negocio }, detalhe };
}
