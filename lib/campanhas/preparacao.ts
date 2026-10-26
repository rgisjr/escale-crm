/**
 * PREPARAR — o recorte vira uma lista de destinatários congelada.
 *
 * ═══ Por que congelar ═══
 *
 * Depois daqui, mexer na etiqueta de um contato não muda mais quem recebe
 * AQUELA execução. Sem isso, a lista muda no meio do envio: o número que o
 * operador conferiu antes de apertar não é o número que sai, e "por que essa
 * pessoa recebeu?" fica sem resposta possível — o recorte de ontem não existe
 * mais em lugar nenhum.
 *
 * ═══ Por que o excluído vira LINHA, e não some ═══
 *
 * Quem foi pulado, e por quê, é a informação que o operador mais precisa: uma
 * lista de 500 que vira 80 envios tem um problema, e o problema tem nome
 * (bloqueado, sem telefone, duplicado). Sumir com eles devolveria "80" sem
 * explicação. A linha excluída nasce `skipped` e nunca entra na fila.
 *
 * ═══ Por que roda na requisição, e não num worker ═══
 *
 * O que a doutrina proíbe no Route Handler é o LOTE DE ENVIO — mandar N
 * mensagens dentro de uma requisição. Preparar é três consultas e um insert em
 * massa, com teto de 5.000 linhas; empurrar isso para um worker acrescentaria um
 * estado intermediário observável ("preparando" que nunca termina) e um caminho
 * de retomada, para economizar segundos. O envio, esse sim, é do cron.
 *
 * ═══ Idempotência ═══
 *
 * A transição `draft → preparing` é compare-and-set: dois cliques simultâneos,
 * e só um entra. Preparar de novo (depois de voltar ao rascunho) apaga a lista
 * anterior e reconstrói — o que só é permitido enquanto NADA saiu, guarda que
 * vive na rota.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { FILTRO_VAZIO, filtroDeAudienciaSchema, type FiltroDeAudiencia } from "./audiencia";
import { buscarCandidatos, contatosJaEmCampanha } from "./consulta-de-audiencia";
import { hashDoEndereco, hashesExcluidos } from "./exclusoes";
import {
  classificarAudiencia,
  contarExclusoes,
  type CandidatoDaAudiencia,
} from "./elegibilidade";
import { renderizar } from "./renderizador";
import type { MotivoDeExclusao } from "./tipos";
// FORK ESCALE · Fase 8B: o público da casca chega resolvido; o modelo da Meta tem os valores próprios.
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import { corpoComValores, fontesDoDestinatario, valoresDoModelo } from "@/lib/escale/campanhas/modelo";

export interface ResumoDoSnapshot {
  total: number;
  elegiveis: number;
  excluidos: number;
  motivos: Partial<Record<MotivoDeExclusao, number>>;
}

/** Quantas linhas vão num insert. Acima disso o payload do PostgREST fica grande demais. */
const LOTE_DE_INSERT = 500;

/**
 * A PRÉVIA: o mesmo recorte, a mesma classificação, sem gravar nada.
 *
 * Usa as MESMAS funções da preparação de propósito — prévia que mede por outro
 * caminho é prévia que mente, e a mentira só aparece depois do envio.
 */
export async function preverAudiencia(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    filtro: FiltroDeAudiencia;
    corpo: string;
    agora: Date;
    /** Campanha a ignorar na conta de "já em campanha" (a que está sendo editada). */
    campanhaId?: string;
  },
): Promise<
  ResumoDoSnapshot & {
    /** O recorte bateu o teto de 20.000 negócios e há linha além dele (#2404). */
    truncado: boolean;
    amostra: Array<{ nome: string | null; motivo: MotivoDeExclusao | null }>;
  }
> {
  const { linhas, truncado } = await classificar(admin, entrada);
  const elegiveis = linhas.filter((l) => l.elegivel).length;
  return {
    total: linhas.length,
    elegiveis,
    excluidos: linhas.length - elegiveis,
    motivos: contarExclusoes(linhas),
    truncado,
    // Amostra curta: a tela mostra "quem" para o operador reconhecer a lista,
    // não para ele conferir 500 nomes numa página.
    amostra: linhas.slice(0, 20).map((l) => ({ nome: l.candidato.nome, motivo: l.motivo })),
  };
}

