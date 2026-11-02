"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";
import type { PlataformaDeComentario } from "@/lib/escale/comentarios/constantes";

import { EstadoDaCaixa, type TipoDeEstado } from "./EstadosDaCaixa";
import { LinhaDaPublicacao } from "./LinhaDaPublicacao";

const LINHAS_DE_ESQUELETO = 3;

/**
 * FORK ESCALE · Fase 10A (4.2): as linhas da lista de publicações, o "Carregar mais" e os estados.
 * Não busca nada: recebe o resultado da consulta de quem a monta (`TelaDeComentarios`).
 */
export function ListaDePublicacoes({
  publicacoes,
  plataforma,
  estado,
  carregando,
  temMais,
  carregandoMais,
  aoCarregarMais,
  aoTentar,
  selecionadaId,
  aoSelecionar,
  agora,
}: {
  publicacoes: PublicacaoDaCaixa[];
  plataforma: PlataformaDeComentario;
  /** Quando há um estado (sem lista), ele ocupa a coluna. */
  estado: TipoDeEstado | null;
  carregando: boolean;
  temMais: boolean;
  carregandoMais: boolean;
  aoCarregarMais: () => void;
  aoTentar: () => void;
  selecionadaId: string | null;
  aoSelecionar: (id: string) => void;
  agora: Date;
}) {
  const t = useT();
  if (estado) return <EstadoDaCaixa tipo={estado} aoTentar={aoTentar} />;
  if (carregando) {
    return (
      <div className="flex-1" aria-busy="true" aria-label={t("Carregando")}>
        {Array.from({ length: LINHAS_DE_ESQUELETO }, (_, i) => (
          <div key={i} className="flex h-[88px] items-center gap-3 border-b border-casca-borda px-4">
            <span className="size-14 animate-pulse rounded-lg bg-casca-raia" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-3.5 w-3/4 animate-pulse rounded bg-casca-raia" />
              <span className="h-3 w-1/3 animate-pulse rounded bg-casca-raia" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {publicacoes.map((p) => (
        <LinhaDaPublicacao
          key={p.id}
          publicacao={p}
          plataforma={plataforma}
          selecionada={p.id === selecionadaId}
          aoSelecionar={aoSelecionar}
          agora={agora}
        />
      ))}
      {temMais ? (
        <div className="p-4">
          <BotaoDaCasca variante="texto" className="w-full" disabled={carregandoMais} onClick={aoCarregarMais}>
            {t("Carregar mais")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </div>
  );
}
