/**
 * A ABA ATIVIDADES DA FICHA (fork Escale, Fase 1I; C19–C21): regras puras.
 * Sem React e sem rede.
 *
 * - A atividade do negócio é a tarefa do original (`crm_tasks`) mais a linha
 *   do fork (`crm_atividades_do_negocio`: tipo, visibilidade, etapa, atividade
 *   do playbook, quem concluiu). Tarefa sem a linha é "tarefa" padrão, sem etapa.
 * - A lista mostra a etapa VISTA (o trilho escolhe). Na etapa atual entram
 *   também as sem etapa e as de etapa que saiu do trilho, para nada sumir.
 * - Dias e grupos vão do mais cedo ao mais tarde (print 01: 15 Out, depois
 *   14 Out do ano seguinte).
 */
import type { ChannelSession } from "@/hooks/channels/useChannelSessions";
import { cabecalhoDoDia } from "@/lib/escale/negocio/regras";
import {
  prazoPorUnidade,
  type ModeloDaEtapa,
  type TipoDeAtividade,
  type VisibilidadeDaAtividade,
} from "@/lib/escale/playbook/regras";
import { valorParaLeitura } from "@/lib/escale/negocio/campos";
import { chaveDaVariavel, type DadosDasVariaveis } from "@/lib/escale/playbook/variaveis";
import type { CustomFieldDef } from "@/lib/schemas/settings";
import type { Stage } from "@/lib/kanban/types";
import { estaAtrasada, type Tarefa } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";

export interface ExtraDaAtividade {
  tarefa_id: string;
  stage_id: string | null;
  atividade_id: string | null;
  tipo: TipoDeAtividade;
  visibilidade: VisibilidadeDaAtividade;
  concluida_por: string | null;
  concluida_em: string | null;
}

export type AtividadeDoNegocio = Tarefa & Omit<ExtraDaAtividade, "tarefa_id">;

export interface AtividadesDoNegocio {
  atividades: AtividadeDoNegocio[];
  modelos: ModeloDaEtapa[];
}

export interface NovaAtividadeDoNegocio {
  titulo: string;
  tipo: TipoDeAtividade;
  due_date: string;
  stage_id: string;
}

export function juntarAtividades(
  tarefas: readonly Tarefa[],
  extras: readonly ExtraDaAtividade[],
): AtividadeDoNegocio[] {
  const porTarefa = new Map(extras.map((e) => [e.tarefa_id, e]));
  return tarefas.map((x) => {
    const e = porTarefa.get(x.id);
    return {
      ...x,
      tipo: e?.tipo ?? "tarefa",
      visibilidade: e?.visibilidade ?? "padrao",
      stage_id: e?.stage_id ?? null,
      atividade_id: e?.atividade_id ?? null,
      concluida_por: e?.concluida_por ?? null,
      concluida_em: e?.concluida_em ?? null,
    };
  });
}

export function etapasDoTrilho(stages: readonly Stage[]): Stage[] {
  return stages
    .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
    .sort((a, b) => a.position - b.position);
}

export function atividadesDaVista(
  lista: readonly AtividadeDoNegocio[],
  etapaVista: string,
  etapaAtual: string,
  doTrilho: ReadonlySet<string>,
): AtividadeDoNegocio[] {
  return lista.filter(
    (a) =>
      a.stage_id === etapaVista ||
      (etapaVista === etapaAtual && (a.stage_id === null || !doTrilho.has(a.stage_id))),
  );
}

const semPonto = (s: string) => s.replace(".", "");
/** A chave do dia local ("2026-10-15"): é a `chave` do `DiaDaColuna` e do `GrupoDaLista`. */
export const chaveDoDia = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const mesmoDia = (a: Date, b: Date) => chaveDoDia(a) === chaveDoDia(b);
const instante = (iso: string | null) => (iso ? Date.parse(iso) : Number.POSITIVE_INFINITY);

export interface DiaDaColuna {
  chave: string;
  dia: number;
  /** "QUI", ou "Hoje" no dia de hoje. */
  semana: string;
  /** "OUT" quando o mês muda em relação ao chip anterior; "OUT 27" se o ano não é o atual; null quando não muda. */
  mes: string | null;
  total: number;
  atrasadas: number;
}

