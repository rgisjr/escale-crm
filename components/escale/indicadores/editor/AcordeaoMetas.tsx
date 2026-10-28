"use client";
import { useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoChip, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { textoDoNumeroBr } from "@/lib/escale/indicadores/editor/operadores";
import { mudarOpcoes, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import { suportaMetas } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import { corDaMeta } from "@/lib/escale/indicadores/graficos/cores";
import type { MetaDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import { Eye, EyeOff, Target } from "@/lib/ui/icons-da-casca";

import { Acordeao } from "./AcordeaoDaAba";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
};

const SEM_CATALOGO: CatalogoDaTela = { assuntos: [], camposPersonalizados: { negocio: [], contato: [], empresa: [] } };

function CampoDaMeta({ valor, aoMudar, desligada }: { valor: number | null; aoMudar: (v: number | null) => void; desligada: boolean }) {
  const t = useT();
  const [texto, setTexto] = useState(valor === null ? "" : String(valor).replace(".", ","));
  return (
    <input
      inputMode="decimal"
      aria-label={t("Meta")}
      disabled={desligada}
      value={desligada && !texto ? "0" : texto}
      placeholder="0"
      onChange={(e) => {
        setTexto(e.target.value);
        aoMudar(e.target.value.trim() === "" ? null : textoDoNumeroBr(e.target.value));
      }}
      className="h-8 w-24 rounded-[4px] border border-casca-borda bg-surface px-2 text-[13px] text-casca-texto outline-none focus-visible:border-casca-marca disabled:opacity-50"
    />
  );
}

/** "Metas" (prints 10-039, 10-040): interruptor no cabeçalho e, por indicador, bolinha, nome, valor da meta e o olho. */
export function AcordeaoMetas({ rascunho, catalogo, mudar }: Props) {
  const t = useT();
  const cat = catalogo ?? SEM_CATALOGO;
  const suporta = suportaMetas(rascunho.tipo);
  const { ligadas, itens } = rascunho.opcoes.metas;
  const alvos = [
    ...rascunho.indicadores.map((id) => ({ id, nome: nomeDoChip(id, cat) })),
    ...rascunho.calculados.map((c) => ({ id: c.id, nome: c.nome })),
  ];
  const doIndicador = (id: string): MetaDoGrafico => itens.find((m) => m.indicador === id) ?? { indicador: id, valor: 0, visivel: true };
  const gravar = (id: string, mudanca: Partial<MetaDoGrafico>) =>
    mudar((r) =>
      mudarOpcoes(r, (o) => {
        const existente = o.metas.itens.some((m) => m.indicador === id);
        const base = { indicador: id, valor: 0, visivel: true, ...o.metas.itens.find((m) => m.indicador === id), ...mudanca };
        const proximos = existente ? o.metas.itens.map((m) => (m.indicador === id ? base : m)) : [...o.metas.itens, base];
        return { ...o, metas: { ...o.metas, itens: proximos } };
      }),
    );

  return (
    <Acordeao
      titulo={t("Metas")}
      Icone={Target}
      acao={
        <InterruptorDaCasca
          aria-label={t("Metas")}
          ligado={suporta && ligadas}
          desabilitado={!suporta}
          aoMudar={(v) => mudar((r) => mudarOpcoes(r, (o) => ({ ...o, metas: { ...o.metas, ligadas: v } })))}
        />
      }
    >
      {!suporta ? (
        <p className="text-[12px] text-casca-suave">{t("Este tipo de gráfico não suporta metas")}</p>
      ) : alvos.length === 0 ? (
        <p className="text-[12px] text-casca-suave">{t("Nenhum indicador selecionado")}</p>
      ) : (
        alvos.map((a, i) => {
          const meta = doIndicador(a.id);
          return (
            <div key={a.id} className="flex items-center gap-3" style={{ opacity: ligadas ? 1 : 0.55 }}>
              <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: corDaMeta(i) }} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-casca-texto">{a.nome}</span>
              <CampoDaMeta valor={meta.valor || null} desligada={!ligadas} aoMudar={(v) => gravar(a.id, { valor: v ?? 0 })} />
              <button
                type="button"
                disabled={!ligadas}
                aria-label={meta.visivel ? t("Ocultar meta") : t("Mostrar meta")}
                onClick={() => gravar(a.id, { visivel: !meta.visivel })}
                className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
              >
                {meta.visivel ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
              </button>
            </div>
          );
        })
      )}
    </Acordeao>
  );
}
