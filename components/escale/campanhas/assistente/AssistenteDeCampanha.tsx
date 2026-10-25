"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  useAcaoDoAssistente,
  useAssistenteSalvo,
  useNumerosDaCampanha,
  useSalvarAssistente,
} from "@/hooks/escale/useAssistenteDeCampanha";
import { useCamposDaCampanha } from "@/hooks/escale/useCamposDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import type { Role } from "@/lib/auth/types";
import { roleAtLeast } from "@/lib/auth/types";
import type { ResumoDaPreparacao } from "@/lib/escale/campanhas/acoes-do-assistente";
import { assistenteSchema } from "@/lib/escale/campanhas/assistente";
import {
  PASSOS_DO_ASSISTENTE,
  errosDoPasso,
  estadoInicial,
  redutorDoAssistente,
  type Passo,
} from "@/lib/escale/campanhas/estado-do-assistente";
import { partesDaMensagem } from "@/lib/escale/campanhas/previa";
import { ROTA_DAS_CAMPANHAS } from "@/lib/escale/campanhas/rotas";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { Send } from "@/lib/ui/icons-da-casca";

import { MoldeDoAssistente } from "../molde/MoldeDoAssistente";
import { RodapeDoAssistente } from "../molde/RodapeDoAssistente";
import { TrilhaDoAssistente } from "../molde/TrilhaDoAssistente";
import { BOTAO_CONTORNADO } from "../molde/estilos";
import { FimDoAssistente } from "./FimDoAssistente";
import { PassoConfigurar } from "./PassoConfigurar";
import { PassoConfirmar } from "./PassoConfirmar";
import { PassoContatos } from "./PassoContatos";
import { PassoOpcionais } from "./PassoOpcionais";
import { PreviaDoCelular } from "./PreviaDoCelular";

type Fim =
  | { tipo: "sucesso"; nome: string; modo: "iniciada" | "agendada" }
  | { tipo: "erro"; mensagem: string };
const mensagemDe = (e: unknown, padrao: string) =>
  e instanceof Error && e.message ? e.message : padrao;

/**
 * O ASSISTENTE DE CAMPANHA (fork Escale, Fase 8B; PRD B1–B18; N2, N14, N16,
 * N19). Os 4 passos da Clint no molde, a prévia do celular nos passos 1 e 4,
 * o rascunho salvo e preparado ao entrar no passo 4, e o fim. Monta o
 * `TooltipProvider` das dicas (memória "provedor escondido pelo teste").
 */
