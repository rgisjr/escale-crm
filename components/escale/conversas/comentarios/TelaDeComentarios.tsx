"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { VazioDaCasca } from "@/components/escale/conversas/centro/VazioDaCasca";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/auth/AuthProvider";
import {
  codigoDoErro,
  useComentariosDaPublicacao,
  useContasDaCaixa,
  usePublicacoesDaCaixa,
} from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import type { ComentarioDaCaixa, PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";
import type { OrdemDaCaixa, PeriodoDaCaixa } from "@/lib/escale/comentarios/constantes";
import { useTelaExtraGrande } from "@/lib/escale/usa-tela-grande";
import { MessagesSquare } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BarraDaCaixa } from "./BarraDaCaixa";
import { ComentariosDaPublicacao } from "./ComentariosDaPublicacao";
import type { TipoDeEstado } from "./EstadosDaCaixa";
import { ListaDePublicacoes } from "./ListaDePublicacoes";
import { PainelDoComentario } from "./PainelDoComentario";

const PERIODO_PADRAO: PeriodoDaCaixa = "30d";
const ORDEM_PADRAO: OrdemDaCaixa = "recentes";

const chaveDaConta = (orgId: string | undefined): string => `escale-comentarios:conta:${orgId ?? ""}`;

/** A última conta usada (por organização). Nunca lança: o armazenamento pode estar bloqueado. */
function lerContaLembrada(orgId: string | undefined): string | null {
  try {
    return window.localStorage.getItem(chaveDaConta(orgId));
  } catch {
    return null;
  }
}
function lembrarConta(orgId: string | undefined, id: string): void {
  try {
    window.localStorage.setItem(chaveDaConta(orgId), id);
  } catch {
    // Só uma conveniência.
  }
}

const achar = (lista: readonly ComentarioDaCaixa[], id: string | null): ComentarioDaCaixa | null =>
  id ? (lista.flatMap((c) => [c, ...c.respostas]).find((c) => c.id === id) ?? null) : null;

/**
 * FORK ESCALE · Fase 10A (D1–D4): a caixa de comentários do Instagram e do Facebook em Atendimento.
 * Três colunas como Conversas — publicações, comentários, quem comentou. O estado fica na URL:
 * `?conta=<canal>&p=<publicação>&c=<comentário>`. Molde provisório (a Clint não tem esta tela).
 */
