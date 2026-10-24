"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { MoldeDoAssistente } from "@/components/escale/campanhas/molde/MoldeDoAssistente";
import { RodapeDoAssistente } from "@/components/escale/campanhas/molde/RodapeDoAssistente";
import { TrilhaDoAssistente } from "@/components/escale/campanhas/molde/TrilhaDoAssistente";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { rotaDaAba } from "@/lib/escale/campanhas/rotas";
import {
  buscaDoRascunho,
  errosDaBusca,
  errosDoPasso,
  impressaoDaBusca,
  inicioDoAssistente,
  PASSOS_DA_PROSPECCAO,
  type InicioDoAssistente,
  type PassoDaProspeccao,
  type RascunhoDaProspeccao,
} from "@/lib/escale/prospeccao/assistente";
import { contarMarcadas } from "@/lib/escale/prospeccao/selecao";
import type { OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { randomId } from "@/lib/random-id";

import { ErrosDoPasso } from "../campos";
import { PassoConfigure } from "./PassoConfigure";
import { PassoEncontre } from "./PassoEncontre";

const mensagemDoErro = (e: unknown, padrao: string) =>
  e instanceof Error && e.message ? e.message : padrao;

/**
 * O ASSISTENTE DE PROSPECÇÃO (fork Escale, Fase 8D; molde da 8B; D9). Este
 * componente só carrega: espera as opções (e a prospecção, para continuar ou
 * duplicar) e monta o assistente com o estado inicial — sem `setState` em
 * efeito.
 */
export function AssistenteDeProspeccao({
  campanhaId,
  copiarDe,
}: {
  campanhaId: string | null;
  copiarDe: string | null;
}) {
  const t = useT();
  const fonteId = campanhaId ?? copiarDe;
  const fonte = useDetalheDaProspeccao(fonteId);
  const opcoes = useOpcoesDaProspeccao();

  if (opcoes.isError || fonte.isError)
    return (
      <p className="p-6 text-[13px] text-casca-alerta">
        {t("Não foi possível carregar a prospecção.")}
      </p>
    );
  if (!opcoes.data || (fonteId && !fonte.data))
    return (
      <p role="status" className="p-6 text-[13px] text-casca-suave">
        {t("Carregando prospecção")}
      </p>
    );
  if (campanhaId && fonte.data && fonte.data.status !== "draft")
    return (
      <div className="p-6 text-[13px] text-casca-texto">
        <p>{t("Esta prospecção já começou. Acompanhe pela lista.")}</p>
        <Link
          href={rotaDaAba("prospeccao")}
          className="mt-2 inline-block text-casca-marca hover:underline"
        >
          {t("Voltar para a lista")}
        </Link>
      </div>
    );

  const inicial = inicioDoAssistente(
    fonte.data ?? null,
    campanhaId ? "continuar" : copiarDe ? "copiar" : "nova",
    t(" Cópia"),
  );
  return <AssistenteCarregado key={fonteId ?? "nova"} inicial={inicial} opcoes={opcoes.data} />;
}

function AssistenteCarregado({
  inicial,
  opcoes,
}: {
  inicial: InicioDoAssistente;
  opcoes: OpcoesDaProspeccao;
}) {
  const t = useT();
  const router = useRouter();
  const [passo, setPasso] = useState<PassoDaProspeccao>(inicial.passo);
  const [r, setR] = useState<RascunhoDaProspeccao>(inicial.rascunho);
  const [campanhaId, setCampanhaId] = useState<string | null>(inicial.campanhaId);
  const [mostrar, setMostrar] = useState<string[]>([]);
  const tentativa = useRef<{ impressao: string; id: string } | null>(null);
  const detalhe = useDetalheDaProspeccao(campanhaId);
  const acao = useAcaoDaProspeccao();
  const d = detalhe.data ?? null;
  const ctx = {
    buscaConcluida: d?.statusDaBusca === "succeeded",
    marcadas: d ? contarMarcadas(d.empresas) : 0,
  };

  const atualizar = (p: Partial<RascunhoDaProspeccao>) => setR((atual) => ({ ...atual, ...p }));
  const irPara = (p: PassoDaProspeccao) => {
    setMostrar([]);
    setPasso(p);
  };

  function avancar() {
    const erros = errosDoPasso(passo, r, ctx);
    if (erros.length) return setMostrar(erros.map(t));
    if (passo < 3) irPara((passo + 1) as PassoDaProspeccao);
  }

  function voltar() {
    if (passo === 0) router.push(rotaDaAba("prospeccao"));
    else irPara((passo - 1) as PassoDaProspeccao);
  }

  async function buscar() {
    const erros = errosDaBusca(r);
    if (erros.length) return setMostrar(erros.map(t));
    const impressao = impressaoDaBusca(r);
    if (tentativa.current?.impressao !== impressao)
      tentativa.current = { impressao, id: randomId() };
    try {
      const criada = (await acao.mutateAsync({
        action: "search",
        request_id: tentativa.current.id,
        search: buscaDoRascunho(r),
      })) as { id: string };
      setMostrar([]);
      setCampanhaId(criada.id);
      toast.success(t("Solicitação registrada. Acompanhe o estado da busca nesta tela."));
    } catch (e) {
      toast.error(mensagemDoErro(e, t("Não foi possível concluir a operação.")));
    }
  }

  function novaBusca() {
    tentativa.current = null;
    setCampanhaId(null);
  }

  async function marcar(ids: string[], selected: boolean) {
    if (!campanhaId) return;
    try {
      await acao.mutateAsync({ action: "select", id: campanhaId, candidate_ids: ids, selected });
    } catch (e) {
      toast.error(mensagemDoErro(e, t("Não foi possível concluir a operação.")));
    }
  }

  function salvarRascunho() {
    toast.success(
      t(
        "Rascunho salvo. A busca e as empresas marcadas ficam guardadas; o resto da configuração não.",
      ),
    );
    router.push(rotaDaAba("prospeccao"));
  }

  const trilha = (
    <TrilhaDoAssistente
      itens={[
        { rotulo: t("Campanhas"), href: rotaDaAba("whatsapp") },
        { rotulo: t("Prospecção"), href: rotaDaAba("prospeccao") },
        { rotulo: inicial.campanhaId ? t("Continuar prospecção") : t("Nova prospecção") },
      ]}
    />
  );
  const extras = campanhaId ? (
    <button
      type="button"
      onClick={salvarRascunho}
      className="h-8 rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
    >
      {t("Salvar como rascunho")}
    </button>
  ) : undefined;
  const rodape = (
    <RodapeDoAssistente
      aoVoltar={voltar}
      rotuloVoltar={t("Voltar")}
      extras={extras}
      principal={{ rotulo: t("Próximo"), aoClicar: avancar }}
    />
  );

  return (
    <MoldeDoAssistente
      trilha={trilha}
      passos={PASSOS_DA_PROSPECCAO.map((p) => t(p))}
      atual={passo}
      rodape={rodape}
    >
      <ErrosDoPasso erros={mostrar} />
      {passo === 0 ? (
        <PassoConfigure
          r={r}
          atualizar={atualizar}
          opcoes={opcoes}
          nomeTravado={campanhaId !== null}
        />
      ) : passo === 1 ? (
        <PassoEncontre
          r={r}
          atualizar={atualizar}
          detalhe={d}
          ocupado={acao.isPending}
          aoBuscar={() => void buscar()}
          aoNovaBusca={novaBusca}
          aoMarcar={(ids, v) => void marcar(ids, v)}
        />
      ) : (
        <p className="text-[13px] text-casca-suave">{t(PASSOS_DA_PROSPECCAO[passo])}</p>
      )}
    </MoldeDoAssistente>
  );
}
