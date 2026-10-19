import { z } from "zod";

/**
 * AS RESPOSTAS RÁPIDAS DA CASCA (fork Escale, Fase 3C; E6, C6; c41, c96).
 * Sobre os `message_templates` do original: atalho = `shortcut` (e `title`),
 * conteúdo = `body`, compartilhada = `owner_user_id` nulo. Canais e setores
 * vêm das tabelas do fork (9203).
 */
export const CANAIS_DA_RESPOSTA = ["whatsapp", "instagram"] as const;
export type CanalDaResposta = (typeof CANAIS_DA_RESPOSTA)[number];
export const FILTRO_TODOS = "todos";
export const FILTRO_PESSOAIS = "pessoais";

export const respostaSchema = z
  .object({
    atalho: z.string().trim().min(1).max(60),
    corpo: z.string().trim().min(1).max(4096),
    canais: z.array(z.enum(CANAIS_DA_RESPOSTA)).min(1),
    compartilhar: z.boolean(),
    todos_os_setores: z.boolean(),
    setores: z.array(z.string().uuid()).max(100),
  })
  .refine((r) => r.todos_os_setores || r.setores.length > 0, { path: ["setores"] });
export type NovaResposta = z.infer<typeof respostaSchema>;

export interface RespostaLida {
  id: string;
  atalho: string;
  corpo: string;
  canais: CanalDaResposta[];
  compartilhada: boolean;
  todos_os_setores: boolean;
  setores: string[];
  dono: string | null;
  criada_por: string | null;
  atualizada_em: string;
}

export const comBarra = (atalho: string): string => `/${atalho.replace(/^\/+/, "")}`;

export function canalDaConversa(
  canal: { provider?: string | null; social_platform?: string | null } | null,
): CanalDaResposta {
  return canal?.social_platform === "instagram" || canal?.provider === "zernio_social"
    ? "instagram"
    : "whatsapp";
}

/**
 * A resposta aparece no compositor? (N14) Pelo canal sempre; pelo setor: a do
 * setor escolhido no filtro (quem pode consultar outros setores) ou, sem
 * escolha, a do setor da conversa; "todos os setores" sempre.
 */
export function respostaServe(
  r: Pick<RespostaLida, "canais" | "todos_os_setores" | "setores">,
  ctx: { canal: CanalDaResposta; setorDaConversa: string | null; setorEscolhido: string | null },
): boolean {
  if (!r.canais.includes(ctx.canal)) return false;
  if (r.todos_os_setores) return true;
  const setor = ctx.setorEscolhido ?? ctx.setorDaConversa;
  return setor !== null && r.setores.includes(setor);
}
