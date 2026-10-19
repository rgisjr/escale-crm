import { z } from "zod";

type T = (texto: string) => string;

/**
 * "PERSONALIZAR VISUALIZAÇÃO" (fork Escale, Fase 3A; A8, 02-008, c44–c46).
 *
 * Os sete campos da linha da Clint, no máximo cinco ligados, com os limites
 * de alerta do tempo sem resposta. Preferência por pessoa (tabela
 * crm_preferencias_de_conversas, chave `visualizacao`).
 */
export const CAMPOS_DA_LINHA = [
  "atendente",
  "empresa",
  "setor",
  "tempoSemResposta",
  "mensagensAgendadas",
  "tags",
  "permissaoDeChamada",
] as const;
export type CampoDaLinha = (typeof CAMPOS_DA_LINHA)[number];

export const ROTULO_DO_CAMPO_DA_LINHA: Readonly<Record<CampoDaLinha, string>> = {
  atendente: "Atendente",
  empresa: "Empresa",
  setor: "Setor",
  tempoSemResposta: "Tempo sem resposta",
  mensagensAgendadas: "Mensagens agendadas",
  tags: "Tags",
  permissaoDeChamada: "Permissão de chamada",
};

export const CAMPOS_ATIVOS_MAX = 5;

export const UNIDADES_DE_TEMPO = ["minutos", "horas", "dias"] as const;
export type UnidadeDeTempo = (typeof UNIDADES_DE_TEMPO)[number];
export const ROTULO_DA_UNIDADE: Readonly<Record<UnidadeDeTempo, string>> = {
  minutos: "Minutos",
  horas: "Horas",
  dias: "Dias",
};

const MS: Record<UnidadeDeTempo, number> = {
  minutos: 60_000,
  horas: 3_600_000,
  dias: 86_400_000,
};

const limiteSchema = z
  .object({ valor: z.number().int().min(1).max(999), unidade: z.enum(UNIDADES_DE_TEMPO) })
  .strict();
export type Limite = z.infer<typeof limiteSchema>;

export const visualizacaoSchema = z
  .object({
    campos: z
      .object(
        Object.fromEntries(CAMPOS_DA_LINHA.map((c) => [c, z.boolean()])) as Record<
          CampoDaLinha,
          z.ZodBoolean
        >,
      )
      .strict()
      .refine((c) => Object.values(c).filter(Boolean).length <= CAMPOS_ATIVOS_MAX, {
        message: `no máximo ${CAMPOS_ATIVOS_MAX} campos ativos`,
      }),
    limites: z.object({ amarelo: limiteSchema, vermelho: limiteSchema }).strict(),
  })
  .strict();
export type Visualizacao = z.infer<typeof visualizacaoSchema>;

export const VISUALIZACAO_PADRAO: Visualizacao = {
  campos: {
    atendente: true,
    empresa: false,
    setor: false,
    tempoSemResposta: false,
    mensagensAgendadas: false,
    tags: false,
    permissaoDeChamada: true,
  },
  limites: { amarelo: { valor: 1, unidade: "horas" }, vermelho: { valor: 4, unidade: "horas" } },
};

/** Guardado fora da forma vale o padrão (a mesma tolerância da 9005). */
export function lerVisualizacao(bruto: unknown): Visualizacao {
  const lido = visualizacaoSchema.safeParse(bruto);
  return lido.success ? lido.data : VISUALIZACAO_PADRAO;
}

export const camposAtivos = (v: Visualizacao): number =>
  CAMPOS_DA_LINHA.filter((c) => v.campos[c]).length;

/** No limite, só quem já está ligado pode mexer (c45: os desligados ficam cinza). */
export const podeLigar = (v: Visualizacao, campo: CampoDaLinha): boolean =>
  v.campos[campo] || camposAtivos(v) < CAMPOS_ATIVOS_MAX;

export const ehVisualizacaoPadrao = (v: Visualizacao): boolean =>
  JSON.stringify(v) === JSON.stringify(VISUALIZACAO_PADRAO);

export const limiteEmMs = (l: Limite): number => l.valor * MS[l.unidade];

export type CorDaEspera = "cinza" | "amarelo" | "vermelho";

export function corDaEspera(ms: number, v: Visualizacao): CorDaEspera {
  if (ms >= limiteEmMs(v.limites.vermelho)) return "vermelho";
  if (ms >= limiteEmMs(v.limites.amarelo)) return "amarelo";
  return "cinza";
}

/** "agora", "3 min", "3h", "8d" — os `component.ChatItem.waiting*` da Clint. */
export function textoDaEspera(ms: number, t: T): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return t("agora");
  if (min < 60) return `${min} ${t("min")}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
