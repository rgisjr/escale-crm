"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { toast } from "sonner";

import { defaultActionConfig } from "@/app/app/webhooks/_components/ActionConfigForm";
import type { ActionType } from "@/app/app/webhooks/_components/labels";
import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { useT } from "@/hooks/i18n/useT";
import {
  useCreateAutomationRule,
  useUpdateAutomationRule,
  type AutomationRuleRow,
} from "@/hooks/webhooks/useAutomationRules";
import {
  ID_DAS_CONDICOES,
  MAXIMO_DE_ACOES,
  PROBLEMAS,
  desenhoDaRegra,
  desenhoDaTela,
  excluirCaixa,
  excluirLigacao,
  inserirDepois,
  ligar as ligarCaixas,
  percorrer,
  proximoId,
  validarDesenho,
  type AcaoDaRegra,
  type CaixaDoDesenho,
  type DadosDaCaixa,
  type Desenho,
  type Percurso,
  type ProblemaDoDesenho,
  type TelaDoGatilho,
} from "@/lib/automation/desenho-da-regra";
import {
  useDescartarRascunho,
  useGravarFluxo,
  useSalvarRascunho,
  type RascunhoDaAutomacao,
} from "@/hooks/escale/useAutomacoesDaCasca";
import { ApiError } from "@/lib/api/types";
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA } from "@/lib/automation/rascunho-nao-liga";
import {
  AVISO_CONFLITO_VIROU_RASCUNHO,
  AVISO_CORRIJA_PARA_PUBLICAR,
  RECUSA_RASCUNHO_SEM_GATILHO,
  TOAST_RASCUNHO_COM_VERSAO_NO_AR,
  TOAST_RASCUNHO_SALVO,
} from "@/lib/escale/automacoes/fluxo/frases-do-rascunho";
import { pendenciasDasCaixas } from "@/lib/escale/automacoes/fluxo/pendencias";
import { LIMITE_DE_NOS, RECUSA_TAMANHO_MAXIMO, type SaidaDoNo } from "@/lib/escale/automacoes/fluxo/caixas";
import { compilar, modoDoDesenho } from "@/lib/escale/automacoes/fluxo/compilar";
import { problemasAntesDoPublish, problemasDoServidor } from "@/lib/escale/automacoes/fluxo/erros-do-publish";
import {
  emModoFluxo,
  inserirNoFluxo,
  ligarNoFluxo,
  normalizarSaidas,
  organizarDoModo,
  semSaidasInvalidas,
} from "@/lib/escale/automacoes/fluxo/edicao";
import { copiaDaCaixa, regraGravadaDe, retratoDoFluxo } from "@/lib/escale/automacoes/fluxo/estado";
import {
  PROBLEMA_DO_GRUPO_VAZIO,
  achatar,
  acoesDoGrupo,
  agrupar,
  agruparNoFluxo,
  contarAcoes,
  ehGrupo,
  gruposVazios,
  idNaTela,
  novoGrupo,
} from "@/lib/escale/automacoes/fluxo/grupos";
import { organizarNaHorizontal } from "@/lib/escale/automacoes/fluxo/layout";
import { GATILHOS_DO_PASSO_DO_INSTAGRAM, PASSO_DO_INSTAGRAM } from "@/lib/escale/comentarios/constantes";
import { comConfigPropria } from "@/lib/escale/comentarios/tela";
import { paraLigacoes, paraNos } from "@/lib/escale/automacoes/fluxo/nos";
import { rotaDoFluxo } from "@/lib/escale/automacoes/rotas";
import { acoesQueFechamLaco, MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";

/**
 * FORK ESCALE · Fase 5B: o estado do fluxo da casca. Porta a lógica do
 * `CanvasDaAutomacao` (o original não muda) com a arrumação horizontal e o
 * painel de rascunho. A regra (o que pode ligar, o que é problema, o corpo) é
 * toda do `desenho-da-regra.ts`; o hook só guarda estado e grava pelas mesmas
 * mutações do designer de hoje.
 */
export interface OpcoesDoFluxo {
  nomeInicial?: string;
  /** 5A: grava pasta e forma depois de criar. Não lança. */
  aoCriar?: (id: string) => Promise<void>;
  /** Chamado depois de reorganizar, para o canvas enquadrar. */
  aoReorganizar?: () => void;
  /** FORK ESCALE · 5D: o desenho de uma automação em modo fluxo (o servidor devolve; `null` = é só uma regra). */
  desenhoDoFluxo?: Desenho | null;
  /** O rascunho salvo sem publicar: quando há, a tela abre nele (e não na versão no ar). */
  rascunho?: RascunhoDaAutomacao | null;
}
export type ResultadoDoSalvar = "salvo" | "criado" | "rascunho" | "recusado" | "falhou";

export interface EstadoDoFluxo {
  nos: NoDaAutomacao[];
  ligacoes: Edge[];
  onNodesChange: OnNodesChange<NoDaAutomacao>;
  onEdgesChange: OnEdgesChange<Edge>;
  desenho: Desenho;
  percurso: Percurso;
  evento: string;
  nome: string;
  setNome: (nome: string) => void;
  ativo: boolean;
  sujo: boolean;
  salvando: boolean;
  /** `updated_at` da versão gravada (o "Salvo há X"); `null` na nova. */
  versao: string | null;
  selecionado: string | null;
  selecionar: (id: string | null) => void;
  problemasGerais: ProblemaDoDesenho[];
  adicionar: (passo: ActionType | typeof PASSO_DO_INSTAGRAM | "condicoes" | "grupo" | "atraso", posicao?: { x: number; y: number }) => void;
  ligar: (c: Connection) => void;
  removerNo: (id: string) => void;
  removerLigacao: (id: string) => void;
  duplicarNo: (id: string) => void;
  aplicarNoNo: (id: string, dados: DadosDaCaixa) => void;
  trocarGatilho: (evento: string, tela: TelaDoGatilho) => void;
  reorganizar: () => void;
  salvar: () => Promise<ResultadoDoSalvar>;
  alternarAtivo: (ligar: boolean) => void;
  /** `updated_at` do rascunho pendente; `null` quando a tela está na versão publicada. */
  rascunhoEm: string | null;
  /** A regra já foi publicada (tem ação). Sem isto, ligar é recusado. */
  publicada: boolean;
  descartarRascunho: () => Promise<boolean>;
}

export function useFluxo(regra: AutomationRuleRow | null, opcoes: OpcoesDoFluxo): EstadoDoFluxo {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const regraGravada = useMemo(() => regraGravadaDe(regra), [regra]);
  // O desenho inicial nasce UMA vez: refetch da lista não pode atropelar edição.
  const inicial = useMemo(
    // FORK ESCALE · Fase 10B: o gatilho de comentário abre com a configuração gravada na tela.
    // FORK ESCALE · automações: com rascunho, a tela abre nele, como foi salvo.
    () =>
      opcoes.rascunho
        ? normalizarSaidas(opcoes.rascunho.desenho)
        : opcoes.desenhoDoFluxo
          ? normalizarSaidas(agruparNoFluxo(opcoes.desenhoDoFluxo))
          : organizarNaHorizontal(agrupar(comConfigPropria(desenhoDaRegra(regraGravada), regraGravada))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [nos, setNos, onNodesChange] = useNodesState<NoDaAutomacao>(paraNos(inicial));
  const [ligacoes, setLigacoes, onEdgesChange] = useEdgesState<Edge>(paraLigacoes(inicial));
  const [nome, setNome] = useState(opcoes.rascunho ? opcoes.rascunho.nome : (regra?.name ?? opcoes.nomeInicial ?? ""));
  const [salvo, setSalvo] = useState(() => retratoDoFluxo(opcoes.rascunho ? opcoes.rascunho.nome : (regra?.name ?? ""), inicial));
  const [ativo, setAtivo] = useState(regra?.is_active ?? false);
  // A versão do banco sobre a qual este desenho foi feito: vai em cada salvar, e
  // a rota recusa se outra tela gravou depois (em vez de apagar o que ela gravou).
  const [versao, setVersao] = useState<string | null>(regra?.updated_at ?? null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [problemasGerais, setProblemasGerais] = useState<ProblemaDoDesenho[]>([]);
  const [rascunhoEm, setRascunhoEm] = useState<string | null>(opcoes.rascunho?.atualizadoEm ?? null);
  const [publicada, setPublicada] = useState(() => (regra?.actions.length ?? 0) > 0);
  const gravarFluxo = useGravarFluxo();
  const criar = useCreateAutomationRule();
  const atualizar = useUpdateAutomationRule();
  const gravarRascunho = useSalvarRascunho();
  const apagarRascunho = useDescartarRascunho();
  const salvando = criar.isPending || atualizar.isPending || gravarFluxo.isPending || gravarRascunho.isPending;
  const opcoesRef = useRef(opcoes);
  useEffect(() => {
    opcoesRef.current = opcoes;
  });

  const desenho = useMemo(() => desenhoDaTela(nos, ligacoes), [nos, ligacoes]);
  // A fila do motor (uma caixa por ação): é ela que se confere e se grava. A tela mostra os grupos.
  const achatado = useMemo(() => achatar(desenho), [desenho]);
  const percurso = useMemo(() => percorrer(achatado), [achatado]);
  const evento = percurso.gatilho?.data.kind === "gatilho" ? percurso.gatilho.data.evento : "";
  const sujo = retratoDoFluxo(nome, desenho) !== salvo;

  /** Troca o desenho inteiro, mantendo o que o React Flow já mediu de cada caixa. */
  const aplicar = useCallback(
    (bruto: Desenho) => {
      const novo = normalizarSaidas(bruto);
      setNos((atuais) =>
        novo.caixas.map((c) => {
          const antigo = atuais.find((n) => n.id === c.id);
          return antigo
            ? { ...antigo, position: c.position, data: c.data }
            : { id: c.id, type: c.type, position: c.position, data: c.data };
        }),
      );
      setLigacoes(paraLigacoes(novo));
    },
    [setNos, setLigacoes],
  );

  const reorganizarDe = useCallback(
    (base: Desenho) => {
      const alturas = new Map(nos.map((n) => [n.id, n.measured?.height ?? 0] as const).filter(([, h]) => h > 0));
      aplicar(organizarDoModo(base, alturas));
      opcoesRef.current.aoReorganizar?.();
    },
    [nos, aplicar],
  );

  const reorganizar = useCallback(() => reorganizarDe(desenho), [desenho, reorganizarDe]);

  const selecionar = useCallback((id: string | null) => setSelecionado(id), []);

  const aplicarNoNo = useCallback(
    (id: string, dados: DadosDaCaixa) => {
      // Editar uma caixa tira dela o aviso antigo: o próximo salvar confere de novo.
      const { problemas: _problemas, ...limpos } = dados;
      const atuais = nos.map((n) => (n.id === id ? { ...n, data: limpos as DadosDaCaixa } : n));
      // FORK ESCALE · 5D: apagar um botão ou um grupo apaga a ligação que saía dele.
      const novo = semSaidasInvalidas(normalizarSaidas(desenhoDaTela(atuais, ligacoes)));
      setNos(atuais);
      setLigacoes(paraLigacoes(novo));
    },
    [nos, ligacoes, setNos, setLigacoes],
  );

  const adicionar = useCallback(
    (passo: ActionType | typeof PASSO_DO_INSTAGRAM | "condicoes" | "grupo" | "atraso", posicao?: { x: number; y: number }) => {
      // FORK ESCALE · 5D: o Atraso só existe no modo fluxo; com ele (ou com ramos) o desenho vira um fluxo.
      const modoFluxo = passo === "atraso" || emModoFluxo(achatado);
      // FORK ESCALE · Fase 10B: o passo Instagram só funciona com o gatilho de comentário (D9).
      if (passo === PASSO_DO_INSTAGRAM && !(GATILHOS_DO_PASSO_DO_INSTAGRAM as readonly string[]).includes(evento)) {
        toast.error(t("O passo Instagram funciona com os gatilhos do Instagram."));
        return;
      }
      if (modoFluxo && desenho.caixas.length >= LIMITE_DE_NOS) {
        toast.error(t(RECUSA_TAMANHO_MAXIMO));
        return;
      }
      if (passo === "condicoes" && !modoFluxo && desenho.caixas.some((c) => c.data.kind === "condicoes")) {
        setSelecionado(ID_DAS_CONDICOES);
        toast.info(t("As condições ficam numa caixa só. Acrescente a nova condição nela."));
        return;
      }
      if (passo !== "condicoes" && passo !== "grupo" && passo !== "atraso" && acoesQueFechamLaco(evento, [{ type: passo }]).length > 0) {
        toast.error(t(MENSAGEM_DO_LACO_DE_LEAD));
        return;
      }
      if (passo !== "condicoes" && passo !== "atraso" && !modoFluxo && !posicao && contarAcoes(desenho) >= MAXIMO_DE_ACOES) {
        toast.error(t(PROBLEMAS.acoesDemais));
        return;
      }
      const ids = desenho.caixas.map((c) => c.id);
      const id =
        passo === "condicoes"
          ? ids.includes(ID_DAS_CONDICOES)
            ? proximoId(ids, "condicoes")
            : ID_DAS_CONDICOES
          : passo === "atraso"
            ? proximoId(ids, "atraso")
            : proximoId(ids, "acao");
      const onde = posicao ?? { x: 0, y: 0 };
      const nova: CaixaDoDesenho =
        passo === "atraso"
          ? { id, type: "atraso", position: onde, data: { kind: "atraso", quantidade: 1, unidade: "minutos", janela: null } }
          : passo === "grupo"
          ? novoGrupo(id, onde)
          : passo === "condicoes"
            ? {
                id,
                type: "condicoes",
                position: onde,
                data: { kind: "condicoes", linhas: [{ field: "", op: "eq", value: "" }] },
              }
            : {
                id,
                type: "acao",
                position: onde,
                data: {
                  kind: "acao",
                  acao:
                    passo === PASSO_DO_INSTAGRAM
                      ? { type: PASSO_DO_INSTAGRAM, config: { texto: "", botoes: [] } }
                      : (defaultActionConfig(passo) as unknown as AcaoDaRegra),
                },
              };
      setSelecionado(id);
      if (posicao) {
        // Soltar no canvas: a caixa fica onde caiu, e a ligação é feita à mão.
        aplicar({ caixas: [...desenho.caixas, nova], ligacoes: desenho.ligacoes });
        return;
      }
      reorganizarDe(modoFluxo ? inserirNoFluxo(desenho, selecionado, nova) : inserirDepois(desenho, selecionado, nova));
    },
    [desenho, achatado, evento, selecionado, aplicar, reorganizarDe, t],
  );

  const ligar = useCallback(
    (conexao: Connection) => {
      const saida = (conexao.sourceHandle ?? "proximo") as SaidaDoNo;
      const origem = desenho.caixas.find((c) => c.id === conexao.source);
      const unico = origem?.data.kind === "condicoes" && origem.data.grupos?.length === 1 ? origem.data.grupos[0]!.id : null;
      // FORK ESCALE · 5D: no modo regra (a fila) vale a ligação de sempre; com ramos, cada saída liga a um destino.
      if (emModoFluxo(achatado) || (saida !== "proximo" && saida !== `grupo:${unico}`)) {
        const f = ligarNoFluxo(desenho, conexao.source, saida, conexao.target);
        if (!f.ok) {
          if (f.recusa) toast.error(t(f.recusa));
          return;
        }
        aplicar(f.desenho);
        return;
      }
      const r = ligarCaixas(desenho, conexao.source, conexao.target);
      if (!r.ok) {
        if (r.recusa) toast.error(t(r.recusa));
        return;
      }
      aplicar(r.desenho);
      if (r.aviso) toast.info(t(r.aviso));
    },
    [desenho, achatado, aplicar, t],
  );

  const removerNo = useCallback(
    (id: string) => {
      const caixa = desenho.caixas.find((c) => c.id === id);
      if (!caixa || caixa.data.kind === "gatilho") return;
      reorganizarDe(excluirCaixa(desenho, id));
      setSelecionado((atual) => (atual === id ? null : atual));
    },
    [desenho, reorganizarDe],
  );

  const removerLigacao = useCallback(
    (id: string) => aplicar(excluirLigacao(desenho, id)),
    [desenho, aplicar],
  );

  const duplicarNo = useCallback(
    (id: string) => {
      const caixa = desenho.caixas.find((c) => c.id === id);
      if (!caixa || caixa.data.kind !== "acao") return;
      if (contarAcoes(desenho) + (ehGrupo(caixa.data) ? acoesDoGrupo(caixa.data).length : 1) > MAXIMO_DE_ACOES) {
        toast.error(t(PROBLEMAS.acoesDemais));
        return;
      }
      const copia = copiaDaCaixa(caixa, proximoId(desenho.caixas.map((c) => c.id), "acao"));
      reorganizarDe(emModoFluxo(achatado) ? inserirNoFluxo(desenho, id, copia) : inserirDepois(desenho, id, copia));
      setSelecionado(copia.id);
    },
    [desenho, achatado, reorganizarDe, t],
  );

  const trocarGatilho = useCallback(
    (novo: string, tela: TelaDoGatilho) => {
      setNos((atuais) =>
        atuais.map((n) => {
          if (n.data.kind === "gatilho") {
            return { ...n, data: { kind: "gatilho", evento: novo, tela } };
          }
          // Trocar o gatilho limpa as condições: cada gatilho tem os seus campos.
          if (n.data.kind === "condicoes" && novo !== evento) {
            const grupos = n.data.grupos?.map((g) => ({ ...g, linhas: [] }));
            return { ...n, data: { kind: "condicoes", linhas: [], ...(grupos ? { grupos } : {}) } };
          }
          return n;
        }),
      );
    },
    [setNos, evento],
  );

  /** Marca cada problema na caixa dele (e tira os antigos); os sem caixa vão para o aviso geral. */
  const mostrarProblemas = useCallback(
    (problemas: readonly ProblemaDoDesenho[]) => {
      const porCaixa = new Map<string, ProblemaDoDesenho[]>();
      for (const p of problemas) {
        if (p.caixa) porCaixa.set(p.caixa, [...(porCaixa.get(p.caixa) ?? []), p]);
      }
      setNos((atuais) => atuais.map((n) => ({ ...n, data: { ...n.data, problemas: porCaixa.get(n.id) } })));
      setProblemasGerais(problemas.filter((p) => p.caixa === null));
    },
    [setNos],
  );

  /** Tudo que impede PUBLICAR, já na caixa da tela. Salvar como rascunho nunca depende disto. */
  const conferir = useCallback(() => {
    // FORK ESCALE · 5D: com Atraso, ramos ou tempo de resposta o desenho grava como fluxo; senão, como regra de sempre.
    const modoFluxo = modoDoDesenho(achatado) === "fluxo";
    const resultado = modoFluxo
      ? compilar({ nome, desenho: achatado, regraGravada })
      : validarDesenho({ nome, desenho: achatado, regraGravada });
    // Os problemas vêm da fila do motor; cada um volta para a caixa da tela a que a ação pertence.
    const problemas: ProblemaDoDesenho[] = [];
    const juntar = (p: ProblemaDoDesenho) => {
      const caixa = p.caixa === null ? null : idNaTela(p.caixa);
      if (!problemas.some((q) => q.caixa === caixa && q.mensagem === p.mensagem)) problemas.push({ caixa, mensagem: p.mensagem });
    };
    if (!resultado.ok) resultado.problemas.forEach(juntar);
    // FORK ESCALE · 5D: o que o publish recusaria e não depende do banco, conferido antes de enviar.
    if (resultado.ok && "grafo" in resultado) problemasAntesDoPublish(resultado.grafo).forEach(juntar);
    gruposVazios(desenho).forEach((c) => juntar({ caixa: c.id, mensagem: PROBLEMA_DO_GRUPO_VAZIO }));
    pendenciasDasCaixas(achatado).forEach(juntar);
    return { modoFluxo, resultado, problemas };
  }, [nome, desenho, achatado, regraGravada]);

  // Um rascunho reaberto já mostra, nas caixas, o que falta para publicar.
  useEffect(() => {
    if (opcoesRef.current.rascunho) mostrarProblemas(conferir().problemas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * FORK ESCALE · automações (decisão do usuário, 04/11/2026): salvar NUNCA perde o trabalho. O que não
   * pode ser publicado vira rascunho; a automação no ar não muda. Só a nova sem gatilho não tem onde ficar.
   */
  const guardarRascunho = useCallback(
    async (aviso: string): Promise<ResultadoDoSalvar> => {
      if (!regra && !evento) {
        toast.error(t(RECUSA_RASCUNHO_SEM_GATILHO));
        return "recusado";
      }
      try {
        const r = await gravarRascunho.mutateAsync({ id: regra?.id ?? null, nome, desenho });
        setSalvo(retratoDoFluxo(nome, desenho));
        setRascunhoEm(r.atualizadoEm);
        toast.success(t(regra && publicada ? TOAST_RASCUNHO_COM_VERSAO_NO_AR : TOAST_RASCUNHO_SALVO));
        toast.info(t(aviso));
        if (regra) return "rascunho";
        await opcoesRef.current.aoCriar?.(r.ruleId); // pasta e forma, antes de trocar de tela
        router.replace(rotaDoFluxo(r.ruleId));
        return "criado";
      } catch {
        return "falhou"; // o showApiError do hook já mostrou
      }
    },
    [regra, evento, gravarRascunho, nome, desenho, publicada, router, t],
  );

  /** Publicou: a regra pode ligar, e o rascunho (se havia) sai. */
  const concluirPublicacao = useCallback(
    (ruleId: string) => {
      setPublicada(true);
      if (rascunhoEm === null) return;
      setRascunhoEm(null);
      apagarRascunho.mutate(ruleId);
    },
    [rascunhoEm, apagarRascunho],
  );

  const salvar = useCallback(async (): Promise<ResultadoDoSalvar> => {
    const { modoFluxo, resultado, problemas } = conferir();
    mostrarProblemas(problemas);
    if (!resultado.ok || problemas.length > 0) {
      setSelecionado(null);
      return guardarRascunho(AVISO_CORRIJA_PARA_PUBLICAR);
    }
    try {
      if (modoFluxo) {
        const gravado = await gravarFluxo.mutateAsync({ id: regra?.id ?? null, nome, desenho: achatado, versao });
        setVersao(gravado.atualizadoEm);
        setSalvo(retratoDoFluxo(nome, desenho));
        toast.success(t("Automação salva com sucesso!"));
        if (regra) {
          concluirPublicacao(regra.id);
          return "salvo";
        }
        toast.info(t("Ela nasce pausada: ligue quando estiver pronta."));
        await opcoesRef.current.aoCriar?.(gravado.ruleId);
        router.replace(rotaDoFluxo(gravado.ruleId));
        return "criado";
      }
      if (!resultado.ok || "modo" in resultado) return "recusado";
      if (regra) {
        const gravada = await atualizar.mutateAsync({
          id: regra.id,
          ...resultado.corpo,
          ...(versao ? { versao_lida: versao } : {}),
        });
        setVersao(gravada.data.updated_at);
        setSalvo(retratoDoFluxo(nome, desenho));
        toast.success(t("Automação salva com sucesso!"));
        concluirPublicacao(regra.id);
        return "salvo";
      }
      const criada = await criar.mutateAsync(resultado.corpo);
      setSalvo(retratoDoFluxo(nome, desenho));
      toast.success(t("Automação salva com sucesso!"));
      toast.info(t("Ela nasce pausada: ligue quando estiver pronta."));
      // A regra nova entra na lista já; a tela da automação gravada a lê do banco.
      qc.setQueryData<{ data: AutomationRuleRow[] }>(["automation-rules"], (velho) =>
        velho ? { data: [...velho.data.filter((r) => r.id !== criada.data.id), criada.data] } : { data: [criada.data] },
      );
      await opcoesRef.current.aoCriar?.(criada.data.id); // pasta e forma, antes de trocar de tela
      router.replace(rotaDoFluxo(criada.data.id));
      return "criado";
    } catch (err) {
      // FORK ESCALE · 5D: a recusa do publish volta para as caixas — e o desenho fica salvo como rascunho.
      const doServidor = modoFluxo ? problemasDoServidor(err) : null;
      if (doServidor) {
        mostrarProblemas(doServidor);
        setSelecionado(null);
        return guardarRascunho(AVISO_CORRIJA_PARA_PUBLICAR);
      }
      // Outra tela salvou por cima: nada se perde, o desenho daqui vira rascunho.
      if (err instanceof ApiError && err.code === "state_conflict") return guardarRascunho(AVISO_CONFLITO_VIROU_RASCUNHO);
      return "falhou";
    }
  }, [
    conferir,
    mostrarProblemas,
    guardarRascunho,
    concluirPublicacao,
    nome,
    desenho,
    achatado,
    regra,
    versao,
    atualizar,
    criar,
    gravarFluxo,
    router,
    qc,
    t,
  ]);

  /** Apaga o rascunho; quem chama remonta a tela na versão publicada. */
  const descartarRascunho = useCallback(async (): Promise<boolean> => {
    if (!regra) return false;
    try {
      await apagarRascunho.mutateAsync(regra.id);
      setRascunhoEm(null);
      return true;
    } catch {
      return false;
    }
  }, [regra, apagarRascunho]);

  const alternarAtivo = useCallback(
    (ligarRegra: boolean) => {
      if (!regra) return;
      // FORK ESCALE · automações: a regra que nunca foi publicada não tem o que rodar.
      if (ligarRegra && !publicada) {
        toast.error(t(MENSAGEM_DO_RASCUNHO_NAO_LIGA));
        return;
      }
      setAtivo(ligarRegra);
      atualizar.mutate(
        { id: regra.id, is_active: ligarRegra },
        {
          onSuccess: (gravada) => {
            // Ligar/pausar também troca a versão: sem isto, o próximo salvar daria conflito consigo mesmo.
            setVersao(gravada.data.updated_at);
            toast.success(ligarRegra ? t("Automação ligada.") : t("Automação pausada."));
          },
          onError: () => setAtivo(!ligarRegra),
        },
      );
    },
    [regra, publicada, atualizar, t],
  );

  return {
    nos,
    ligacoes,
    onNodesChange,
    onEdgesChange,
    desenho,
    percurso,
    evento,
    nome,
    setNome,
    ativo,
    sujo,
    salvando,
    versao,
    selecionado,
    selecionar,
    problemasGerais,
    adicionar,
    ligar,
    removerNo,
    removerLigacao,
    duplicarNo,
    aplicarNoNo,
    trocarGatilho,
    reorganizar,
    salvar,
    alternarAtivo,
    rascunhoEm,
    publicada,
    descartarRascunho,
  };
}
