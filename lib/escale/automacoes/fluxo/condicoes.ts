/**
 * FORK ESCALE · automações: as peças puras do seletor de condição da Clint (busca + categorias) e do
 * editor de "Horário atual". Sem React: a tela usa, os testes batem sem renderizar.
 *
 * Categorias (decisão do plano 2026-11-03): "Contato" = campos `contact.*` do gatilho, "Negócio" =
 * `lead.*`, "Campos" = os demais (`event.*`) e o campo personalizado (a linha em modo avançado),
 * "Horário atual" = Hora, Data e "Horário de atendimento" (Em breve: depende da tela Configurações ›
 * Horários de atendimento, que é outra frente).
 */
import type { CuratedField } from "@/app/app/webhooks/_components/RuleEditor";
import {
  CAMPO_DATA,
  CAMPO_HORA,
  ehOperadorDeHorario,
  lerValorDaData,
  lerValorDaHora,
  type CampoDeHorario,
  type OperadorDeHorario,
} from "@/lib/automation/condicoes-de-horario";

export type CategoriaDaCondicao = "campos" | "contato" | "negocio" | "horario";

export type ItemDaCondicao =
  | { tipo: "campo"; campo: CuratedField }
  | { tipo: "avancado"; rotulo: string }
  | { tipo: "horario"; campo: CampoDeHorario; rotulo: string }
  | { tipo: "em_breve"; rotulo: string };

export const ORDEM_DAS_CATEGORIAS: readonly CategoriaDaCondicao[] = ["campos", "contato", "negocio", "horario"];

export const ROTULO_DA_CATEGORIA: Record<CategoriaDaCondicao, string> = {
  campos: "Campos",
  contato: "Contato",
  negocio: "Negócio",
  horario: "Horário atual",
};

const ITENS_DO_HORARIO: readonly ItemDaCondicao[] = [
  { tipo: "horario", campo: CAMPO_HORA, rotulo: "Hora" },
  { tipo: "horario", campo: CAMPO_DATA, rotulo: "Data" },
  { tipo: "em_breve", rotulo: "Horário de atendimento" },
];

export function itensDaCategoria(categoria: CategoriaDaCondicao, campos: readonly CuratedField[]): ItemDaCondicao[] {
  if (categoria === "horario") return [...ITENS_DO_HORARIO];
  if (categoria === "contato") return campos.filter((c) => c.value.startsWith("contact.")).map((campo) => ({ tipo: "campo", campo }));
  if (categoria === "negocio") return campos.filter((c) => c.value.startsWith("lead.")).map((campo) => ({ tipo: "campo", campo }));
  return [
    ...campos
      .filter((c) => !c.value.startsWith("contact.") && !c.value.startsWith("lead."))
      .map((campo): ItemDaCondicao => ({ tipo: "campo", campo })),
    { tipo: "avancado", rotulo: "Campo personalizado" },
  ];
}

export function rotuloDoItem(item: ItemDaCondicao): string {
  return item.tipo === "campo" ? item.campo.label : item.rotulo;
}

/** Sem caixa e sem acento: "hora" acha "Horário de atendimento". */
const semAcento = (texto: string): string => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A busca da Clint: todos os itens de todas as categorias cujo rótulo traduzido contém o texto. */
export function buscarItens(busca: string, campos: readonly CuratedField[], traduzir: (s: string) => string): ItemDaCondicao[] {
  const alvo = semAcento(busca.trim());
  return ORDEM_DAS_CATEGORIAS.flatMap((c) => itensDaCategoria(c, campos)).filter((item) =>
    semAcento(traduzir(rotuloDoItem(item))).includes(alvo),
  );
}

/** "0830" → "08:30": só dígitos, até 4, com os dois-pontos no lugar. */
export function mascaraDeHora(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** "031120261400" → "03/11/2026 14:00". */
export function mascaraDeDataEHora(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 12);
  let saida = d.slice(0, 2);
  if (d.length > 2) saida += `/${d.slice(2, 4)}`;
  if (d.length > 4) saida += `/${d.slice(4, 8)}`;
  if (d.length > 8) saida += ` ${d.slice(8, 10)}`;
  if (d.length > 10) saida += `:${d.slice(10, 12)}`;
  return saida;
}

/** "03/11/2026 14:00" → "2026-11-03T14:00"; incompleto ou data que não existe → null. */
export function paredeDoTexto(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const parede = `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`;
  return lerValorDaData("depois_de", JSON.stringify({ de: parede })) ? parede : null;
}

