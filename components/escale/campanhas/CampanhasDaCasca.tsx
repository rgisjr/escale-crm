"use client";
import { useRouter } from "next/navigation";

import { AcoesDaProspeccao } from "@/components/escale/prospeccao/AcoesDaProspeccao";
import { ListaDeProspeccoes } from "@/components/escale/prospeccao/ListaDeProspeccoes";
// FORK ESCALE · Fase 8C: a janela do detalhe sobre a lista.
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import type { Role } from "@/lib/auth/types";
import {
  ROTA_DAS_CAMPANHAS,
  abasVisiveis,
  rotaDaAba,
  type AbaDasCampanhas,
} from "@/lib/escale/campanhas/rotas";

import { AbasDasCampanhas } from "./AbasDasCampanhas";
import { CabecalhoDasCampanhas } from "./CabecalhoDasCampanhas";
import { DetalheDaCampanhaDaCasca } from "./detalhe/DetalheDaCampanhaDaCasca";
import { ListaDeCampanhasDaCasca } from "./ListaDeCampanhasDaCasca";

/**
 * CAMPANHAS NA CASCA (fork Escale, Fase 8A; 002; N2): o cabeçalho, as abas
 * (Prospecção só para admin; com uma aba só, a faixa some) e o conteúdo da aba.
 * A Prospecção é a aba da 8D (lista, assistente e detalhe no molde da Clint).
 */
export function CampanhasDaCasca({
  papel,
  organizacaoId,
  aba,
  fuso,
  campanhaAberta = null,
  origens = [],
}: {
  papel: Role;
  organizacaoId: string;
  aba: AbaDasCampanhas;
  fuso?: string;
  campanhaAberta?: string | null;
  origens?: OrigemParaCriar[];
}) {
  const router = useRouter();
  const abas = abasVisiveis(papel);
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <CabecalhoDasCampanhas
        aba={aba}
        acoes={aba === "prospeccao" ? <AcoesDaProspeccao /> : undefined}
      />
      {abas.length > 1 ? (
        <AbasDasCampanhas abas={abas} valor={aba} aoMudar={(a) => router.push(rotaDaAba(a))} />
      ) : null}
      {aba === "prospeccao" ? (
        <ListaDeProspeccoes fuso={fuso} />
      ) : (
        <ListaDeCampanhasDaCasca
          organizacaoId={organizacaoId}
          fuso={fuso}
          reconsultar={!campanhaAberta}
        />
      )}
      {aba === "whatsapp" && campanhaAberta ? (
        <DetalheDaCampanhaDaCasca
          id={campanhaAberta}
          origens={origens}
          fuso={fuso}
          aoFechar={() => router.replace(ROTA_DAS_CAMPANHAS, { scroll: false })}
        />
      ) : null}
    </div>
  );
}