async function classificar(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    filtro: FiltroDeAudiencia;
    corpo: string;
    agora: Date;
    campanhaId?: string;
    // FORK ESCALE · Fase 8B
    candidatos?: readonly CandidatoDaAudiencia[];
    modelo?: MensagemDeModelo | null;
  },
): Promise<{ linhas: ReturnType<typeof classificarAudiencia>; truncado: boolean }> {
  // FORK ESCALE · Fase 8B: com o público da casca, os candidatos já vêm do banco.
  // As três leituras são independentes: em paralelo, não uma atrás da outra (G8-5).
  const [{ candidatos, truncado }, jaEmCampanha, suprimidos] = await Promise.all([
    entrada.candidatos
      ? Promise.resolve({ candidatos: [...entrada.candidatos], truncado: false })
      : buscarCandidatos(admin, {
          organizationId: entrada.organizationId,
          filtro: entrada.filtro,
          agora: entrada.agora,
          corpo: entrada.corpo,
        }),
    contatosJaEmCampanha(admin, entrada.organizationId, entrada.campanhaId),
    hashesExcluidos(admin, entrada.organizationId),
  ]);
  return {
    linhas: classificarAudiencia(candidatos, {
      excluidosAMao: new Set(entrada.filtro.excluir_contatos),
      jaEmCampanha,
      suprimidos,
      hashDoEndereco,
      // A saudação NÃO é resolvida aqui: ela é da hora do envio. O token fica no
      // corpo congelado e o despacho o troca — ver `rodada.ts`.
      renderizar: (c: CandidatoDaAudiencia) => {
        // FORK ESCALE · Fase 8B: o modelo resolve as variáveis dele; a saudação segue para o envio.
        if (entrada.modelo) {
          const v = valoresDoModelo(entrada.modelo, { nome: c.nome, lead: c.lead, contato: c.contato });
          return { texto: corpoComValores(entrada.modelo.corpo, v.valores), faltando: v.faltando };
        }
        const valores = { nome: c.nome, lead: c.lead, contato: c.contato };
        // Frente V: os tokens da lista única (`[CONTACT.FIRST_NAME]`) leem o mesmo nome e campos.
        const r = renderizar(entrada.corpo, { ...valores, fontes: fontesDoDestinatario(valores) });
        return { texto: r.texto, faltando: r.faltando };
      },
    }),
    truncado,
  };
}

/**
 * Materializa o snapshot. A campanha já tem de estar em `preparing` — quem faz a
 * transição é a rota, que é quem sabe recusar o clique repetido.
 */
export async function prepararCampanha(
  admin: SupabaseClient,
  entrada: {
    campanhaId: string;
    organizationId: string;
    filtro: unknown;
    corpo: string;
    contentVersion: number;
    agora: Date;
    // FORK ESCALE · Fase 8B
    candidatos?: readonly CandidatoDaAudiencia[];
    modelo?: MensagemDeModelo | null;
  },
): Promise<ResumoDoSnapshot> {
  // FORK ESCALE · Fase 8B: com o público da casca, o filtro antigo (vazio) não é validado.
  let filtro: FiltroDeAudiencia = FILTRO_VAZIO;
  if (!entrada.candidatos) {
    const lido = filtroDeAudienciaSchema.safeParse(entrada.filtro);
    if (!lido.success) {
      throw new Error(`Filtro de audiência inválido: ${lido.error.issues[0]?.message ?? "sem critério"}`);
    }
    filtro = lido.data;
  }

  const { linhas } = await classificar(admin, {
    organizationId: entrada.organizationId,
    filtro,
    corpo: entrada.corpo,
    agora: entrada.agora,
    campanhaId: entrada.campanhaId,
    candidatos: entrada.candidatos,
    modelo: entrada.modelo ?? null,
  });

  // Reconstrução limpa: a rota só chega aqui quando nada saiu, então apagar a
  // lista anterior não apaga histórico de envio nenhum.
  const { error: erroLimpeza } = await admin
    .from("campaign_recipients")
    .delete()
    .eq("organization_id", entrada.organizationId)
    .eq("campaign_id", entrada.campanhaId);
  if (erroLimpeza) throw new Error(`preparação: limpeza — ${erroLimpeza.message}`);

  const agoraIso = entrada.agora.toISOString();
  const registros = linhas.map((l) => ({
    organization_id: entrada.organizationId,
    campaign_id: entrada.campanhaId,
    contact_id: l.candidato.contactId,
    // Endereço só de quem vai receber: o excluído não precisa dele, e guardar
    // telefone que ninguém vai usar é PII sem finalidade.
    recipient_address: l.elegivel ? l.candidato.telefone : null,
    status: l.elegivel ? "pending" : "skipped",
    eligibility_status: l.elegivel ? "eligible" : "excluded",
    exclusion_reason: l.motivo,
    rendered_body: l.corpo,
    content_version: entrada.contentVersion,
    // FORK ESCALE · Fase 8B: com modelo, os valores de cada variável ficam congelados aqui.
    variables:
      entrada.modelo && l.elegivel
        ? {
            nome: l.candidato.nome,
            modelo: valoresDoModelo(entrada.modelo, {
              nome: l.candidato.nome,
              lead: l.candidato.lead,
              contato: l.candidato.contato,
            }).valores,
          }
        : { nome: l.candidato.nome },
    cancelled_at: null,
    created_at: agoraIso,
  }));

  for (let i = 0; i < registros.length; i += LOTE_DE_INSERT) {
    const { error } = await admin
      .from("campaign_recipients")
      .insert(registros.slice(i, i + LOTE_DE_INSERT));
    if (error) throw new Error(`preparação: gravação — ${error.message}`);
  }

  const elegiveis = linhas.filter((l) => l.elegivel).length;
  return {
    total: linhas.length,
    elegiveis,
    excluidos: linhas.length - elegiveis,
    motivos: contarExclusoes(linhas),
  };
}

/** O filtro guardado no banco, ou o vazio quando a campanha ainda não escolheu. */
export function filtroGuardado(valor: unknown): FiltroDeAudiencia {
  const r = filtroDeAudienciaSchema.safeParse(valor);
  return r.success ? r.data : FILTRO_VAZIO;
}
