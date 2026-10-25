/**
 * A GRAVAÇÃO DAS CONFIGURAÇÕES DA ORIGEM (Fase 1F): o corpo do PATCH e o
 * `settings` que sai dele. As seções que mudaram vêm juntas (o "Salvar" único
 * da Clint) e saem num `update` só. Só as chaves delas mudam; o resto do
 * `settings` passa intacto. Chave sem valor some.
 */
import { z } from "zod";

import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { listaParaGravar } from "@/lib/escale/acesso/membros";
import {
  CHAVE_DA_VISUALIZACAO,
  CHAVE_DAS_PESSOAS,
  PESSOAS_MAX,
  VISUALIZACOES,
  pessoasDaOrigem,
} from "@/lib/escale/acesso/regras";
import { CHAVE_DOS_OCULTOS, camposOcultosSchema } from "@/lib/escale/campos/ocultos";
import { atribuicaoSchema, gravarAtribuicao } from "@/lib/escale/ganho/regras";
import { gravarNotificacoes, notificacoesSchema } from "@/lib/escale/notificacoes/regras";
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
        /** Ausente = não mexe na regra; `null` = volta a seguir a da organização; valor = fixa. */
        visualizacao: z.enum(VISUALIZACOES).nullable().optional(),
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
    /** Fase 2C (D4): a "Visualização de campos"; só administrador. */
    campos_visiveis: camposOcultosSchema.optional(),
    permissoes: z
      .object({ pessoas: z.array(z.string().uuid()).max(PESSOAS_MAX) })
      .strict()
      .optional(),
    atribuicao: atribuicaoSchema.optional(),
    notificacoes: notificacoesSchema.optional(),
    /**
     * Só para a conferência da Q9 (1J): quem ficará na distribuição quando a tela
     * salvar a distribuição DEPOIS desta gravação (sai um e entra outro na mesma
     * hora). Sem esta lista, a rota confere a lista de pessoas contra a
     * distribuição que ainda está gravada. Não é seção: não grava nada.
     */
    distribuicao_pendente: z.array(z.string().uuid()).max(PESSOAS_MAX).optional(),
  })
  .strict()
  .refine(
    (p) => Object.entries(p).some(([chave, v]) => chave !== "distribuicao_pendente" && v !== undefined),
    { message: "nada para salvar" },
  );
export type PatchDasConfiguracoes = z.infer<typeof patchDasConfiguracoesSchema>;
export type SecaoDasConfiguracoes =
  | "gerais"
  | "motivos"
  | "campos"
  | "campos_visiveis"
  | "alerta"
  | "permissoes"
  | "distribuicao"
  | "atribuicao"
  | "notificacoes";

export const SECOES_DO_ADMINISTRADOR: readonly SecaoDasConfiguracoes[] = ["motivos", "campos", "campos_visiveis", "atribuicao"];

export function secoesDoPatch(patch: PatchDasConfiguracoes): SecaoDasConfiguracoes[] {
  return (["gerais", "motivos", "campos", "campos_visiveis", "alerta", "permissoes", "atribuicao", "notificacoes"] as const).filter((s) => patch[s] !== undefined);
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
  etapas: { abertas: readonly string[]; vivas: readonly string[]; membros?: readonly string[] },
): VereditoDaGravacao {
  let s: Record<string, unknown> = { ...comoRecord(settingsAtual) };

  if (patch.gerais) {
    const pedidas = patch.gerais.tags_padrao.map(normalizarTag).filter((t) => t.length > 0);
    if (pedidas.includes(TAG_DO_SISTEMA))
      return { ok: false, erro: "A tag «cliente» é do sistema. Escolha outra." };
    if (new Set(pedidas).size > TAGS_PADRAO_MAX)
      return { ok: false, erro: "Uma origem tem no máximo 10 tags padrão." };
    const tags = normalizarTagsPadrao(patch.gerais.tags_padrao);
    s = comChave(comChave(s, CHAVE_DA_MOEDA, patch.gerais.moeda), CHAVE_DAS_TAGS, tags.length > 0 ? tags : null);
    if (patch.gerais.visualizacao !== undefined) {
      s = comChave(s, CHAVE_DA_VISUALIZACAO, patch.gerais.visualizacao);
    }
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
  if (patch.campos_visiveis) {
    const o = patch.campos_visiveis;
    const vazio = !o.usar_do_grupo && !o.contato.length && !o.negocio.length && !o.empresa.length;
    s = comChave(s, CHAVE_DOS_OCULTOS, vazio ? null : o);
  }
  if (patch.alerta) {
    s = comChave(s, CHAVE_DO_ALERTA, gravarAlerta(patch.alerta, etapas.vivas));
  }
  if (patch.permissoes) {
    // Sem a lista de membros ativos não há como conferir quem entra: recusa (a rota sempre manda).
    if (!etapas.membros) return { ok: false, erro: "Este usuário não faz parte da equipe." };
    const lista = listaParaGravar(patch.permissoes.pessoas, etapas.membros, pessoasDaOrigem(settingsAtual));
    if (!lista.ok) return lista;
    s = comChave(s, CHAVE_DAS_PESSOAS, lista.lista);
  }
  if (patch.atribuicao) s = gravarAtribuicao(s, patch.atribuicao);
  if (patch.notificacoes) {
    const todas = [
      ...patch.notificacoes.novo_negocio.pessoas,
      ...patch.notificacoes.mudanca_de_status.pessoas,
    ].map((p) => p.toLowerCase());
    const v = gravarNotificacoes(s, patch.notificacoes, etapas.membros ?? todas);
    if (!v.ok) return v;
    s = v.settings;
  }
  return { ok: true, settings: s };
}
