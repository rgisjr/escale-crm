"use client";
import { useRouter } from "next/navigation";

import { ProspectingClient } from "@/app/app/prospecting/_client";
import type { Role } from "@/lib/auth/types";
import { abasVisiveis, rotaDaAba, type AbaDasCampanhas } from "@/lib/escale/campanhas/rotas";

import { AbasDasCampanhas } from "./AbasDasCampanhas";
import { CabecalhoDasCampanhas } from "./CabecalhoDasCampanhas";
import { ListaDeCampanhasDaCasca } from "./ListaDeCampanhasDaCasca";

/**
 * CAMPANHAS NA CASCA (fork Escale, Fase 8A; 002; N2): o cabeçalho, as abas
 * (Prospecção só para admin; com uma aba só, a faixa some) e o conteúdo da aba.
 * A Prospecção mostra a tela do original até a 8D.
 */
export function CampanhasDaCasca({
  papel,
  organizacaoId,
  aba,
  fuso,
}: {
  papel: Role;
  organizacaoId: string;
  aba: AbaDasCampanhas;
  fuso?: string;
}) {
  const router = useRouter();
  const abas = abasVisiveis(papel);
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <CabecalhoDasCampanhas aba={aba} />
      {abas.length > 1 ? (
        <AbasDasCampanhas abas={abas} valor={aba} aoMudar={(a) => router.push(rotaDaAba(a))} />
      ) : null}
      {aba === "prospeccao" ? (
        <ProspectingClient />
      ) : (
        <ListaDeCampanhasDaCasca organizacaoId={organizacaoId} fuso={fuso} />
      )}
    </div>
  );
}
