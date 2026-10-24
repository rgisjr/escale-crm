/**
 * O RASCUNHO DAS ETAPAS (fork Escale, Fase 1L): o que a aba "Etapas e atividades"
 * guarda enquanto a pessoa edita (lápis, lixeira, arrastar, "Nova Etapa"), como a
 * Clint. Nada vai ao banco antes do "Salvar na origem". Sem React e sem rede.
 *
 * Etapa nova tem id PROVISÓRIO (`novo:<uuid>`): o servidor troca pelo real ao criar.
 * Limites da tela, como na Clint: nome 40, descrição 200 (a API do original aceita mais).
 */
import type { EtapaDaOrigem } from "@/lib/escale/configuracoes/montar";

export const MAX_NOME_DA_ETAPA = 40;
export const MAX_DESCRICAO_DA_ETAPA = 200;
export const PREFIXO_DA_PROVISORIA = "novo:";

export interface EtapaDoRascunho {
  id: string;
  nome: string;
  descricao: string;
  nova: boolean;
}

export type DecisaoDosNegocios = { acao: "mover"; destinoId: string } | { acao: "excluir" };

export interface EtapaExcluida {
  id: string;
  nome: string;
  /** Preenchida na janela que o servidor pede ("Migrar negócios"); `null` = ainda não decidida. */
  negocios: DecisaoDosNegocios | null;
}

export interface RascunhoDasEtapas {
  etapas: readonly EtapaDoRascunho[];
  excluidas: readonly EtapaExcluida[];
}

export const ehProvisoria = (id: string) => id.startsWith(PREFIXO_DA_PROVISORIA);

/** As etapas abertas da origem (ganho e perda ficam de fora desta aba), em ordem. */
export function rascunhoInicialDasEtapas(etapas: readonly EtapaDaOrigem[]): RascunhoDasEtapas {
  return {
    etapas: etapas
      .filter((e) => !e.is_won && !e.is_lost)
      .map((e) => ({ id: e.id, nome: e.name, descricao: e.description ?? "", nova: false })),
    excluidas: [],
  };
}

/** A frase de erro (já traduzida por `t`) ou `null` se nome e descrição servem. */
export function erroDaEtapa(
  nome: string,
  descricao: string,
  t: (texto: string) => string = (texto) => texto,
): string | null {
  if (nome.trim() === "") return t("O nome precisa ter pelo menos 1 caractere.");
  if (nome.length > MAX_NOME_DA_ETAPA) return t("O nome pode ter no máximo 40 caracteres.");
  if (descricao.length > MAX_DESCRICAO_DA_ETAPA) {
    return t("A descrição não pode ter mais de 200 caracteres.");
  }
  return null;
}

export function criarEtapaProvisoria(
  r: RascunhoDasEtapas,
  id: string = `${PREFIXO_DA_PROVISORIA}${globalThis.crypto.randomUUID()}`,
): RascunhoDasEtapas {
  const nova: EtapaDoRascunho = {
    id,
    nome: `Nova Etapa ${r.etapas.length + 1}`,
    descricao: "",
    nova: true,
  };
  return { ...r, etapas: [...r.etapas, nova] };
}

export function editarEtapa(
  r: RascunhoDasEtapas,
  id: string,
  mudanca: { nome: string; descricao: string },
): RascunhoDasEtapas {
  return {
    ...r,
    etapas: r.etapas.map((e) =>
      e.id === id ? { ...e, nome: mudanca.nome.trim(), descricao: mudanca.descricao.trim() } : e,
    ),
  };
}

export function moverEtapa(r: RascunhoDasEtapas, de: number, para: number): RascunhoDasEtapas {
  if (de === para || de < 0 || para < 0 || de >= r.etapas.length || para >= r.etapas.length) {
    return r;
  }
  const lista = [...r.etapas];
  const [movida] = lista.splice(de, 1);
  lista.splice(para, 0, movida!);
  return { ...r, etapas: lista };
}

/** Excluir etapa criada agora some sem rastro; a já salva vai para a lista de exclusões. */
export function excluirEtapa(r: RascunhoDasEtapas, id: string): RascunhoDasEtapas {
  const alvo = r.etapas.find((e) => e.id === id);
  if (!alvo) return r;
  const etapas = r.etapas.filter((e) => e.id !== id);
  if (alvo.nova) return { ...r, etapas };
  return { etapas, excluidas: [...r.excluidas, { id, nome: alvo.nome, negocios: null }] };
}

export function decidirNegocios(
  r: RascunhoDasEtapas,
  id: string,
  negocios: DecisaoDosNegocios,
): RascunhoDasEtapas {
  return { ...r, excluidas: r.excluidas.map((e) => (e.id === id ? { ...e, negocios } : e)) };
}

/** O nome que aparece duas vezes (sem distinguir maiúscula), ou `null`: o servidor recusa repetido. */
export function nomeRepetido(
  r: RascunhoDasEtapas,
  reservados: readonly string[] = [],
): string | null {
  const vistos = new Set<string>(reservados.map((n) => n.trim().toLocaleLowerCase()));
  for (const e of r.etapas) {
    const chave = e.nome.trim().toLocaleLowerCase();
    if (vistos.has(chave)) return e.nome.trim();
    vistos.add(chave);
  }
  return null;
}

/** Mudou algo em relação ao que o banco tem? (nome, descrição, ordem, etapa nova ou excluída) */
export function etapasMudaram(r: RascunhoDasEtapas, salvo: readonly EtapaDaOrigem[]): boolean {
  if (r.excluidas.length > 0) return true;
  const base = rascunhoInicialDasEtapas(salvo).etapas;
  if (base.length !== r.etapas.length) return true;
  return r.etapas.some((e, i) => {
    const b = base[i]!;
    return e.nova || e.id !== b.id || e.nome !== b.nome || e.descricao !== b.descricao;
  });
}

/** O corpo do `PUT .../etapas-e-atividades` (as atividades entram na rota, que as grava no meio). */
export interface PedidoDeGravarEtapas {
  etapas: Array<{ id: string; nome: string; descricao: string | null }>;
  excluidas: Array<{
    id: string;
    negocios?: { acao: "mover"; destino_id: string } | { acao: "excluir" };
  }>;
}

export function pedidoDeGravarEtapas(r: RascunhoDasEtapas): PedidoDeGravarEtapas {
  return {
    etapas: r.etapas.map((e) => ({
      id: e.id,
      nome: e.nome.trim(),
      descricao: e.descricao.trim() === "" ? null : e.descricao.trim(),
    })),
    excluidas: r.excluidas.map((e) => ({
      id: e.id,
      ...(e.negocios
        ? {
            negocios:
              e.negocios.acao === "mover"
                ? { acao: "mover" as const, destino_id: e.negocios.destinoId }
                : { acao: "excluir" as const },
          }
        : {}),
    })),
  };
}
