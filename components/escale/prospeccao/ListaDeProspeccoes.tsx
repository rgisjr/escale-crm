"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import {
  useAcaoDaProspeccao,
  useListaDeProspeccoes,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import { temFiltroDaProspeccao } from "@/lib/escale/prospeccao/filtros";
import { rotaDaCopiaDaProspeccao, rotaDoRascunhoDaProspeccao } from "@/lib/escale/prospeccao/rotas";
import type { FiltrosDaProspeccao, LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";

import { BarraDeFiltrosDaProspeccao } from "./BarraDeFiltrosDaProspeccao";
import { DetalheDaProspeccao } from "./detalhe/DetalheDaProspeccao";
import { TabelaDeProspeccoes } from "./TabelaDeProspeccoes";
import { VazioSemChave, VazioSemProspeccoes } from "./VaziosDaProspeccao";

/**
 * A ABA PROSPECÇÃO (fork Escale, Fase 8D; D6–D8, D11): sem chave, o vazio da
 * chave; sem nenhuma prospecção, o vazio; senão filtros, tabela, paginação e a
 * janela de detalhe. Rascunho reabre o assistente; duplicar abre a cópia.
 */
export function ListaDeProspeccoes({ fuso }: { fuso?: string }) {
  const t = useT();
  const router = useRouter();
  const [filtros, setFiltros] = useState<FiltrosDaProspeccao>({});
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);
  const [aberta, setAberta] = useState<string | null>(null);
  const opcoes = useOpcoesDaProspeccao();
  const lista = useListaDeProspeccoes(filtros, pagina, porPagina);
  const acao = useAcaoDaProspeccao();
  const filtrando = temFiltroDaProspeccao(filtros);
  const total = lista.data?.total ?? 0;

  const mudarFiltros = useCallback((f: FiltrosDaProspeccao) => {
    setFiltros(f);
    setPagina(1);
  }, []);

  if (opcoes.data && !opcoes.data.configurada) return <VazioSemChave />;
  if (!filtrando && !lista.isLoading && !lista.isError && lista.data && total === 0)
    return <VazioSemProspeccoes />;

  const nomeDoNumero = (id: string | null) =>
    opcoes.data?.numeros.find((n) => n.id === id)?.nome ?? "—";

  async function pausarOuRetomar(l: LinhaDeProspeccao, action: "pause" | "resume") {
    try {
      await acao.mutateAsync({ action, id: l.id });
      toast.success(
        action === "pause" ? t("Novas abordagens pausadas.") : t("Prospecção retomada."),
      );
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."),
      );
    }
  }

  const variaveis = acao.variables as { id?: string } | undefined;

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 pt-4 pb-3">
        <BarraDeFiltrosDaProspeccao filtros={filtros} aoMudar={mudarFiltros} />
      </div>
      <TabelaDeProspeccoes
        linhas={lista.data?.linhas ?? []}
        carregando={lista.isLoading}
        erro={lista.isError}
        filtrando={filtrando}
        fuso={fuso}
        ocupadoId={acao.isPending ? (variaveis?.id ?? null) : null}
        nomeDoNumero={nomeDoNumero}
        aoAbrir={(l) =>
          l.situacao === "rascunho"
            ? router.push(rotaDoRascunhoDaProspeccao(l.id))
            : setAberta(l.id)
        }
        aoPausar={(l) => void pausarOuRetomar(l, "pause")}
        aoRetomar={(l) => void pausarOuRetomar(l, "resume")}
        aoDuplicar={(l) => router.push(rotaDaCopiaDaProspeccao(l.id))}
        aoLimparFiltros={() => mudarFiltros({})}
        aoTentarDeNovo={() => void lista.refetch()}
      />
      {total > POR_PAGINA_PADRAO ? (
        <footer className="shrink-0 border-t border-casca-divisoria px-6">
          <PaginacaoDaCasca
            pagina={pagina}
            total={total}
            porPagina={porPagina}
            opcoesPorPagina={POR_PAGINA}
            aoMudarPagina={setPagina}
            aoMudarPorPagina={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
          />
        </footer>
      ) : null}
      {aberta ? (
        <DetalheDaProspeccao id={aberta} aoFechar={() => setAberta(null)} fuso={fuso} />
      ) : null}
    </div>
  );
}