export function diasDaColuna(
  lista: readonly AtividadeDoNegocio[],
  agora: Date,
  idioma: string,
  t: (s: string) => string,
): DiaDaColuna[] {
  const comData = lista
    .filter((a) => a.due_date)
    .sort((a, b) => instante(a.due_date) - instante(b.due_date));
  const dias: DiaDaColuna[] = [];
  let mesAnterior = "";
  for (const a of comData) {
    const d = new Date(a.due_date!);
    const chave = chaveDoDia(d);
    let dia = dias.find((x) => x.chave === chave);
    if (!dia) {
      const mesDoChip = `${d.getFullYear()}-${d.getMonth()}`;
      const nomeDoMes = semPonto(d.toLocaleDateString(idioma, { month: "short" })).toUpperCase();
      dia = {
        chave,
        dia: d.getDate(),
        semana: mesmoDia(d, agora)
          ? t("Hoje")
          : semPonto(d.toLocaleDateString(idioma, { weekday: "short" })).toUpperCase(),
        mes:
          mesDoChip === mesAnterior
            ? null
            : d.getFullYear() === agora.getFullYear()
              ? nomeDoMes
              : `${nomeDoMes} ${String(d.getFullYear()).slice(2)}`,
        total: 0,
        atrasadas: 0,
      };
      mesAnterior = mesDoChip;
      dias.push(dia);
    }
    dia.total += 1;
    if (estaAtrasada(a, agora)) dia.atrasadas += 1;
  }
  return dias;
}

export interface GrupoDaLista {
  chave: string;
  /** "Qui, 15 Out"; "Hoje, 15 Out"; null = sem prazo. */
  rotulo: string | null;
  itens: AtividadeDoNegocio[];
}

export function gruposDaLista(
  lista: readonly AtividadeDoNegocio[],
  agora: Date,
  idioma: string,
  t: (s: string) => string,
): GrupoDaLista[] {
  const ordenadas = [...lista].sort((a, b) => instante(a.due_date) - instante(b.due_date));
  const grupos = new Map<string, GrupoDaLista>();
  for (const a of ordenadas) {
    const d = a.due_date ? new Date(a.due_date) : null;
    const chave = d ? chaveDoDia(d) : "sem-prazo";
    const rotulo = !d
      ? null
      : mesmoDia(d, agora)
        ? `${t("Hoje")}, ${cabecalhoDoDia(a.due_date!, idioma).split(", ")[1]}`
        : cabecalhoDoDia(a.due_date!, idioma);
    const grupo = grupos.get(chave) ?? { chave, rotulo, itens: [] };
    grupos.set(chave, { ...grupo, itens: [...grupo.itens, a] });
  }
  return [...grupos.values()];
}

export interface GrupoDoPlaybook {
  chave: number;
  rotulo: string;
  modelos: ModeloDaEtapa[];
}

const ORDINAL: Record<string, string> = {
  minuto: "{n}º minuto",
  hora: "{n}ª hora",
  dia: "{n}º dia",
  semana: "{n}ª semana",
  mes: "{n}º mês",
  ano: "{n}º ano",
};

/** A etapa em que o negócio ainda não está: o playbook dela por prazo relativo ("Ao entrar na etapa", "1º dia"…). */
export function gruposDoPlaybook(
  modelos: readonly ModeloDaEtapa[],
  etapaId: string,
  t: (s: string) => string,
): GrupoDoPlaybook[] {
  const daEtapa = modelos
    .filter((m) => m.stage_id === etapaId)
    .sort(
      (a, b) =>
        a.prazo_minutos - b.prazo_minutos || a.ordem - b.ordem || a.titulo.localeCompare(b.titulo),
    );
  const grupos = new Map<number, GrupoDoPlaybook>();
  for (const m of daEtapa) {
    const p = prazoPorUnidade(m.prazo_minutos);
    const rotulo =
      m.prazo_minutos <= 0
        ? t("Ao entrar na etapa")
        : t(ORDINAL[p.unidade]!).replace("{n}", String(p.quantidade));
    const grupo = grupos.get(m.prazo_minutos) ?? { chave: m.prazo_minutos, rotulo, modelos: [] };
    grupos.set(m.prazo_minutos, { ...grupo, modelos: [...grupo.modelos, m] });
  }
  return [...grupos.values()];
}

/** A atividade do playbook não se exclui do negócio (Clint); a criada à mão, sim. */
export const podeExcluirAtividade = (a: Pick<AtividadeDoNegocio, "atividade_id">): boolean =>
  a.atividade_id === null;

