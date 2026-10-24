"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import type { RascunhoDaProspeccao } from "@/lib/escale/prospeccao/assistente";
import { contarMarcadas } from "@/lib/escale/prospeccao/selecao";
import type { DetalheDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Search } from "@/lib/ui/icons-da-casca";

import { Ajuda, CampoDeTexto } from "../campos";
import { EmpresasEncontradas } from "./EmpresasEncontradas";

/**
 * PASSO 2 — ENCONTRE EMPRESAS (D9): antes da busca, o formulário do original;
 * buscando, o aviso; com erro, "Buscar de novo"; concluída, a lista com caixas.
 */
export function PassoEncontre({
  r,
  atualizar,
  detalhe,
  ocupado,
  aoBuscar,
  aoNovaBusca,
  aoMarcar,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  detalhe: DetalheDaProspeccao | null;
  ocupado: boolean;
  aoBuscar: () => void;
  aoNovaBusca: () => void;
  aoMarcar: (ids: string[], selecionada: boolean) => void;
}) {
  const t = useT();
  const cabecalho = (
    <header className="space-y-1">
      <h2 className="text-[18px] font-semibold text-casca-texto">{t("Encontre empresas")}</h2>
      <p className="text-[12px] text-casca-suave">
        {t("A busca traz empresas do Google Maps. Você escolhe quais o agente vai abordar.")}
      </p>
    </header>
  );

  if (!detalhe) {
    return (
      <section className="mx-auto max-w-[640px] space-y-5">
        {cabecalho}
        <CampoDeTexto
          id="busca-nicho"
          rotulo={t("Público ou segmento")}
          valor={r.nicho}
          aoMudar={(nicho) => atualizar({ nicho })}
          placeholder={t("Ex.: clínicas de estética")}
        />
        <CampoDeTexto
          id="busca-local"
          rotulo={t("Cidade ou região")}
          valor={r.local}
          aoMudar={(local) => atualizar({ local })}
          placeholder={t("Ex.: São Paulo, SP")}
        />
        <div className="grid grid-cols-2 gap-4">
          <CampoDeTexto
            id="busca-limite"
            numerico
            rotulo={t("Até quantas empresas")}
            valor={r.limite}
            aoMudar={(limite) => atualizar({ limite })}
          />
          <CampoDeTexto
            id="busca-orcamento"
            numerico
            rotulo={t("Teto da busca (US$)")}
            valor={r.orcamento}
            aoMudar={(orcamento) => atualizar({ orcamento })}
          />
        </div>
        <CaixaDaCasca
          marcada={r.enriquecer}
          aoMudar={(enriquecer) => atualizar({ enriquecer })}
          rotulo={t("Enriquecer com e-mails comerciais e redes encontradas no site")}
        />
        <div className="space-y-2">
          <button
            type="button"
            onClick={aoBuscar}
            disabled={ocupado}
            className="inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
          >
            <Search size={14} aria-hidden />
            {t("Buscar empresas")}
          </button>
          <Ajuda>
            {t(
              "Cada busca cria uma prospecção nova e cobra da sua conta da Apify até o teto informado.",
            )}
          </Ajuda>
        </div>
      </section>
    );
  }

  if (detalhe.linha.situacao === "buscando") {
    return (
      <section className="mx-auto max-w-[640px] space-y-5">
        {cabecalho}
        <p
          role="status"
          className="flex items-center gap-2 rounded-md bg-casca-busca px-4 py-3 text-[12px] text-casca-texto"
        >
          <span
            aria-hidden
            className="size-2 rounded-full bg-casca-marca motion-safe:animate-pulse"
          />
          {t(
            "Buscando empresas no Google Maps. Isso pode levar alguns minutos; você pode sair e voltar pela lista.",
          )}
        </p>
      </section>
    );
  }

  if (detalhe.linha.situacao === "erro_na_busca") {
    return (
      <section className="mx-auto max-w-[640px] space-y-5">
        {cabecalho}
        <p className="text-[12px] text-casca-alerta">
          {detalhe.erro ?? t("A busca não terminou.")}
        </p>
        <button
          type="button"
          onClick={aoNovaBusca}
          className="inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
        >
          {t("Buscar de novo")}
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[760px] space-y-4">
      {cabecalho}
      <p className="text-[12px] text-casca-texto">
        {t("{n} empresas encontradas · {m} marcadas")
          .replace("{n}", numeroBr(detalhe.empresas.filter((e) => e.status === "new").length))
          .replace("{m}", numeroBr(contarMarcadas(detalhe.empresas)))}
      </p>
      {detalhe.repetidas > 0 ? (
        <Ajuda>
          {t("{n} resultados repetidos ou indisponíveis foram desconsiderados.").replace(
            "{n}",
            numeroBr(detalhe.repetidas),
          )}
        </Ajuda>
      ) : null}
      <EmpresasEncontradas empresas={detalhe.empresas} ocupado={ocupado} aoMarcar={aoMarcar} />
    </section>
  );
}