/** "2026-11-03T14:00" → "03/11/2026 14:00". */
export function textoDaParede(parede: string): string {
  const [data = "", hora = ""] = parede.split("T");
  const [ano = "", mes = "", dia = ""] = data.split("-");
  return `${dia}/${mes}/${ano} ${hora}`;
}

/** 0 = domingo … 6 = sábado, as siglas da Clint no nó. */
export const SIGLA_DO_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
export const NOME_DO_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
/** A ordem da lista: segunda primeiro, domingo no fim. */
export const DIAS_NA_ORDEM = [1, 2, 3, 4, 5, 6, 0] as const;

export const FRASE_DO_OPERADOR: Record<OperadorDeHorario, string> = {
  depois_de: "é depois de",
  antes_de: "é antes de",
  entre: "está entre",
};

export type ResumoDoHorario = { frase: string; de: string; ate: string | null; dias: number[] };

export function resumoDoHorario(linha: { field: string; op: string; value: string }): ResumoDoHorario | null {
  if (!ehOperadorDeHorario(linha.op)) return null;
  const frase = FRASE_DO_OPERADOR[linha.op];
  if (linha.field === CAMPO_HORA) {
    const v = lerValorDaHora(linha.op, linha.value);
    return v ? { frase, de: v.de, ate: v.ate ?? null, dias: DIAS_NA_ORDEM.filter((d) => v.dias.includes(d)) } : null;
  }
  if (linha.field === CAMPO_DATA) {
    const v = lerValorDaData(linha.op, linha.value);
    return v ? { frase, de: textoDaParede(v.de), ate: v.ate ? textoDaParede(v.ate) : null, dias: [] } : null;
  }
  return null;
}

/** "08:00 até 18:00 · seg, ter" (Hora) ou "03/11/2026 14:00" (Data). */
export function textoDoResumoDoHorario(campo: string, resumo: ResumoDoHorario, t: (s: string) => string): string {
  const intervalo = resumo.ate ? `${resumo.de} ${t("até")} ${resumo.ate}` : resumo.de;
  if (campo !== CAMPO_HORA) return intervalo;
  const todos = resumo.dias.length === 0 || resumo.dias.length === 7;
  const dias = todos ? t("todos os dias") : resumo.dias.map((d) => t(SIGLA_DO_DIA[d] ?? "")).join(", ");
  return `${intervalo} · ${dias}`;
}

/** O `value` gravado a partir do que está no editor; o que ainda não fecha devolve null (Confirmar desligado). */
export function montarValorDoHorario(
  campo: CampoDeHorario,
  op: OperadorDeHorario,
  de: string,
  ate: string,
  dias: readonly string[],
): string | null {
  const entre = op === "entre";
  if (campo === CAMPO_HORA) {
    const valor = JSON.stringify({ de, ...(entre ? { ate } : {}), dias: dias.map(Number).sort((a, b) => a - b) });
    return lerValorDaHora(op, valor) ? valor : null;
  }
  const deNaParede = paredeDoTexto(de);
  const ateNaParede = entre ? paredeDoTexto(ate) : null;
  if (!deNaParede || (entre && !ateNaParede)) return null;
  const valor = JSON.stringify({ de: deNaParede, ...(entre ? { ate: ateNaParede } : {}) });
  return lerValorDaData(op, valor) ? valor : null;
}

export type EstadoDoEditorDeHorario = { op: OperadorDeHorario; de: string; ate: string; dias: string[] };

/** O que o editor mostra ao abrir: a condição gravada, ou "Depois de" vazio. */
export function estadoDoEditorDeHorario(
  campo: CampoDeHorario,
  inicial?: { op: string; value: string },
): EstadoDoEditorDeHorario {
  const vazio: EstadoDoEditorDeHorario = { op: "depois_de", de: "", ate: "", dias: [] };
  if (!inicial || !ehOperadorDeHorario(inicial.op)) return vazio;
  if (campo === CAMPO_HORA) {
    const v = lerValorDaHora(inicial.op, inicial.value);
    return v ? { op: inicial.op, de: v.de, ate: v.ate ?? "", dias: v.dias.map(String) } : vazio;
  }
  const v = lerValorDaData(inicial.op, inicial.value);
  return v ? { op: inicial.op, de: textoDaParede(v.de), ate: v.ate ? textoDaParede(v.ate) : "", dias: [] } : vazio;
}