export function valorDoNegocio(lead: Pick<Lead, "value_cents" | "currency">): string | null {
  if (lead.value_cents === null || lead.value_cents === undefined) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: lead.currency ?? "BRL" })
    .format(lead.value_cents / 100)
    .replace(/ /g, " ");
}

/**
 * Os dados que as variáveis da mensagem trocam. Os campos personalizados (P10)
 * saem em texto pela `valorParaLeitura` da 1H: `[DEAL.<CHAVE>]` com o valor do
 * negócio e `[CONTACT.<CHAVE>]` com o do contato (vazio quando não há).
 */
export function dadosDasVariaveis(
  lead: Pick<
    Lead,
    | "contact_id"
    | "value_cents"
    | "currency"
    | "contact_email"
    | "contact_phone"
    | "custom_fields"
    | "id"
    | "created_at"
    | "status"
  >,
  nomeDoContato: string | null,
  etapa: string | null,
  usuario: { nome: string | null; email: string | null },
  organizacao: string | null,
  personalizados: {
    defs: readonly CustomFieldDef[];
    contato: Readonly<Record<string, unknown>> | null;
    t: (s: string) => string;
  } | null = null,
): DadosDasVariaveis {
  const campos: Record<string, string> = {};
  for (const def of personalizados?.defs ?? []) {
    const chave = chaveDaVariavel(def.key);
    const texto = (bruto: unknown) =>
      valorParaLeitura(def.type, def.options, bruto, personalizados!.t) ?? "";
    campos[`[DEAL.${chave}]`] = texto(lead.custom_fields?.[def.key]);
    campos[`[CONTACT.${chave}]`] = texto(personalizados!.contato?.[def.key]);
  }
  return {
    campos,
    contato: {
      nome: lead.contact_id ? nomeDoContato : null,
      id: lead.contact_id ?? null,
      email: lead.contact_email ?? null,
      telefone: lead.contact_phone ?? null,
    },
    negocio: {
      etapa,
      valor: valorDoNegocio(lead),
      id: lead.id ?? null,
      criadoEm: lead.created_at ?? null,
      status: lead.status ?? null,
    },
    usuario,
    // Frente V: o nome da conta é `[USER.ORGANIZATION.NAME]`. `[ORGANIZATION.NAME]`
    // (a empresa DO CONTATO na Clint, D14) segue com o nome da conta só para as
    // atividades já salvas não ficarem vazias; o seletor não o oferece mais.
    empresa: { nome: organizacao },
    conta: { nome: organizacao },
  };
}

const digitos = (telefone: string) => telefone.replace(/\D/g, "");

export const linkDoWhatsappWeb = (telefone: string, texto: string) =>
  `https://web.whatsapp.com/send?phone=${digitos(telefone)}&text=${encodeURIComponent(texto)}`;

export const linkDoAppWhatsapp = (telefone: string, texto: string) =>
  `whatsapp://send?phone=${digitos(telefone)}&text=${encodeURIComponent(texto)}`;

export type EstadoDoDispositivo =
  { tipo: "conectado"; sessaoId: string } | { tipo: "desconectado" } | { tipo: "nenhum" };

/**
 * O canal que vai enviar: o primeiro `WORKING` por data de criação, fora os
 * pausados (`metadata.disabled`) — a mesma escolha de `sessaoProntaParaEnvio`
 * no `open-with-contact`. Sem canal: "nenhum"; com canal parado: "desconectado".
 */
export function dispositivoDeEnvio(
  sessoes: readonly Pick<ChannelSession, "id" | "status" | "created_at" | "metadata">[],
): EstadoDoDispositivo {
  const ativas = sessoes
    .filter((s) => s.metadata?.disabled !== true)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  if (ativas.length === 0) return { tipo: "nenhum" };
  const pronta = ativas.find((s) => s.status === "WORKING");
  return pronta ? { tipo: "conectado", sessaoId: pronta.id } : { tipo: "desconectado" };
}

/** "0930" → "09:30" enquanto digita; só dígitos, no máximo 4. */
export function mascararHora(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function horaValida(texto: string): { h: number; m: number } | null {
  const r = /^(\d{2}):(\d{2})$/.exec(texto);
  if (!r) return null;
  const h = Number(r[1]);
  const m = Number(r[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

/** Antes de agora, com 1 minuto de folga (a data padrão da janela é "agora"). */
export const dataNoPassado = (quando: Date, agora: Date = new Date()): boolean =>
  quando.getTime() < agora.getTime() - 60_000;
