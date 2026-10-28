"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useAcoesDosPaineis, usePaineis } from "@/hooks/escale/usePaineisDaCasca";
import { useSalvarGrafico } from "@/hooks/escale/useSalvarGrafico";
import { useT } from "@/hooks/i18n/useT";
import type { ApiError } from "@/lib/api/types";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";
import { rotaDoPainel } from "@/lib/escale/indicadores/rotas";
import { CirclePlus } from "@/lib/ui/icons-da-casca";

export type GraficoSendoEditado = { id: string; painelId: string; nome: string; descricao: string | null };
export type ConteudoDoGrafico = { tipo: TipoPrincipal; pergunta: Pergunta; opcoes: OpcoesDoGrafico };

type Props = {
  modo: "novo" | "editar";
  grafico: GraficoSendoEditado | null;
  painelDeOrigem: string | null;
  /** A pergunta do rascunho NO MOMENTO de salvar (não a foto do Executar). */
  conteudo: () => ConteudoDoGrafico | null;
  aoFechar: () => void;
};

const CAMPO = "h-8 w-full rounded-[4px] bg-casca-busca px-3 text-[13px] text-casca-texto outline-none focus-visible:ring-2 focus-visible:ring-casca-marca";
const ROTULO = "mb-2 block text-[13px] font-medium text-casca-texto";
const LIMITE_DA_DESCRICAO = 140;
const LIMITE_DO_NOME = 120;

/** O modal "Salvar chart" (10-056, 10-057): painel (escolhido ou criado na hora), nome, descrição e "Salvar como novo". */
export function JanelaSalvarChart({ modo, grafico, painelDeOrigem, conteudo, aoFechar }: Props) {
  const t = useT();
  const router = useRouter();
  const paineis = usePaineis();
  const { criar: criarPainel } = useAcoesDosPaineis();
  const { criar, atualizar } = useSalvarGrafico();
  const [painelId, setPainelId] = useState(grafico?.painelId ?? painelDeOrigem ?? "");
  const [nome, setNome] = useState(grafico?.nome ?? "");
  const [descricao, setDescricao] = useState(grafico?.descricao ?? "");
  const [comoNovo, setComoNovo] = useState(false);
  const [criandoPainel, setCriandoPainel] = useState(false);
  const [nomeDoPainel, setNomeDoPainel] = useState("");
  const [erroDoNome, setErroDoNome] = useState(false);
  const salvando = criar.isPending || atualizar.isPending;

  function adicionarPainel() {
    const nomeLimpo = nomeDoPainel.trim();
    if (!nomeLimpo) return voltarAoSeletor();
    criarPainel.mutate(
      { nome: nomeLimpo },
      {
        onSuccess: ({ id }) => {
          setPainelId(id);
          voltarAoSeletor();
        },
        onError: (e) => showApiError(e as ApiError),
      },
    );
  }
  function voltarAoSeletor() {
    setCriandoPainel(false);
    setNomeDoPainel("");
  }

  function salvar() {
    if (!nome.trim()) return setErroDoNome(true);
    const c = conteudo();
    if (!c || !painelId) return;
    const comum = { nome: nome.trim(), descricao: descricao.trim() || null, tipo: c.tipo, pergunta: c.pergunta, opcoes: c.opcoes };
    const aoSalvar = () => router.push(rotaDoPainel(painelId));
    const aoFalhar = (e: ApiError) => showApiError(e);
    if (modo === "novo" || comoNovo || !grafico) {
      criar.mutate({ painelId, ...comum }, { onSuccess: aoSalvar, onError: aoFalhar });
    } else {
      atualizar.mutate(
        {
          id: grafico.id,
          painelDeOrigem: grafico.painelId,
          ...(painelId !== grafico.painelId ? { painelId } : {}),
          ...comum,
        },
        { onSuccess: aoSalvar, onError: aoFalhar },
      );
    }
  }

  return (
    <JanelaDaCasca aberta onFechar={aoFechar} className="w-[min(666px,calc(100vw-2rem))] gap-0 p-0">
      <div className="flex h-14 items-center border-b border-casca-divisoria px-6">
        <DialogTitle className="text-[14px] font-medium text-casca-texto">{t("Salvar chart")}</DialogTitle>
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">
        <div>
          <span className={ROTULO}>
            {t("Dashboard")} <span className="text-casca-alerta">*</span>
          </span>
          {criandoPainel ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                aria-label={t("Digite o nome do novo dashboard")}
                placeholder={t("Digite o nome do novo dashboard")}
                value={nomeDoPainel}
                maxLength={80}
                onChange={(e) => setNomeDoPainel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    voltarAoSeletor();
                  }
                  if (e.key === "Enter") adicionarPainel();
                }}
                className={CAMPO}
              />
              <button
                type="button"
                onClick={adicionarPainel}
                disabled={criarPainel.isPending}
                className="h-8 shrink-0 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:opacity-50"
              >
                {t("Adicionar")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SeletorDaCasca
                  aria-label={t("Dashboard")}
                  className="h-8"
                  vazio={t("Selecione um dashboard")}
                  valor={painelId}
                  opcoes={(paineis.data ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))}
                  aoMudar={setPainelId}
                />
              </div>
              <DicaAoPassar texto={t("Criar um novo dashboard em branco")}>
                <button
                  type="button"
                  aria-label={t("Criar um novo dashboard em branco")}
                  onClick={() => setCriandoPainel(true)}
                  className="grid size-8 place-items-center text-casca-marca"
                >
                  <CirclePlus size={18} aria-hidden />
                </button>
              </DicaAoPassar>
            </div>
          )}
        </div>
        <div>
          <label className={ROTULO} htmlFor="nome-do-chart">
            {t("Nome do Chart")} <span className="text-casca-alerta">*</span>
          </label>
          <input
            id="nome-do-chart"
            value={nome}
            maxLength={LIMITE_DO_NOME}
            onChange={(e) => {
              setNome(e.target.value);
              setErroDoNome(false);
            }}
            className={CAMPO}
          />
          {erroDoNome ? <p className="mt-1 text-[12px] text-casca-alerta">{t("campo obrigatório")}</p> : null}
        </div>
        <div>
          <label className={ROTULO} htmlFor="descricao-do-chart">
            {t("Descrição")}{" "}
            <DicaAoPassar texto={t("Aparece como dica ao passar o mouse no título do chart. Até 140 caracteres.")}>
              <span className="text-casca-marca">?</span>
            </DicaAoPassar>
          </label>
          <textarea
            id="descricao-do-chart"
            rows={3}
            value={descricao}
            maxLength={LIMITE_DA_DESCRICAO}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full resize-none rounded-[4px] bg-casca-busca px-3 py-2 text-[13px] text-casca-texto outline-none focus-visible:ring-2 focus-visible:ring-casca-marca"
          />
        </div>
        <CaixaDaCasca marcada={comoNovo} aoMudar={setComoNovo} rotulo={t("Salvar como novo")} />
      </div>
      <div className="flex justify-end border-t border-casca-divisoria px-6 py-4">
        <button
          type="button"
          onClick={salvar}
          disabled={criandoPainel || salvando || !painelId}
          className="h-8 rounded-[6px] bg-casca-marca px-5 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Salvar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
