/**
 * A GRAVAÇÃO DAS CONFIGURAÇÕES DA ORIGEM (Fase 1F): o corpo do PATCH e o
 * `settings` que sai dele. As seções que mudaram vêm juntas (o "Salvar" único
 * da Clint) e saem num `update` só. Só as chaves delas mudam; o resto do
 * `settings` passa intacto. Chave sem valor some.
 */
import { z } from "zod";

import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { MOEDAS_SERVIDAS } from "@/lib/money";

import { alertaDeTempoSchema, gravarAlerta } from "./alerta";
import { MAX_REGRAS, gravarRegrasDosCampos, regraDeCampoSchema } from "./campos";
import { gravarMotivos } from "./motivos";
import {
  CHAVE_DA_MOEDA,
  CHAVE_DAS_TAGS,
  CHAVE_DO_ALERTA,
  CHAVE_DO_AO_SAIR,
  CHAVE_DOS_INATIVOS,
  TAG_DO_SISTEMA,
  TAGS_PADRAO_MAX,
  comoRecord,
  normalizarTagsPadrao,
} from "./tipos";

export const patchDasConfiguracoesSchema = z
  .object({
    gerais: z
      .object({
        moeda: z.enum(MOEDAS_SERVIDAS).nullable(),
        tags_padrao: z.array(z.string().max(80)).max(20),
      })
      .strict()
      .optional(),
    motivos: z
      .object({
        selecionados: z.array(z.string().min(1).max(80)).max(200),
        novos: z.array(z.string().max(80)).max(50),
      })
      .strict()
      .optional(),
    campos: z
      .object({ regras: z.array(regraDeCampoSchema).max(MAX_REGRAS + 1) })
      .strict()
      .optional(),
    alerta: alertaDeTempoSchema.optional(),
  })
  .strict()
  .refine((p) => Object.values(p).some((v) => v !== undefined), { message: "nada para salvar" });
export type PatchDasConfiguracoes = z.infer<typeof patchDasConfiguracoesSchema>;
export type SecaoDasConfiguracoes = "gerais" | "motivos" | "campos" | "alerta";

export const SECOES_DO_ADMINISTRADOR: readonly SecaoDasConfiguracoes[] = ["motivos", "campos"];

export function secoesDoPatch(patch: PatchDasConfiguracoes): SecaoDasConfiguracoes[] {
  return (["gerais", "motivos", "campos", "alerta"] as const).filter((s) => patch[s] !== undefined);
}

export type VereditoDaGravacao =
  { ok: true; settings: Record<string, unknown> } | { ok: false; erro: string };

function comChave(
  settings: Record<string, unknown>,
  chave: string,
  valor: unknown,
): Record<string, unknown> {
  const proximo = { ...settings };
  if (valor === null || valor === undefined) delete proximo[chave];
  else proximo[chave] = valor;
  return proximo;
}

export function aplicarConfiguracoes(
  settingsAtual: unknown,
  patch: PatchDasConfiguracoes,
  etapas: { abertas: readonly string[]; vivas: readonly string[] },
): VereditoDaGravacao {
  let s: Record<string, unknown> = { ...comoRecord(settingsAtual) };

  if (patch.gerais) {
    const pedidas = patch.gerais.tags_padrao.map(normalizarTag).filter((t) => t.length > 0);
    if (pedidas.includes(TAG_DO_SISTEMA))
      return { ok: false, erro: "A tag «cliente» é do sistema. Escolha outra." };
    if (new Set(pedidas).size > TAGS_PADRAO_MAX)
      return { ok: false, erro: "Uma origem tem no máximo 10 tags padrão." };
    const tags = normalizarTagsPadrao(patch.gerais.tags_padrao);
    s = comChave(
      comChave(s, CHAVE_DA_MOEDA, patch.gerais.moeda),
      CHAVE_DAS_TAGS,
      tags.length > 0 ? tags : null,
    );
  }
  if (patch.motivos) {
    const v = gravarMotivos(s, patch.motivos.selecionados, patch.motivos.novos);
    if (!v.ok) return v;
    s = comChave(
      { ...s, lost_reasons: v.lostReasons },
      CHAVE_DOS_INATIVOS,
      v.inativos.length > 0 ? v.inativos : null,
    );
  }
  if (patch.campos) {
    const v = gravarRegrasDosCampos(s, patch.campos.regras, etapas.abertas, etapas.vivas);
    if (!v.ok) return v;
    s = comChave(
      { ...s, fields: v.fields },
      CHAVE_DO_AO_SAIR,
      Object.keys(v.aoSair).length > 0 ? v.aoSair : null,
    );
  }
  if (patch.alerta) {
    s = comChave(s, CHAVE_DO_ALERTA, gravarAlerta(patch.alerta, etapas.vivas));
  }
  return { ok: true, settings: s };
}
