"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { useT } from "@/hooks/i18n/useT";
import type { CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import type { ErroDoRascunho } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import { gravarLargura, lerLargura, LARGURA_MAX, LARGURA_MIN, LARGURA_PADRAO, recortarLargura } from "@/lib/escale/indicadores/editor/preferencias";
import type { RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";

import { AbaOpcoesDoEditor } from "./AbaOpcoesDoEditor";
import { SecaoFiltroDoEditor } from "./SecaoFiltroDoEditor";
import { SecoesDoEditor } from "./SecoesDoEditor";

const PASSO_DO_TECLADO = 16;

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  erroDoCatalogo: boolean;
  aoTentarOCatalogo: () => void;
  erros: readonly ErroDoRascunho[];
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
  etapasDoResultado: ReadonlyArray<{ valor: string; rotulo: string }>;
};

/** A lateral redimensionável (10-012, 10-015): abas Filtros e Opções, largura de 240 a 500 px guardada no navegador. */
export function LateralDoEditor({ rascunho, catalogo, erroDoCatalogo, aoTentarOCatalogo, erros, mudar, etapasDoResultado }: Props) {
  const t = useT();
  const [aba, setAba] = useState<"filtros" | "opcoes">("filtros");
  // A largura guardada só é lida depois de montar (o servidor não a conhece; ler no useState divergiria na hidratação).
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  useEffect(() => {
    setLargura(lerLargura());
  }, []);
  const arrastando = useRef<{ x: number; largura: number } | null>(null);

  const definir = (v: number, gravar: boolean) => {
    const nova = recortarLargura(v);
    setLargura(nova);
    if (gravar) gravarLargura(nova);
  };
  const aoApertar = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastando.current = { x: e.clientX, largura };
  };
  const aoMover = (e: PointerEvent<HTMLDivElement>) => {
    if (arrastando.current) definir(arrastando.current.largura + e.clientX - arrastando.current.x, false);
  };
  const aoSoltar = () => {
    if (arrastando.current) gravarLargura(largura);
    arrastando.current = null;
  };
  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    definir(largura + (e.key === "ArrowRight" ? PASSO_DO_TECLADO : -PASSO_DO_TECLADO), true);
  };

  return (
    <aside style={{ width: largura }} className="relative flex shrink-0 flex-col border-r border-casca-divisoria">
      <div className="px-6 pt-5">
        <AbasDaCasca
          semBorda
          aria-label={t("Configuração do gráfico")}
          valor={aba}
          aoMudar={setAba}
          abas={[
            { valor: "filtros", rotulo: t("Filtros") },
            { valor: "opcoes", rotulo: t("Opções") },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-6">
        {erroDoCatalogo ? (
          <ErroDaLista mensagem={t("Não foi possível consultar os indicadores agora.")} aoTentar={aoTentarOCatalogo} />
        ) : aba === "filtros" ? (
          <>
            <SecoesDoEditor rascunho={rascunho} catalogo={catalogo} erros={erros} mudar={mudar} />
            <SecaoFiltroDoEditor rascunho={rascunho} catalogo={catalogo} erros={erros} mudar={mudar} />
          </>
        ) : (
          <AbaOpcoesDoEditor rascunho={rascunho} catalogo={catalogo} mudar={mudar} etapasDoResultado={etapasDoResultado} />
        )}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("Largura da lateral")}
        aria-valuemin={LARGURA_MIN}
        aria-valuemax={LARGURA_MAX}
        aria-valuenow={largura}
        tabIndex={0}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onKeyDown={aoTeclar}
        className="absolute inset-y-0 -right-[3px] w-1.5 cursor-col-resize touch-none focus-visible:bg-casca-marca-media focus-visible:outline-hidden"
      />
    </aside>
  );
}