export function AssistenteDeCampanha({
  campanhaId,
  origens,
  opcoesDoFiltro,
  papel,
  fuso,
}: {
  campanhaId: string | null;
  origens: OrigemParaCriar[];
  opcoesDoFiltro: OpcoesDoFiltro;
  papel: Role;
  fuso?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [estado, despachar] = useReducer(redutorDoAssistente, undefined, estadoInicial);
  const numeros = useNumerosDaCampanha().data ?? [];
  const salvo = useAssistenteSalvo(campanhaId);
  const salvar = useSalvarAssistente();
  const acao = useAcaoDoAssistente();
  const personalizados = useCamposDaCampanha();
  const [resumo, setResumo] = useState<ResumoDaPreparacao | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [erroDaPreparacao, setErroDaPreparacao] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fim, setFim] = useState<Fim | null>(null);
  const [bloqueada, setBloqueada] = useState(false);
  const carregado = useRef(false);

  useEffect(() => {
    const dados = salvo.data;
    if (!dados || carregado.current) return;
    carregado.current = true;
    if (dados.status !== "draft" && dados.status !== "ready") {
      setBloqueada(true);
      return;
    }
    const carregar = () =>
      despachar({
        tipo: "carregar",
        campanhaId: dados.campanhaId,
        dados: dados.assistente,
        publicoAntigo: dados.publicoAntigo,
      });
    if (dados.status === "ready") {
      // Quem fechou a aba no passo 4 deixou a campanha "Pronta": volta a rascunho para editar (N14).
      acao
        .mutateAsync({ id: dados.campanhaId, acao: "rascunho" })
        .then(carregar, () => setBloqueada(true));
    } else {
      carregar();
    }
  }, [salvo.data, acao]);

  const d = estado.dados;
  const numero = numeros.find((n) => n.id === d.numeroId) ?? null;
  const partes = partesDaMensagem(d.mensagem, personalizados);
  const trilha = (
    <TrilhaDoAssistente
      itens={[
        { rotulo: t("Campanhas"), href: ROTA_DAS_CAMPANHAS },
        { rotulo: t("WhatsApp"), href: ROTA_DAS_CAMPANHAS },
        { rotulo: campanhaId ? t("Editar rascunho") : t("Nova campanha") },
      ]}
    />
  );

  async function prepararPasso4() {
    setPreparando(true);
    setErroDaPreparacao(null);
    setResumo(null);
    try {
      const lido = assistenteSchema.safeParse(d);
      if (!lido.success)
        throw new Error(
          t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente."),
        );
      const id = await salvar.mutateAsync({ campanhaId: estado.campanhaId, dados: lido.data });
      if (id !== estado.campanhaId) despachar({ tipo: "salvo", campanhaId: id });
      const r = await acao.mutateAsync({ id, acao: "preparar" });
      setResumo(r.resumo as ResumoDaPreparacao);
    } catch (e) {
      setErroDaPreparacao(
        mensagemDe(
          e,
          t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente."),
        ),
      );
    } finally {
      setPreparando(false);
    }
  }

  function proximo() {
    const erros = errosDoPasso(estado.passo, d, { numero, agora: new Date() });
    if (Object.keys(erros).length > 0) {
      despachar({ tipo: "tentou" });
      return;
    }
    const seguinte = (estado.passo + 1) as Passo;
    despachar({ tipo: "irPara", passo: seguinte });
    if (seguinte === 3) void prepararPasso4();
  }

  async function voltar() {
    if (estado.passo === 0) return router.push(ROTA_DAS_CAMPANHAS);
    // Sempre devolve a rascunho (o servidor trata "já é rascunho" como sucesso): a
    // campanha pode estar `ready` sem resumo na tela (preparo lento, erro depois do ready, B8-2).
    if (estado.passo === 3 && estado.campanhaId) {
      try {
        await acao.mutateAsync({ id: estado.campanhaId, acao: "rascunho" });
      } catch (e) {
        toast.error(
          mensagemDe(
            e,
            t(
              "Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente.",
            ),
          ),
        );
        return;
      }
      setResumo(null);
    }
    despachar({ tipo: "irPara", passo: (estado.passo - 1) as Passo });
  }

  async function salvarComoRascunho() {
    if (!estado.campanhaId) return;
    try {
      await acao.mutateAsync({ id: estado.campanhaId, acao: "rascunho" });
      toast.success(t("Rascunho salvo com sucesso."));
      router.push(ROTA_DAS_CAMPANHAS);
    } catch (e) {
      toast.error(
        mensagemDe(
          e,
          t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente."),
        ),
      );
    }
  }

  async function enviar() {
    if (!estado.campanhaId) return;
    setEnviando(true);
    try {
      const r = await acao.mutateAsync({ id: estado.campanhaId, acao: "enviar" });
      setFim({
        tipo: "sucesso",
        nome: d.nome,
        modo: r.modo === "agendada" ? "agendada" : "iniciada",
      });
    } catch (e) {
      setFim({
        tipo: "erro",
        mensagem: mensagemDe(
          e,
          t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente."),
        ),
      });
    } finally {
      setEnviando(false);
    }
  }

  if (bloqueada) {
    return (
      <div className="flex flex-col bg-surface">
        {trilha}
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-casca-texto">
            {t("Esta campanha não é mais um rascunho.")}
          </p>
          <button
            type="button"
            onClick={() => router.push(ROTA_DAS_CAMPANHAS)}
            className={BOTAO_CONTORNADO}
          >
            {t("Ir para a tela inicial")}
          </button>
        </div>
      </div>
    );
  }
  if (campanhaId && estado.campanhaId === null && salvo.isError) {
    // Sem o rascunho carregado, o assistente vazio criaria uma campanha nova no passo 4 (B8-4).
    return (
      <div className="flex flex-col bg-surface">
        {trilha}
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p role="alert" className="text-[15px] font-semibold text-casca-texto">
            {t("Não foi possível carregar a campanha.")}
          </p>
          <button type="button" onClick={() => void salvo.refetch()} className={BOTAO_CONTORNADO}>
            {t("Tentar novamente")}
          </button>
        </div>
      </div>
    );
  }
  if (campanhaId && estado.campanhaId === null && salvo.isLoading) {
    return (
      <div className="flex flex-col bg-surface">
        {trilha}
        <p role="status" className="px-6 py-16 text-center text-[13px] text-casca-suave">
          {t("Carregando campanha")}
        </p>
      </div>
    );
  }
  if (fim) {
    return (
      <div className="flex min-h-[28rem] flex-col bg-surface">
        {trilha}
        <FimDoAssistente
          resultado={fim}
          aoNovaCampanha={() => {
            setFim(null);
            setResumo(null);
            despachar({ tipo: "reiniciar" });
            router.push("/app/campaigns/new");
          }}
          aoTentarDeNovo={() => setFim(null)}
        />
      </div>
    );
  }

  const passos = PASSOS_DO_ASSISTENTE.map((p) => t(p));
  const lateral =
    estado.passo === 0 || estado.passo === 3 ? (
      <PreviaDoCelular
        dispositivo={numero?.nome ?? null}
        partes={partes}
        vazio={
          numero?.oficial
            ? t("Selecione um modelo para ver a prévia da mensagem")
            : t("Escreva a mensagem para ver a prévia")
        }
      />
    ) : undefined;
  const rodape =
    estado.passo === 3 ? (
      <RodapeDoAssistente
        aoVoltar={() => void voltar()}
        voltarDesabilitado={preparando || enviando}
        extras={
          <button
            type="button"
            disabled={!resumo || enviando}
            onClick={() => void salvarComoRascunho()}
            className={BOTAO_CONTORNADO}
          >
            {t("Salvar como rascunho")}
          </button>
        }
        principal={{
          rotulo: t("Enviar Whatsapp"),
          aoClicar: () => void enviar(),
          carregando: enviando,
          desabilitado: !resumo,
          icone: <Send className="size-3.5" aria-hidden />,
        }}
      />
    ) : (
      <RodapeDoAssistente
        aoVoltar={() => void voltar()}
        principal={{ rotulo: t("Próximo"), aoClicar: proximo }}
      />
    );

  return (
    <TooltipProvider>
      <MoldeDoAssistente
        trilha={trilha}
        passos={passos}
        atual={estado.passo}
        rodape={rodape}
        lateral={lateral}
      >
        {estado.passo === 0 && (
          <PassoConfigurar
            estado={estado}
            despachar={despachar}
            numeros={numeros}
            personalizados={personalizados}
            podeSincronizar={roleAtLeast(papel, "admin")}
          />
        )}
        {estado.passo === 1 && (
          <PassoContatos
            estado={estado}
            despachar={despachar}
            numeroOficial={numero?.oficial ?? false}
            origens={origens}
            opcoesDoFiltro={opcoesDoFiltro}
          />
        )}
        {estado.passo === 2 && (
          <PassoOpcionais estado={estado} despachar={despachar} numeros={numeros} />
        )}
        {estado.passo === 3 && (
          <PassoConfirmar
            estado={estado}
            resumo={resumo}
            preparando={preparando}
            erroDaPreparacao={erroDaPreparacao}
            numero={numero}
            fuso={fuso}
          />
        )}
      </MoldeDoAssistente>
    </TooltipProvider>
  );
}
