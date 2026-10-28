"use client";
import { useState } from "react";

import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { DesenhoDoGrafico } from "@/components/escale/indicadores/graficos/DesenhoDoGrafico";
import { useApareceuNaTela } from "@/hooks/escale/useApareceuNaTela";
import { useResultadoDoGrafico } from "@/hooks/escale/useResultadoDoGrafico";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { Role } from "@/lib/auth/types";
import { opcoesComPadrao } from "@/lib/escale/indicadores/graficos/opcoes";
import { alturaUtil, estadoDaData, estadoDoResultado } from "@/lib/escale/indicadores/graficos/regras-do-card";
import {
  LINHAS_DA_TABELA_NO_PAINEL,
  ehTipoPrincipal,
  type GraficoDoPainel,
} from "@/lib/escale/indicadores/graficos/tipos";
import type { Intervalo } from "@/lib/escale/indicadores/painel/preferencias";
import { perguntaSchema, type FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";
import { CalendarDays } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ErroDoGrafico, MoedasDiferentes, VazioDoGrafico } from "./EstadosDoGrafico";
import { MenuDoGrafico } from "./MenuDoGrafico";

const COR_DA_DATA = {
  aplicado: "text-casca-data-aplicada",
  nao_se_aplica: "text-casca-suave",
  fixado: "text-casca-data-fixada",
} as const;
const TEXTO_DA_DATA = {
  aplicado: "Filtro de data aplicado",
  nao_se_aplica: "Filtro de data não se aplica neste gráfico",
  fixado: "Período fixado neste gráfico (ignora o filtro de data do dashboard)",
} as const;

/**
 * O CARD DE UM GRÁFICO (prints 10-006, 10-011, 10-031, 10-033): título, ícones no hover (data e ⋮) e o
 * corpo conforme o estado. Só consulta depois de aparecer 10% na tela; "Recarregar" soma uma rodada.
 */
export function CardDoGrafico({
  grafico,
  filtro,
  rodadaDoPainel,
  intervalo,
  papel,
  painelId,
  total,
}: {
  grafico: GraficoDoPainel;
  filtro: FiltroDoPainel;
  rodadaDoPainel: number;
  intervalo: Intervalo;
  papel: Role;
  painelId: string;
  total: number;
}) {
  const t = useT();
  const { ref, apareceu } = useApareceuNaTela<HTMLDivElement>();
  const [rodadaLocal, setRodadaLocal] = useState(0);
  const lida = perguntaSchema.safeParse(grafico.pergunta);
  const pergunta = lida.success ? lida.data : null;
  const tipo = ehTipoPrincipal(grafico.tipo) ? grafico.tipo : null;
  const consulta = useResultadoDoGrafico({
    graficoId: grafico.id,
    pergunta,
    filtro,
    ligado: apareceu && tipo !== null,
    rodada: rodadaDoPainel + rodadaLocal,
    intervaloMin: intervalo,
    ...(tipo === "tabela" ? { limite: LINHAS_DA_TABELA_NO_PAINEL } : {}),
  });
  const altura = alturaUtil(grafico.layout.h);
  const data = estadoDaData(pergunta);
  const estado = tipo
    ? estadoDoResultado({
        apareceu,
        carregando: consulta.isLoading,
        erro: consulta.isError || pergunta === null ? (consulta.error ?? true) : null,
        resultado: consulta.data,
        tipo,
      })
    : "pronto";
  const opcoes = opcoesComPadrao(grafico.opcoes);

  let corpo;
  if (tipo === null) {
    corpo = <p className="grid h-full place-items-center text-center text-[12px] text-casca-suave">{t("Tipo de gráfico não suportado.")}</p>;
  } else if (estado === "erro") {
    const demorou = consulta.error instanceof ApiError && consulta.error.code === "consulta_demorou";
    corpo = <ErroDoGrafico {...(demorou ? { detalhe: consulta.error?.message } : {})} />;
  } else if (estado === "moedas") {
    corpo = <MoedasDiferentes />;
  } else if (estado === "vazio") {
    corpo = <VazioDoGrafico altura={altura} comPeriodo={Boolean(pergunta?.tempo)} />;
  } else if (estado === "pronto" && consulta.data && pergunta) {
    corpo = <DesenhoDoGrafico tipo={tipo} resultado={consulta.data} pergunta={pergunta} opcoes={opcoes} altura={altura} />;
  } else {
    corpo = null;
  }

  return (
    <div
      ref={ref}
      className="group relative flex h-full flex-col overflow-hidden rounded-[6px] border border-casca-borda bg-surface p-3 shadow-xs"
    >
      {estado === "invisivel" ? null : (
        <>
          <h3
            className="truncate pr-16 text-[12px] leading-[1.3] font-bold text-casca-texto"
            title={grafico.descricao ?? undefined}
          >
            {grafico.nome}
          </h3>
          <div className="absolute top-2.5 right-2 flex items-center gap-1 bg-surface opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <DicaAoPassar texto={t(TEXTO_DA_DATA[data])}>
              <span className={cn("nao-arrasta grid size-5 place-items-center", COR_DA_DATA[data])}>
                <CalendarDays size={14} aria-hidden />
              </span>
            </DicaAoPassar>
            <MenuDoGrafico
              grafico={grafico}
              pergunta={pergunta}
              painelId={painelId}
              papel={papel}
              total={total}
              aoRecarregar={() => setRodadaLocal((n) => n + 1)}
            />
          </div>
          <div className="min-h-0 flex-1 pt-2" style={{ minHeight: Math.min(altura, 40) }}>
            {corpo}
          </div>
        </>
      )}
    </div>
  );
}
