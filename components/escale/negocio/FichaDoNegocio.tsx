"use client";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useFichaDoNegocio } from "@/hooks/escale/useFichaDoNegocio";
import { useChaveDosRecentes, useNegociosRecentes } from "@/hooks/escale/useNegociosRecentes";
import { useT } from "@/hooks/i18n/useT";
import {
  PARAM_ABA,
  PARAM_ETAPA_DO_PROXIMO,
  abaDaUrl,
  migalhasDoNegocio,
  rotaDoNegocio,
  rotaDoQuadro,
} from "@/lib/escale/negocio/regras";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import { recenteDoLead } from "@/lib/escale/recentes/regras";

import { AbasDaFicha } from "./AbasDaFicha";
import { AcoesDaFicha } from "./AcoesDaFicha";
import { CabecalhoDaFicha } from "./CabecalhoDaFicha";
import { ConteudoDaAba } from "./ConteudoDaAba";
import { ContadorDeNegocios } from "./ContadorDeNegocios";
import { DonoDaFicha } from "./DonoDaFicha";
import { MenuDaFicha } from "./MenuDaFicha";
import { ProximoNegocio } from "./ProximoNegocio";
import { StatusDaFicha } from "./StatusDaFicha";
import { TopoDaFicha } from "./TopoDaFicha";

/**
 * A FICHA DO NEGÓCIO (fork Escale, Fase 1G; C1, C2): a tela própria do negócio,
 * igual à Clint (`/deal/:id`, prints de 17/10). Só existe com a casca nova.
 *
 * A altura é a do quadro da casca (`app/app/pipelines/[id]/_client.tsx`): a
 * ficha cabe na tela, lê a reserva do rodapé, e cada aba rola sozinha.
 */
const ALTURA =
  "flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col overflow-hidden bg-surface md:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]";

export interface FichaDoNegocioProps {
  negocioId: string;
  origem: { id: string; nome: string };
  grupo: string | null;
  /** C7 (PR B): quantos negócios o contato tem, contados no servidor. */
  negociosDoContato: number;
}

export function FichaDoNegocio({
  negocioId,
  origem,
  grupo,
  negociosDoContato,
}: FichaDoNegocioProps) {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const qs = busca.toString();
  const aba = abaDaUrl(busca.get(PARAM_ABA));
  const ficha = useFichaDoNegocio(negocioId, origem.id, busca);
  const { registrar } = useNegociosRecentes(useChaveDosRecentes());
  const registrado = useRef<string | null>(null);
  const lead = ficha.estado === "pronto" ? ficha.lead : null;

  // Fase 1E (Recentes): o negócio aberto entra nos Recentes, também quando chega pelo endereço.
  useEffect(() => {
    if (!lead || registrado.current === lead.id) return;
    registrado.current = lead.id;
    registrar(recenteDoLead(lead, origem.nome));
  }, [lead, origem.nome, registrar]);

  if (ficha.estado === "carregando" || ficha.estado === "erro") {
    return (
      <div className={ALTURA}>
        <p className="m-auto text-sm text-casca-suave">
          {ficha.estado === "carregando"
            ? t("Carregando…")
            : t("Não consegui carregar este negócio.")}
        </p>
      </div>
    );
  }
  if (ficha.estado === "sumiu") {
    return (
      <div className={ALTURA}>
        <div className="m-auto flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] font-semibold text-casca-texto">
            {t("Esse negócio não existe ou foi removido")}
          </p>
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            onClick={() => router.push(rotaDoQuadro(origem.id, qs))}
          >
            {t("Voltar")}
          </BotaoDaCasca>
        </div>
      </div>
    );
  }

  const migalhas = migalhasDoNegocio({ grupo, origem, negocio: tituloDoCard(ficha.lead), qs });
  return (
    <div className={ALTURA} data-ficha-do-negocio={ficha.lead.id}>
      <TopoDaFicha
        migalhas={migalhas}
        // C8: o próximo negócio da etapa, na ordem e nos filtros do quadro.
        direita={
          <ProximoNegocio
            lead={ficha.lead}
            etapas={ficha.stages}
            leads={ficha.leadsDoRecorte}
            ordem={ficha.ordem}
            aba={aba}
          />
        }
      />
      <CabecalhoDaFicha
        lead={ficha.lead}
        pipelineId={ficha.pipeline.id}
        // C7, C4, C5 e C6, na ordem da Clint (01-017 e print 01).
        direita={
          <>
            <ContadorDeNegocios total={negociosDoContato} contatoId={ficha.lead.contact_id} />
            <StatusDaFicha
              key={`status-${ficha.lead.id}`}
              lead={ficha.lead}
              stages={ficha.stages}
              pipelineId={origem.id}
            />
            <DonoDaFicha key={`dono-${ficha.lead.id}`} lead={ficha.lead} pipelineId={origem.id} />
            <MenuDaFicha
              lead={ficha.lead}
              pipelineId={origem.id}
              stages={ficha.stages}
              // O aviso de "já tem negócio aberto" olha o funil inteiro, como o quadro.
              leads={ficha.leadsDoQuadro}
            />
          </>
        }
      />
      {/* C3: as ações rápidas e as tags. */}
      <AcoesDaFicha lead={ficha.lead} pipelineId={ficha.pipeline.id} />
      <AbasDaFicha
        valor={aba}
        // FORK ESCALE · Fase 1G: trocar de aba só muda a URL (sem ir ao servidor).
        aoMudar={(nova) =>
          window.history.replaceState(
            null,
            "",
            rotaDoNegocio(ficha.lead.id, qs, {
              aba: nova,
              etapa: busca.get(PARAM_ETAPA_DO_PROXIMO),
            }),
          )
        }
      />
      <div
        role="tabpanel"
        id="painel-da-aba"
        aria-labelledby={`aba-${aba}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <ConteudoDaAba key={ficha.lead.id} aba={aba} ficha={ficha} />
      </div>
    </div>
  );
}
