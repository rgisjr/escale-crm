import { z } from "zod";

/** `settings.escale_campos_ocultos` da origem (e do grupo): os campos DESLIGADOS na Visualização de campos. */
export const CHAVE_DOS_OCULTOS = "escale_campos_ocultos";

const lista = z.array(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/)).max(200).catch([]);
export const camposOcultosSchema = z.object({
  usar_do_grupo: z.boolean().catch(false),
  contato: lista,
  negocio: lista,
  empresa: lista,
});
export type CamposOcultos = z.infer<typeof camposOcultosSchema>;
export const OCULTOS_VAZIOS: CamposOcultos = { usar_do_grupo: false, contato: [], negocio: [], empresa: [] };

export function lerOcultos(settings: unknown): CamposOcultos {
  const bruto = settings && typeof settings === "object" ? (settings as Record<string, unknown>)[CHAVE_DOS_OCULTOS] : null;
  if (!bruto || typeof bruto !== "object") return OCULTOS_VAZIOS;
  const r = camposOcultosSchema.safeParse(bruto);
  return r.success ? r.data : OCULTOS_VAZIOS;
}

export function ocultosEfetivos(daOrigem: CamposOcultos, doGrupo: CamposOcultos | null): CamposOcultos {
  if (daOrigem.usar_do_grupo && doGrupo) return { ...doGrupo, usar_do_grupo: true };
  return daOrigem;
}

const vazio = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** "Campos preenchidos … não serão ocultos": só o oculto sem valor some. */
export function esconderOcultos<T extends { chave: string; valor: unknown }>(campos: T[], ocultas: readonly string[]): T[] {
  if (!ocultas.length) return campos;
  const set = new Set(ocultas);
  return campos.filter((c) => !(set.has(c.chave) && vazio(c.valor)));
}
