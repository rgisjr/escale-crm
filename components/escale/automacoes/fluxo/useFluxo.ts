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
import { copiaDaCaixa, regraGravadaDe, retratoDoFluxo, toastDaRecusa } from "@/lib/escale/automacoes/fluxo/estado";
import { organizarNaHorizontal } from "@/lib/escale/automacoes/fluxo/layout";
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
}
export type ResultadoDoSalvar = "salvo" | "criado" | "recusado" | "falhou";

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
  adicionar: (passo: ActionType | "condicoes", posicao?: { x: number; y: number }) => void;
  ligar: (c: Connection) => void;
  removerNo: (id: string) => void;
  removerLigacao: (id: string) => void;
  duplicarNo: (id: string) => void;
  aplicarNoNo: (id: string, dados: DadosDaCaixa) => void;
  trocarGatilho: (evento: string, tela: TelaDoGatilho) => void;
  reorganizar: () => void;
  salvar: () => Promise<ResultadoDoSalvar>;
  alternarAtivo: (ligar: boolean) => void;
}

function paraNos(desenho: Desenho): NoDaAutomacao[] {
  return desenho.caixas.map((c) => ({ id: c.id, type: c.type, position: c.position, data: c.data }));
}
function paraLigacoes(desenho: Desenho): Edge[] {
  return desenho.ligacoes.map((l) => ({ id: l.id, source: l.source, target: l.target }));
}

