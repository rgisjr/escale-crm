/**
 * PASSOS DE ENVIO: uma sequência curta (até 8) de texto, mídia e — na Tarefa 7 — botões/lista, enviada
 * na ordem pela regra (`send_whatsapp_message.passos`) e pelo nó de ação do fluxo (`mode: "steps"`).
 *
 * Pausa curta (1 a 10 s, até 10 s no total) entre mensagens: é o "delay" da Clint dentro do nó de
 * mensagem (decisão do usuário, 03/11/2026). Intervalo maior é um nó `wait` do fluxo. A pausa não
 * envia nada e não muda as chaves de idempotência dos outros passos (o índice é o da lista inteira).
 *
 * `asset: "var:<chave>"` é o que faz UM fluxo servir N números com áudios diferentes: a chave é lida
 * das variáveis de ativo do número da conversa (`lerAtivosDoCanal`). Tudo é resolvido ANTES do primeiro
 * envio: faltando o áudio de um número, nada sai pela metade.
 */
import { z } from "zod";

import { interativoSchema, type Interativo } from "@/lib/channels/interativo";

export const REFERENCIA_DE_ATIVO = /^([0-9a-f-]{36}|var:[a-z][a-z0-9_]{0,39})$/;

export const passoTextoSchema = z.strictObject({
  tipo: z.literal("texto"),
  texto: z.string().trim().min(1).max(4000),
});

export const passoMidiaSchema = z.strictObject({
  tipo: z.literal("midia"),
  asset: z.string().regex(REFERENCIA_DE_ATIVO),
  legenda: z.string().max(1024).optional(),
});

/** Botões ou lista do WhatsApp; fora da API oficial sai como texto numerado. */
export const passoInterativoSchema = z.strictObject({
  tipo: z.literal("interativo"),
  interativo: interativoSchema,
});

export const PAUSA_MAXIMA_TOTAL_S = 10;
export const RECUSA_PAUSA_NO_COMECO = "O primeiro item da lista não pode ser um atraso.";
export const RECUSA_PAUSA_SEGUIDA = "Não é possível adicionar mais delay entre as mensagens.";

export const passoPausaSchema = z.strictObject({
  tipo: z.literal("pausa"),
  segundos: z.number().int().min(1).max(10),
});

export const passosSchema = z
  .array(z.discriminatedUnion("tipo", [passoTextoSchema, passoMidiaSchema, passoInterativoSchema, passoPausaSchema]))
  .min(1)
  .max(8)
  .superRefine((passos, ctx) => {
    passos.forEach((passo, indice) => {
      if (passo.tipo !== "pausa") return;
      if (indice === 0 || indice === passos.length - 1) {
        ctx.addIssue({ code: "custom", path: [indice], message: RECUSA_PAUSA_NO_COMECO });
      } else if (passos[indice - 1]?.tipo === "pausa") {
        ctx.addIssue({ code: "custom", path: [indice], message: RECUSA_PAUSA_SEGUIDA });
      }
    });
    const total = passos.reduce((soma, passo) => (passo.tipo === "pausa" ? soma + passo.segundos : soma), 0);
    if (total > PAUSA_MAXIMA_TOTAL_S) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: `As pausas somam no máximo ${PAUSA_MAXIMA_TOTAL_S} segundos.`,
      });
    }
  });

export type PassoDeEnvio = z.infer<typeof passosSchema>[number];

export interface EnviadorDePassos {
  texto(corpo: string, chave: string): Promise<void>;
  midia(m: { assetId: string; legenda?: string }, chave: string): Promise<void>;
  interativo(i: Interativo, chave: string): Promise<void>;
}

export type ResultadoDosPassos = { ok: true; enviados: number } | { ok: false; enviados: number; erro: string };

export function resolverReferenciaDeAtivo(ref: string, ativosDoCanal: Record<string, string>): string | null {
  if (!ref.startsWith("var:")) return ref;
  const chave = ref.slice(4);
  return Object.hasOwn(ativosDoCanal, chave) ? (ativosDoCanal[chave] ?? null) : null;
}

type PassoPronto =
  | { tipo: "texto"; corpo: string; indice: number }
  | { tipo: "midia"; assetId: string; legenda?: string; indice: number }
  | { tipo: "interativo"; interativo: Interativo; indice: number }
  | { tipo: "pausa"; ms: number; indice: number };

/** Renderiza o corpo e os títulos (o `{{canal.*}}` vale em todos). */
function renderizarInterativo(i: Interativo, renderizar: (texto: string) => string): Interativo {
  const corpo = renderizar(i.corpo).trim();
  if (i.tipo === "botoes") {
    return { ...i, corpo, botoes: i.botoes.map((b) => ({ ...b, titulo: renderizar(b.titulo).trim() })) };
  }
  return {
    ...i,
    corpo,
    linhas: i.linhas.map((l) => ({ ...l, titulo: renderizar(l.titulo).trim() })),
  };
}

function preparar(
  passos: readonly PassoDeEnvio[],
  ativosDoCanal: Record<string, string>,
  renderizar: (texto: string) => string,
): PassoPronto[] | { erro: string } {
  const prontos: PassoPronto[] = [];
  for (const [i, p] of passos.entries()) {
    if (p.tipo === "pausa") {
      prontos.push({ tipo: "pausa", ms: p.segundos * 1000, indice: i });
      continue;
    }
    if (p.tipo === "texto") {
      const corpo = renderizar(p.texto).trim();
      if (corpo === "") return { erro: `texto_vazio:${i}` };
      prontos.push({ tipo: "texto", corpo, indice: i });
      continue;
    }
    if (p.tipo === "interativo") {
      const interativo = renderizarInterativo(p.interativo, renderizar);
      if (interativo.corpo === "") return { erro: `texto_vazio:${i}` };
      prontos.push({ tipo: "interativo", interativo, indice: i });
      continue;
    }
    const assetId = resolverReferenciaDeAtivo(p.asset, ativosDoCanal);
    if (assetId === null) return { erro: `ativo_ausente_no_numero:${p.asset.slice(4)}` };
    const legenda = p.legenda === undefined ? undefined : renderizar(p.legenda).trim() || undefined;
    prontos.push({ tipo: "midia", assetId, ...(legenda ? { legenda } : {}), indice: i });
  }
  return prontos;
}

export async function enviarPassos(
  passos: readonly PassoDeEnvio[],
  deps: {
    enviador: EnviadorDePassos;
    ativosDoCanal: Record<string, string>;
    renderizar: (texto: string) => string;
    chaveBase: string;
    esperar?: (ms: number) => Promise<void>;
  },
): Promise<ResultadoDosPassos> {
  const prontos = preparar(passos, deps.ativosDoCanal, deps.renderizar);
  if (!Array.isArray(prontos)) return { ok: false, enviados: 0, erro: prontos.erro };
  const esperar = deps.esperar ?? ((ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms)));
  let enviados = 0;
  for (const p of prontos) {
    if (p.tipo === "pausa") {
      await esperar(p.ms);
      continue;
    }
    const chave = `${deps.chaveBase}:${p.indice}`;
    try {
      if (p.tipo === "texto") await deps.enviador.texto(p.corpo, chave);
      else if (p.tipo === "interativo") await deps.enviador.interativo(p.interativo, chave);
      else await deps.enviador.midia({ assetId: p.assetId, ...(p.legenda ? { legenda: p.legenda } : {}) }, chave);
      enviados += 1;
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      return { ok: false, enviados, erro: `passo_falhou:${p.indice}:${motivo}` };
    }
  }
  return { ok: true, enviados };
}
