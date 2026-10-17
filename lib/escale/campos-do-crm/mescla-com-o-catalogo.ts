import type { CustomFieldDef } from "@/lib/schemas/settings";

/**
 * FORK ESCALE · Fase 1F-a: a tela de Configurações › Funis manda a lista inteira
 * de campos, mas o catálogo é da organização. Uma tela aberta há tempo não pode
 * desfazer o que outro administrador mudou: renomear um campo (voltaria o nome
 * antigo em TODAS as origens) ou apagá-lo (o campo renasceria).
 *
 * A tela manda também as definições que carregou (`carregados`). Aqui, campo a
 * campo, só vale o que a pessoa de fato mexeu nesta tela:
 *
 * - chave que a tela não carregou: campo novo, entra como veio;
 * - definição mexida (rótulo, tipo, opções, condição…): vale a edição da pessoa;
 * - definição intocada: vale a do catálogo agora (`atuais`), e se o campo já não
 *   está no catálogo (apagado por outro administrador) ele não é recriado;
 * - `obrigatorio_em` é regra DESTA origem: vale a da pessoa se ela a mexeu, e a
 *   atual da origem se não.
 *
 * `desatualizado` avisa que a tela estava velha em algum campo intocado.
 */
export interface EntradaDaMescla {
  readonly enviados: readonly CustomFieldDef[];
  readonly carregados: readonly CustomFieldDef[];
  readonly atuais: readonly CustomFieldDef[];
}

export interface ResultadoDaMescla {
  readonly fields: CustomFieldDef[];
  readonly desatualizado: boolean;
}

function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    const partes = Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`);
    return `{${partes.join(",")}}`;
  }
  return JSON.stringify(valor ?? null);
}

/** A definição do catálogo: o item sem a chave e sem a regra da origem. */
function semRegra(campo: CustomFieldDef): Omit<CustomFieldDef, "key" | "obrigatorio_em"> {
  const { key: _key, obrigatorio_em: _regra, ...definicao } = campo;
  return definicao;
}

function indexaPorChave(campos: readonly CustomFieldDef[]): Map<string, CustomFieldDef> {
  const porChave = new Map<string, CustomFieldDef>();
  for (const c of campos) if (!porChave.has(c.key)) porChave.set(c.key, c);
  return porChave;
}

export function mesclaComOCatalogo({
  enviados,
  carregados,
  atuais,
}: EntradaDaMescla): ResultadoDaMescla {
  const carregadoPorChave = indexaPorChave(carregados);
  const atualPorChave = indexaPorChave(atuais);
  const fields: CustomFieldDef[] = [];
  let desatualizado = false;

  for (const enviado of enviados) {
    const carregado = carregadoPorChave.get(enviado.key);
    if (!carregado) {
      fields.push(enviado);
      continue;
    }
    if (canonico(semRegra(enviado)) !== canonico(semRegra(carregado))) {
      fields.push(enviado);
      continue;
    }
    const atual = atualPorChave.get(enviado.key);
    if (!atual) {
      desatualizado = true;
      continue;
    }
    if (canonico(semRegra(atual)) !== canonico(semRegra(enviado))) desatualizado = true;
    const mexeuNaRegra = canonico(enviado.obrigatorio_em) !== canonico(carregado.obrigatorio_em);
    const regra = mexeuNaRegra ? enviado.obrigatorio_em : atual.obrigatorio_em;
    fields.push({
      key: enviado.key,
      ...semRegra(atual),
      ...(regra ? { obrigatorio_em: regra } : {}),
    });
  }
  return { fields, desatualizado };
}
