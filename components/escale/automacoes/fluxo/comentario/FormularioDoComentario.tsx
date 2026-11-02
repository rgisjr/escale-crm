"use client";
import { useState } from "react";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useContasSociais, usePublicacoesDaConta } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import { ID_DO_CAMINHO_UNICO } from "@/lib/escale/comentarios/constantes";
import type { CaminhoDoGatilho, ConfigDoComentario, PublicacaoDoCaminho } from "@/lib/escale/comentarios/schema";
import { quandoBr } from "@/lib/escale/comentarios/formato";
import { armarProxima, caminhosDasPublicacoes, resumoDosCaminhos } from "@/lib/escale/comentarios/tela";
import { Plus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CaminhoDoComentario } from "./CaminhoDoComentario";
import { PublicoDoComentario } from "./PublicoDoComentario";
import { RepeticaoDoComentario } from "./RepeticaoDoComentario";
import { SeletorDeConta } from "./SeletorDeConta";
import { SeletorDePublicacoes } from "./SeletorDePublicacoes";

type Escopo = ConfigDoComentario["escopo"];

/** A ordem dos cartões: todos os posts, depois posts específicos. */
const ESCOPOS: readonly Escopo[] = ["todos", "especificos", "proxima"];

const TEXTO_DO_ESCOPO: Record<Escopo, [string, string]> = {
  todos: ["Todos os posts", "Um único caminho para comentários em qualquer publicação"],
  especificos: ["Posts específicos", "Cada publicação vira um caminho no fluxo"],
  proxima: ["Próxima publicação", "Um caminho para a primeira publicação feita depois de salvar"],
};

const caminhoUnico = (do_: CaminhoDoGatilho | undefined): CaminhoDoGatilho => ({
  id: ID_DO_CAMINHO_UNICO,
  publicacoes: [],
  filtro: do_?.filtro ?? { modo: "qualquer" },
  resposta: do_?.resposta ?? null,
  ocultar_depois: do_?.ocultar_depois ?? false,
  curtir: do_?.curtir ?? false,
});

/**
 * O PAINEL DO GATILHO "ALGUÉM COMENTA EM UM POST" (fork Escale, Fase 10B): conta, escopo (todos os
 * posts ou posts específicos), os caminhos com filtro e resposta, e o seletor de publicações.
 * Provisório: sem print da Clint, o molde sai dos textos do código dela (plano 10B, seção 4.2).
 */
