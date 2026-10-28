"use client";
import { useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoChip, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { ROTULO_DO_TIPO_DO_GRAFICO } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";

type Props = {
  tipo: TipoPrincipal;
  limite: number;
  indicadores: readonly string[];
  catalogo: CatalogoDaTela;
  aoConfirmar: (escolhidos: readonly string[]) => void;
  aoCancelar: () => void;
};

/** "Limite de indicadores" (D13, provisório: sem print): escolhe quais indicadores ficam ao trocar para um tipo que aceita menos. */
export function JanelaLimiteDeIndicadores({ tipo, limite, indicadores, catalogo, aoConfirmar, aoCancelar }: Props) {
  const t = useT();
  const [escolhidos, setEscolhidos] = useState<readonly string[]>(() => indicadores.slice(0, limite));

  function alternar(id: string, marcar: boolean) {
    if (!marcar) return setEscolhidos(escolhidos.filter((x) => x !== id));
    // Mais marcações que o limite desligam as mais antigas.
    setEscolhidos([...escolhidos, id].slice(-limite));
  }

  return (
    <JanelaDaCasca aberta onFechar={aoCancelar} className="w-[440px] gap-0 p-0">
      <div className="flex h-12 items-center border-b border-casca-divisoria px-5">
        <DialogTitle className="text-[14px] font-medium text-casca-texto">{t("Limite de indicadores")}</DialogTitle>
      </div>
      <div className="px-5 py-4">
        <p className="text-[13px] text-casca-suave">
          {t("Gráfico do tipo {tipo} aceita apenas {limite} indicador(es). Escolha quais ficam.")
            .replace("{tipo}", t(ROTULO_DO_TIPO_DO_GRAFICO[tipo]))
            .replace("{limite}", String(limite))}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {indicadores.map((id) => (
            <li key={id}>
              <CaixaDaCasca marcada={escolhidos.includes(id)} aoMudar={(m) => alternar(id, m)} rotulo={nomeDoChip(id, catalogo)} />
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-casca-divisoria px-5 py-3">
        <button type="button" onClick={aoCancelar} className="text-[13px] text-casca-texto hover:underline">
          {t("Cancelar")}
        </button>
        <button
          type="button"
          disabled={escolhidos.length === 0}
          onClick={() => aoConfirmar(escolhidos)}
          className="h-8 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:opacity-50"
        >
          {t("Confirmar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
