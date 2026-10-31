/**
 * Botões e lista do WhatsApp. A mensagem é gravada como TEXTO numerado (o que a equipe vê e o que sai em
 * canal sem interativo) com `metadata.interativo`; só o adaptador da API oficial monta o `interactive`.
 * O toque volta como texto com o rótulo (`textoDoClique`, `lib/channels/meta/webhook.ts`).
 */
import { z } from "zod";

const ID = z.string().min(1).max(200);

export const interativoSchema = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("botoes"),
    corpo: z.string().min(1).max(1024),
    botoes: z.array(z.strictObject({ id: ID, titulo: z.string().min(1).max(20) })).min(1).max(3),
  }),
  z.strictObject({
    tipo: z.literal("lista"),
    corpo: z.string().min(1).max(1024),
    botaoDaLista: z.string().min(1).max(20),
    linhas: z
      .array(z.strictObject({ id: ID, titulo: z.string().min(1).max(24), descricao: z.string().max(72).optional() }))
      .min(1)
      .max(10),
  }),
]);

export type Interativo = z.infer<typeof interativoSchema>;

export function montarInterativo(i: Interativo): Record<string, unknown> {
  if (i.tipo === "botoes") {
    return {
      type: "button",
      body: { text: i.corpo },
      action: { buttons: i.botoes.map((b) => ({ type: "reply", reply: { id: b.id, title: b.titulo } })) },
    };
  }
  return {
    type: "list",
    body: { text: i.corpo },
    action: {
      button: i.botaoDaLista,
      sections: [
        {
          title: "Opções",
          rows: i.linhas.map((l) => ({ id: l.id, title: l.titulo, ...(l.descricao ? { description: l.descricao } : {}) })),
        },
      ],
    },
  };
}

export function textoNumeradoDeReserva(i: Interativo): string {
  const itens = i.tipo === "botoes" ? i.botoes.map((b) => b.titulo) : i.linhas.map((l) => l.titulo);
  return `${i.corpo}\n\n${itens.map((t, n) => `${n + 1} - ${t}`).join("\n")}`;
}

export function interativoDaMensagem(metadata: unknown): Interativo | null {
  if (!metadata || typeof metadata !== "object") return null;
  const r = interativoSchema.safeParse((metadata as { interativo?: unknown }).interativo);
  return r.success ? r.data : null;
}
