"use client";
import { useEffect, useRef, useState } from "react";

import { DesenhoDoGrafico } from "@/components/escale/indicadores/graficos/DesenhoDoGrafico";
import { MoedasDiferentes, VazioDoGrafico } from "@/components/escale/indicadores/painel/EstadosDoGrafico";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import { semDados } from "@/lib/escale/indicadores/graficos/dados";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";
import { Loader2, Play } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { IlustracaoDoEditor } from "./IlustracaoDoEditor";

const ALTURA_PADRAO = 400;

type Props = {
  tipo: TipoPrincipal;
  /** A pergunta do último Executar; `null` = nunca executou. */
  foto: Pergunta | null;
  opcoes: OpcoesDoGrafico;
  resultado: Resultado | undefined;
  carregando: boolean;
  erro: unknown;
  aoExecutar: () => void;
};

/** A mensagem do motor para a pessoa (D11): o texto da rota, nunca o erro cru do banco. */
function mensagemDoErro(erro: unknown, generica: string): string {
  if (erro instanceof ApiError) {
    if (erro.status === 504) return erro.message;
    const detalhe = erro.details?.erro;
    if (erro.status === 422 && typeof detalhe === "string") return detalhe;
  }
  return generica;
}

/** A área do gráfico (10-012, 10-036, 10-037, 10-066, 10-067): vazio com "Executar", carregando, erro e a prévia. */
export function AreaDoGrafico({ tipo, foto, opcoes, resultado, carregando, erro, aoExecutar }: Props) {
  const t = useT();
  const caixa = useRef<HTMLDivElement>(null);
  const [altura, setAltura] = useState(ALTURA_PADRAO);

  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(([entrada]) => {
      const h = Math.floor(entrada?.contentRect.height ?? 0);
      if (h > 0) setAltura(h);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  let conteudo;
  if (erro && !resultado) {
    conteudo = (
      <div role="alert" className="flex flex-col items-center gap-1 pt-2 text-center">
        <p className="text-[12px] font-semibold text-casca-texto">{t("Erro ao carregar os dados")}</p>
        <p className="text-[16px] text-casca-texto">{mensagemDoErro(erro, t("Não foi possível carregar os dados."))}</p>
      </div>
    );
  } else if (!foto || !resultado) {
    conteudo = (
      <div className="grid h-full place-items-center">
        <div className="flex max-w-[380px] flex-col items-center gap-3 text-center">
          <IlustracaoDoEditor />
          <p className="text-[13px] text-casca-suave">
            {t("Para visualizar os dados, comece configurando o indicador, a variável e os filtros desejados no painel lateral.")}
          </p>
          {carregando && foto ? (
            <Loader2 size={20} aria-label={t("Carregando...")} className="animate-spin text-casca-marca" />
          ) : (
            <button
              type="button"
              onClick={aoExecutar}
              className="mt-0.5 inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte"
            >
              <Play size={14} aria-hidden />
              {t("Executar")}
            </button>
          )}
        </div>
      </div>
    );
  } else if (resultado.avisos.includes("moedas_diferentes")) {
    conteudo = <MoedasDiferentes />;
  } else if (semDados(resultado) && tipo !== "numero" && tipo !== "painel_de_kpi") {
    conteudo = <VazioDoGrafico altura={altura} comPeriodo />;
  } else {
    conteudo = (
      <DesenhoDoGrafico tipo={tipo} resultado={resultado} pergunta={foto} opcoes={opcoes} altura={altura} />
    );
  }

  return (
    <div ref={caixa} className={cn("relative min-h-0 flex-1 px-6 py-6", carregando && resultado && "opacity-60")}>
      {conteudo}
    </div>
  );
}