export function useFluxo(regra: AutomationRuleRow | null, opcoes: OpcoesDoFluxo): EstadoDoFluxo {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const regraGravada = useMemo(() => regraGravadaDe(regra), [regra]);
  // O desenho inicial nasce UMA vez: refetch da lista não pode atropelar edição.
  const inicial = useMemo(
    () => organizarNaHorizontal(desenhoDaRegra(regraGravada)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [nos, setNos, onNodesChange] = useNodesState<NoDaAutomacao>(paraNos(inicial));
  const [ligacoes, setLigacoes, onEdgesChange] = useEdgesState<Edge>(paraLigacoes(inicial));
  const [nome, setNome] = useState(regra?.name ?? opcoes.nomeInicial ?? "");
  const [salvo, setSalvo] = useState(() => retratoDoFluxo(regra?.name ?? "", inicial));
  const [ativo, setAtivo] = useState(regra?.is_active ?? false);
  // A versão do banco sobre a qual este desenho foi feito: vai em cada salvar, e
  // a rota recusa se outra tela gravou depois (em vez de apagar o que ela gravou).
  const [versao, setVersao] = useState<string | null>(regra?.updated_at ?? null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [problemasGerais, setProblemasGerais] = useState<ProblemaDoDesenho[]>([]);
  const criar = useCreateAutomationRule();
  const atualizar = useUpdateAutomationRule();
  const salvando = criar.isPending || atualizar.isPending;
  const opcoesRef = useRef(opcoes);
  useEffect(() => {
    opcoesRef.current = opcoes;
  });

  const desenho = useMemo(() => desenhoDaTela(nos, ligacoes), [nos, ligacoes]);
  const percurso = useMemo(() => percorrer(desenho), [desenho]);
  const evento = percurso.gatilho?.data.kind === "gatilho" ? percurso.gatilho.data.evento : "";
  const sujo = retratoDoFluxo(nome, desenho) !== salvo;

  /** Troca o desenho inteiro, mantendo o que o React Flow já mediu de cada caixa. */
  const aplicar = useCallback(
    (novo: Desenho) => {
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
      aplicar(organizarNaHorizontal(base, alturas));
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
      setNos((atuais) => atuais.map((n) => (n.id === id ? { ...n, data: limpos as DadosDaCaixa } : n)));
    },
    [setNos],
  );

  const adicionar = useCallback(
    (passo: ActionType | "condicoes", posicao?: { x: number; y: number }) => {
      if (passo === "condicoes" && desenho.caixas.some((c) => c.data.kind === "condicoes")) {
        setSelecionado(ID_DAS_CONDICOES);
        toast.info(t("As condições ficam numa caixa só. Acrescente a nova condição nela."));
        return;
      }
      if (passo !== "condicoes" && acoesQueFechamLaco(evento, [{ type: passo }]).length > 0) {
        toast.error(t(MENSAGEM_DO_LACO_DE_LEAD));
        return;
      }
      if (passo !== "condicoes" && !posicao && percurso.acoes.length >= MAXIMO_DE_ACOES) {
        toast.error(t(PROBLEMAS.acoesDemais));
        return;
      }
      const id = passo === "condicoes" ? ID_DAS_CONDICOES : proximoId(desenho.caixas.map((c) => c.id), "acao");
      const nova: CaixaDoDesenho =
        passo === "condicoes"
          ? {
              id,
              type: "condicoes",
              position: posicao ?? { x: 0, y: 0 },
              data: { kind: "condicoes", linhas: [{ field: "", op: "eq", value: "" }] },
            }
          : {
              id,
              type: "acao",
              position: posicao ?? { x: 0, y: 0 },
              data: { kind: "acao", acao: defaultActionConfig(passo) as unknown as AcaoDaRegra },
            };
      setSelecionado(id);
      if (posicao) {
        // Soltar no canvas: a caixa fica onde caiu, e a ligação é feita à mão.
        aplicar({ caixas: [...desenho.caixas, nova], ligacoes: desenho.ligacoes });
        return;
      }
      reorganizarDe(inserirDepois(desenho, selecionado, nova));
    },
    [desenho, evento, percurso.acoes.length, selecionado, aplicar, reorganizarDe, t],
  );

  const ligar = useCallback(
    (conexao: Connection) => {
      const r = ligarCaixas(desenho, conexao.source, conexao.target);
      if (!r.ok) {
        if (r.recusa) toast.error(t(r.recusa));
        return;
      }
      aplicar(r.desenho);
      if (r.aviso) toast.info(t(r.aviso));
    },
    [desenho, aplicar, t],
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
      if (percurso.acoes.length >= MAXIMO_DE_ACOES) {
        toast.error(t(PROBLEMAS.acoesDemais));
        return;
      }
      const copia = copiaDaCaixa(caixa, proximoId(desenho.caixas.map((c) => c.id), "acao"));
      reorganizarDe(inserirDepois(desenho, id, copia));
      setSelecionado(copia.id);
    },
    [desenho, percurso.acoes.length, reorganizarDe, t],
  );

  const trocarGatilho = useCallback(
    (novo: string, tela: TelaDoGatilho) => {
      setNos((atuais) =>
        atuais.map((n) => {
          if (n.data.kind === "gatilho") {
            return { ...n, data: { kind: "gatilho", evento: novo, tela } };
          }
          // Trocar o gatilho limpa as condições: cada gatilho tem os seus campos.
          if (n.data.kind === "condicoes" && novo !== evento) return { ...n, data: { kind: "condicoes", linhas: [] } };
          return n;
        }),
      );
    },
    [setNos, evento],
  );

  const salvar = useCallback(async (): Promise<ResultadoDoSalvar> => {
    const resultado = validarDesenho({ nome, desenho, regraGravada });
    const porCaixa = new Map<string, ProblemaDoDesenho[]>();
    for (const p of resultado.problemas) {
      if (p.caixa) porCaixa.set(p.caixa, [...(porCaixa.get(p.caixa) ?? []), p]);
    }
    setNos((atuais) => atuais.map((n) => ({ ...n, data: { ...n.data, problemas: porCaixa.get(n.id) } })));
    setProblemasGerais(resultado.problemas.filter((p) => p.caixa === null));
    if (!resultado.ok) {
      setSelecionado(null);
      toast.error(t(toastDaRecusa(resultado.problemas)));
      return "recusado";
    }
    try {
      if (regra) {
        const gravada = await atualizar.mutateAsync({
          id: regra.id,
          ...resultado.corpo,
          ...(versao ? { versao_lida: versao } : {}),
        });
        setVersao(gravada.data.updated_at);
        setSalvo(retratoDoFluxo(nome, desenho));
        toast.success(t("Automação salva com sucesso!"));
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
    } catch {
      /* showApiError já mostrou o toast */
      return "falhou";
    }
  }, [nome, desenho, regraGravada, regra, versao, atualizar, criar, router, qc, setNos, t]);

  const alternarAtivo = useCallback(
    (ligarRegra: boolean) => {
      if (!regra) return;
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
    [regra, atualizar, t],
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
  };
}