export function FormularioDoComentario({
  config,
  aoMudar,
}: {
  config: ConfigDoComentario;
  aoMudar: (config: ConfigDoComentario) => void;
}) {
  const t = useT();
  const { contas } = useContasSociais();
  const conta = contas.find((c) => c.id === config.channel_session_id) ?? null;
  const publicacoesDaConta = usePublicacoesDaConta(conta?.id ?? null);
  const [trocandoConta, setTrocandoConta] = useState<string | null>(null);
  const [trocandoEscopo, setTrocandoEscopo] = useState<Escopo | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);

  const temPublicacao = config.caminhos.some((c) => c.publicacoes.length > 0);
  const preenchido = config.caminhos.some((c) => c.publicacoes.length > 0 || c.filtro.modo !== "qualquer" || c.resposta !== null);
  const resumo = resumoDosCaminhos(config);
  const emUso = new Set(config.caminhos.flatMap((c) => c.publicacoes.map((p) => p.id)));

  function aplicarConta(id: string) {
    aoMudar({
      ...config,
      channel_session_id: id,
      caminhos: config.escopo === "especificos" ? [] : config.caminhos,
      proxima: config.escopo === "proxima" ? null : config.proxima,
      escopo: config.escopo === "proxima" ? "todos" : config.escopo,
    });
  }
  function escolherConta(id: string) {
    if (id === config.channel_session_id) return;
    if (config.channel_session_id && temPublicacao) setTrocandoConta(id);
    else aplicarConta(id);
  }
  function aplicarEscopo(escopo: Escopo) {
    const unico = escopo === "todos" || escopo === "proxima";
    aoMudar({
      ...config,
      escopo,
      caminhos: unico ? [caminhoUnico(config.caminhos[0])] : [],
      proxima: escopo === "proxima" ? armarProxima(publicacoesDaConta.data ?? [], new Date()) : null,
    });
  }
  function escolherEscopo(escopo: Escopo) {
    if (escopo === config.escopo) return;
    if (preenchido) setTrocandoEscopo(escopo);
    else aplicarEscopo(escopo);
  }
  const mudarCaminho = (indice: number, caminho: CaminhoDoGatilho) =>
    aoMudar({ ...config, caminhos: config.caminhos.map((c, i) => (i === indice ? caminho : c)) });

  return (
    <div className="flex flex-col gap-5">
      <SeletorDeConta canal={config.channel_session_id} aoEscolher={escolherConta} />
      <hr className="border-casca-divisoria" />
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-casca-texto">{t("Quais publicações disparam o gatilho?")}</p>
        <div className="flex gap-2">
          {ESCOPOS.map((escopo) => (
            <button
              key={escopo}
              type="button"
              aria-pressed={config.escopo === escopo}
              onClick={() => escolherEscopo(escopo)}
              disabled={escopo === "proxima" && !conta}
              title={escopo === "proxima" && !conta ? t("Selecione um dispositivo para ver as publicações.") : undefined}
              className={cn(
                "flex-1 rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
                config.escopo === escopo ? "border-casca-marca bg-casca-marca-suave" : "border-casca-divisoria hover:bg-casca-raia",
              )}
            >
              <span className="block text-[13px] font-medium text-casca-texto">{t(TEXTO_DO_ESCOPO[escopo][0])}</span>
              <span className="block text-[11px] text-casca-suave">{t(TEXTO_DO_ESCOPO[escopo][1])}</span>
            </button>
          ))}
        </div>
      </div>

      {config.escopo === "proxima" ? (
        <div className="flex flex-col gap-3">
          {config.proxima?.resolvida ? (
            <div className="flex items-center gap-3 rounded-lg bg-casca-raia p-3">
              {config.proxima.resolvida.miniatura ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.proxima.resolvida.miniatura} alt="" className="size-10 rounded-md object-cover" />
              ) : (
                <span className="size-10 rounded-md bg-surface" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[12px] text-casca-texto">{config.proxima.resolvida.legenda ?? t("Sem legenda")}</p>
                {config.proxima.resolvida.publicada_em ? (
                  <p className="text-[11px] text-casca-suave">
                    {t("Publicada em {data}").replace("{data}", quandoBr(config.proxima.resolvida.publicada_em))}
                  </p>
                ) : null}
                <p className="text-[11px] text-casca-suave">{t("Esta automação agora vale só para esta publicação.")}</p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-casca-suave">
              {t("Aguardando a próxima publicação da conta. Ela vira o caminho do fluxo assim que alguém comentar nela.")}
            </p>
          )}
          {config.caminhos[0] ? (
            <CaminhoDoComentario caminho={config.caminhos[0]} plataforma={conta?.plataforma} aoMudar={(c) => mudarCaminho(0, c)} />
          ) : null}
        </div>
      ) : config.escopo === "todos" ? (
        config.caminhos[0] ? (
          <CaminhoDoComentario caminho={config.caminhos[0]} plataforma={conta?.plataforma} aoMudar={(c) => mudarCaminho(0, c)} />
        ) : null
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-casca-suave">
            {config.caminhos.length === 0
              ? t("Nenhuma publicação no gatilho ainda. Adicione publicações. Cada uma vira um caminho no fluxo, com seu próprio filtro de comentário.")
              : t("{n} publicações · {m} caminhos no fluxo").replace("{n}", String(resumo.publicacoes)).replace("{m}", String(resumo.caminhos))}
          </p>
          {config.caminhos.map((caminho, i) => (
            <CaminhoDoComentario
              key={caminho.id}
              caminho={caminho}
              plataforma={conta?.plataforma}
              titulo={{
                rotulo:
                  caminho.publicacoes.length > 1
                    ? t("Grupo · {n} publicações").replace("{n}", String(caminho.publicacoes.length))
                    : (caminho.publicacoes[0]?.legenda ?? caminho.publicacoes[0]?.id ?? t("Sem legenda")),
                miniaturas: caminho.publicacoes.map((p) => p.miniatura),
                remover: caminho.publicacoes.length > 1 ? t("Remover grupo") : t("Remover publicação"),
              }}
              aoMudar={(c) => mudarCaminho(i, c)}
              aoRemover={() => aoMudar({ ...config, caminhos: config.caminhos.filter((_, j) => j !== i) })}
            />
          ))}
          <button
            type="button"
            disabled={!conta}
            title={conta ? undefined : t("Selecione um dispositivo para ver as publicações.")}
            onClick={() => setEscolhendo(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar publicação")}
          </button>
        </div>
      )}

      {conta?.plataforma === "instagram" ? (
        <PublicoDoComentario publico={config.publico ?? null} aoMudar={(publico) => aoMudar({ ...config, publico })} />
      ) : null}
      <RepeticaoDoComentario
        repeticao={config.repeticao ?? { modo: "uma_vez" }}
        aoMudar={(repeticao) => aoMudar({ ...config, repeticao })}
      />

      {conta ? (
        <SeletorDePublicacoes
          aberta={escolhendo}
          conta={{ id: conta.id, nome: conta.nome }}
          emUso={emUso}
          totalCaminhos={config.caminhos.length}
          totalPublicacoes={resumo.publicacoes}
          aoFechar={() => setEscolhendo(false)}
          aoConcluir={(novas: PublicacaoDoCaminho[], agrupar) => {
            aoMudar({ ...config, caminhos: caminhosDasPublicacoes(config.caminhos, novas, agrupar) });
            setEscolhendo(false);
          }}
        />
      ) : null}

      <JanelaDeConfirmacao
        aberta={trocandoConta !== null}
        aoFechar={() => setTrocandoConta(null)}
        titulo={t("Trocar a conta do Instagram?")}
        rotuloDoConfirmar={t("Trocar conta e remover caminhos")}
        aoConfirmar={() => {
          if (trocandoConta) aplicarConta(trocandoConta);
          setTrocandoConta(null);
        }}
      >
        <p>{t("As publicações dos caminhos atuais pertencem à conta anterior, então os caminhos serão removidos.")}</p>
      </JanelaDeConfirmacao>
      <JanelaDeConfirmacao
        aberta={trocandoEscopo !== null}
        aoFechar={() => setTrocandoEscopo(null)}
        titulo={t("Trocar as publicações do gatilho?")}
        rotuloDoConfirmar={t("Trocar")}
        aoConfirmar={() => {
          if (trocandoEscopo) aplicarEscopo(trocandoEscopo);
          setTrocandoEscopo(null);
        }}
      >
        <p>{t("Ao salvar, os caminhos por publicação deixam de existir.")}</p>
      </JanelaDeConfirmacao>
    </div>
  );
}
