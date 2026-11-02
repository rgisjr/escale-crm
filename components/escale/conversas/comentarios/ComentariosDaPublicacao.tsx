"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { VazioDaCasca } from "@/components/escale/conversas/centro/VazioDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import {
  useApagarComentario,
  useDirectDoComentario,
  useCurtirComentario,
  useOcultarComentario,
  useResponderComentario,
} from "@/hooks/escale/useAcoesNoComentario";
import { type ContaParaACaixa } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import { filtrarComentarios, type ComentarioDaCaixa, type PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";
import type { FiltroDosComentarios as Filtro } from "@/lib/escale/comentarios/constantes";
import { MessagesSquare, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecalhoDaPublicacao } from "./CabecalhoDaPublicacao";
import { CompositorDoComentario, type ModoDoCompositor } from "./CompositorDoComentario";
import { FiltroDosComentarios } from "./FiltroDosComentarios";
import { ItemDoComentario } from "./ItemDoComentario";

const porData = (a: ComentarioDaCaixa, b: ComentarioDaCaixa): number => Date.parse(a.comentadoEm) - Date.parse(b.comentadoEm);

/** Os de outras pessoas, de primeiro nível, sem resposta da conta (D5), no que foi carregado. */
const contarSemResposta = (lista: readonly ComentarioDaCaixa[]): number =>
  lista.filter((c) => !c.autor.daPropriaConta && !c.respondido).length;

/**
 * FORK ESCALE · Fase 10A (4.3): o centro da caixa — o cabeçalho da publicação, o filtro, os comentários
 * em ordem de data crescente (como uma conversa), o compositor e a confirmação de apagar.
 */
export function ComentariosDaPublicacao({
  conta,
  publicacao,
  comentarios,
  carregando,
  comErro,
  temMais,
  carregandoMais,
  aoCarregarMais,
  atualizando,
  aoAtualizar,
  escolhidoId,
  aoEscolher,
  agora,
}: {
  conta: ContaParaACaixa;
  publicacao: PublicacaoDaCaixa;
  comentarios: ComentarioDaCaixa[];
  carregando: boolean;
  comErro: boolean;
  temMais: boolean;
  carregandoMais: boolean;
  aoCarregarMais: () => void;
  atualizando: boolean;
  aoAtualizar: () => void;
  escolhidoId: string | null;
  aoEscolher: (c: ComentarioDaCaixa) => void;
  agora: Date;
}) {
  const t = useT();
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [alvo, setAlvo] = useState<{ comentario: ComentarioDaCaixa; modo: ModoDoCompositor } | null>(null);
  const [modo, setModo] = useState<ModoDoCompositor>("responder");
  const [apagando, setApagando] = useState<ComentarioDaCaixa | null>(null);

  const responder = useResponderComentario(conta.id, publicacao.id);
  const direct = useDirectDoComentario(conta.id, publicacao.id);
  const ocultar = useOcultarComentario(conta.id, publicacao.id);
  const curtir = useCurtirComentario(conta.id, publicacao.id);
  const apagar = useApagarComentario(conta.id, publicacao.id);

  const visiveis = useMemo(() => [...filtrarComentarios(comentarios, filtro, busca)].sort(porData), [comentarios, filtro, busca]);
  const semResposta = publicacao.semResposta ?? contarSemResposta(comentarios);
  // O alvo guarda o comentário de quando foi escolhido; o estado vivo (direct já usado, oculto) vem da lista.
  const alvoVivo = useMemo(() => {
    if (!alvo) return null;
    const todos = comentarios.flatMap((c) => [c, ...c.respostas]);
    return todos.find((c) => c.id === alvo.comentario.id) ?? alvo.comentario;
  }, [alvo, comentarios]);

  const enviar = async (m: ModoDoCompositor, texto: string): Promise<void> => {
    if (!alvoVivo) return;
    try {
      if (m === "responder") {
        await responder.mutateAsync({ comentario: alvoVivo, texto });
        toast.success(t("Resposta publicada."));
      } else {
        const r = await direct.mutateAsync({ comentario: alvoVivo, texto });
        toast.success(t("Direct enviado."), {
          ...(r.conversationId
            ? { action: { label: t("Abrir conversa"), onClick: () => router.push(`/app/inbox?id=${r.conversationId}`) } }
            : {}),
        });
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : t("Erro ao carregar os comentários."));
      throw erro;
    }
  };

  const mirar = (c: ComentarioDaCaixa, m: ModoDoCompositor) => {
    setAlvo({ comentario: c, modo: m });
    setModo(m);
    aoEscolher(c);
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white" aria-label={t("Comentários")}>
      <CabecalhoDaPublicacao
        publicacao={publicacao}
        plataforma={conta.plataforma}
        semResposta={semResposta}
        atualizando={atualizando}
        aoAtualizar={aoAtualizar}
      />
      <FiltroDosComentarios busca={busca} aoBuscar={setBusca} filtro={filtro} aoMudarFiltro={setFiltro} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {carregando ? (
          <p className="text-[14px] text-casca-suave" aria-busy="true">
            {t("Carregando")}
          </p>
        ) : comErro ? (
          <VazioDaCasca
            icone={MessagesSquare}
            titulo={t("Erro ao carregar os comentários.")}
            acao={
              <button type="button" onClick={aoAtualizar} className="text-[13px] font-medium text-casca-marca-forte hover:underline">
                {t("Tentar novamente")}
              </button>
            }
          />
        ) : (
          <>
            {temMais ? (
              <BotaoDaCasca variante="texto" className="w-full" disabled={carregandoMais} onClick={aoCarregarMais}>
                {t("Carregar mais")}
              </BotaoDaCasca>
            ) : null}
            {visiveis.length === 0 ? (
              <VazioDaCasca
                icone={MessagesSquare}
                titulo={comentarios.length === 0 ? t("Nenhuma publicação com comentários no período.") : t("Nenhum comentário corresponde ao filtro.")}
                acao={
                  comentarios.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFiltro("todos");
                        setBusca("");
                      }}
                      className="text-[13px] font-medium text-casca-marca-forte hover:underline"
                    >
                      {t("Limpar filtro")}
                    </button>
                  ) : undefined
                }
              />
            ) : (
              visiveis.map((c) => (
                <ItemDoComentario
                  key={c.id}
                  comentario={c}
                  conta={conta}
                  escolhido={c.id === escolhidoId}
                  escolhidoId={escolhidoId}
                  nivel={0}
                  agora={agora}
                  aoEscolher={aoEscolher}
                  aoResponder={(x) => mirar(x, "responder")}
                  aoMandarDirect={(x) => mirar(x, "direct")}
                  aoOcultar={(x, o) => ocultar.mutate({ comentario: x, ocultar: o })}
                  aoCurtir={(x, c) => curtir.mutateAsync({ comentario: x, curtir: c })}
                  aoApagar={setApagando}
                />
              ))
            )}
          </>
        )}
      </div>
      <CompositorDoComentario
        alvo={alvoVivo}
        modo={modo}
        aoMudarModo={setModo}
        aoCancelar={() => setAlvo(null)}
        aoEnviar={enviar}
      />
      <JanelaDeConfirmacao
        aberta={apagando !== null}
        aoFechar={() => setApagando(null)}
        titulo={t("Apagar comentário?")}
        rotuloDoConfirmar={t("Apagar")}
        iconeDoConfirmar={<Trash2 size={14} aria-hidden className="ml-1.5" />}
        perigo
        ocupado={apagar.isPending}
        aoConfirmar={() => {
          const alvoDaExclusao = apagando;
          if (!alvoDaExclusao) return;
          apagar.mutate({ comentario: alvoDaExclusao }, { onSettled: () => setApagando(null) });
        }}
      >
        <p className="text-[13px]">{t("O comentário some do Instagram para todos. Não dá para desfazer.")}</p>
      </JanelaDeConfirmacao>
    </section>
  );
}