export function TelaDeComentarios() {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const { activeOrg } = useAuth();
  const telaXl = useTelaExtraGrande();
  const [periodo, setPeriodo] = useState<PeriodoDaCaixa>(PERIODO_PADRAO);
  const [ordem, setOrdem] = useState<OrdemDaCaixa>(ORDEM_PADRAO);
  const [lembrada] = useState(() => lerContaLembrada(activeOrg?.orgId));

  const contasQ = useContasDaCaixa();
  const contas = useMemo(() => contasQ.data ?? [], [contasQ.data]);
  const contaDaUrl = busca.get("conta");
  const conta = contas.find((c) => c.id === contaDaUrl) ?? contas.find((c) => c.id === lembrada) ?? contas[0] ?? null;
  const publicacaoId = busca.get("p");
  const comentarioId = busca.get("c");

  const publicacoesQ = usePublicacoesDaCaixa(conta?.conectada ? conta.id : null, { periodo, ordem });
  const publicacoes = useMemo(() => publicacoesQ.data?.pages.flatMap((p) => p.publicacoes) ?? [], [publicacoesQ.data]);
  const publicacao: PublicacaoDaCaixa | null = publicacaoId
    ? (publicacoes.find((p) => p.id === publicacaoId) ?? {
        id: publicacaoId,
        legenda: null,
        miniatura: null,
        link: null,
        tipo: null,
        publicadaEm: null,
        ultimoComentarioEm: null,
        comentarios: null,
        semResposta: null,
      })
    : null;

  const comentariosQ = useComentariosDaPublicacao(conta?.conectada ? conta.id : null, publicacaoId);
  const comentarios = useMemo(() => comentariosQ.data?.pages.flatMap((p) => p.comentarios) ?? [], [comentariosQ.data]);
  const escolhido = achar(comentarios, comentarioId);
  const agora = useMemo(() => new Date(), [publicacoesQ.dataUpdatedAt, comentariosQ.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudarUrl = useCallback(
    (mudancas: Record<string, string | null>) => {
      const params = new URLSearchParams(busca.toString());
      for (const [k, v] of Object.entries(mudancas)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      const texto = params.toString();
      router.replace(`/app/inbox/comentarios${texto ? `?${texto}` : ""}`);
    },
    [busca, router],
  );

  let estado: TipoDeEstado | null = null;
  if (!contasQ.isLoading && contas.length === 0) estado = "sem_conta";
  else if (conta && !conta.conectada) estado = "desconectada";
  else if (publicacoesQ.isError) {
    const codigo = codigoDoErro(publicacoesQ.error);
    estado = codigo === "conta_desconectada" ? "desconectada" : codigo === "acesso_recusado" ? "acesso_recusado" : "erro";
  } else if (conta && !publicacoesQ.isLoading && publicacoes.length === 0) estado = "vazio";

  const lista = (
    <div className={cn("flex min-h-0 flex-col border-r border-casca-borda bg-white", publicacaoId && "hidden md:flex")}>
      {contas.length > 0 && conta ? (
        <BarraDaCaixa
          contas={contas}
          conta={conta.id}
          aoMudarConta={(id) => {
            lembrarConta(activeOrg?.orgId, id);
            mudarUrl({ conta: id, p: null, c: null });
          }}
          periodo={periodo}
          aoMudarPeriodo={setPeriodo}
          ordem={ordem}
          aoMudarOrdem={setOrdem}
          aoMudarAba={(a) => a === "conversas" && router.push("/app/inbox")}
        />
      ) : null}
      <ListaDePublicacoes
        publicacoes={publicacoes}
        plataforma={conta?.plataforma ?? "instagram"}
        estado={estado}
        carregando={contasQ.isLoading || (conta !== null && publicacoesQ.isLoading)}
        temMais={publicacoesQ.hasNextPage ?? false}
        carregandoMais={publicacoesQ.isFetchingNextPage}
        aoCarregarMais={() => void publicacoesQ.fetchNextPage()}
        aoTentar={() => void publicacoesQ.refetch()}
        selecionadaId={publicacaoId}
        aoSelecionar={(id) => mudarUrl({ conta: conta?.id ?? null, p: id, c: null })}
        agora={agora}
      />
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] flex-col sm:-mx-6 sm:-mt-6 sm:h-[calc(100dvh-2.75rem-max(var(--space-6),var(--rodape-ocupado,0px)))]">
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)_425px]">
          {lista}
          {conta && publicacao ? (
            <ComentariosDaPublicacao
              key={`${conta.id}:${publicacao.id}`}
              conta={conta}
              publicacao={publicacao}
              comentarios={comentarios}
              carregando={comentariosQ.isLoading}
              comErro={comentariosQ.isError}
              temMais={comentariosQ.hasNextPage ?? false}
              carregandoMais={comentariosQ.isFetchingNextPage}
              aoCarregarMais={() => void comentariosQ.fetchNextPage()}
              atualizando={comentariosQ.isFetching}
              aoAtualizar={() => void comentariosQ.refetch()}
              escolhidoId={comentarioId}
              aoEscolher={(c) => mudarUrl({ c: c.id })}
              agora={agora}
            />
          ) : (
            <div className={cn("flex min-w-0 items-center justify-center bg-white", !publicacaoId && "hidden md:flex")}>
              <VazioDaCasca icone={MessagesSquare} titulo={t("Escolha uma publicação para ver os comentários.")} />
            </div>
          )}
          {telaXl && conta ? <PainelDoComentario conta={conta} publicacao={publicacao} comentario={escolhido} /> : null}
        </div>
      </div>
    </TooltipProvider>
  );
}
