"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { contarPorGatilho, limparGatilho } from "@/lib/escale/filtros/gatilhos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";

import { GatilhoComPainel } from "./GatilhoComPainel";
import { SecaoCampos } from "./SecaoCampos";
import { SecaoConversas } from "./SecaoConversas";
import { SecaoDono } from "./SecaoDono";
import { SecaoNegocio } from "./SecaoNegocio";
import { SecaoOutros } from "./SecaoOutros";
import { SecaoTags } from "./SecaoTags";

/**
 * CAMPOS, TAGS, DONO DO NEGÓCIO E MAIS FILTROS (fork Escale, Casca V4): quatro dos
 * seis gatilhos da barra da Clint (print da barra de 15/10). O conteúdo aberto de
 * cada um não tem print na variante superior (PRINTS 25 a 29): é a lógica da 1D
 * com o visual da casca. "Mais filtros" junta Conversas, Negócio (valor,
 * atrasados, perda) e Outros (atividades e tempo).
 */
type Base = { filtros: FiltrosDoQuadro; onMudar: (filtros: FiltrosDoQuadro) => void };

const LARGO = "w-[min(26rem,calc(100vw-2rem))]";

export function GatilhoDeCampos({
  filtros,
  onMudar,
  campos,
}: Base & { campos: readonly CampoFiltravel[] }) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Campos")}
      contagem={contarPorGatilho(filtros).campos}
      onLimpar={() => onMudar(limparGatilho(filtros, "campos"))}
      className={LARGO}
    >
      <SecaoCampos filtros={filtros} onMudar={onMudar} campos={campos} />
    </GatilhoComPainel>
  );
}

export function GatilhoDeTags({ filtros, onMudar, leads }: Base & { leads: readonly Lead[] }) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Tags")}
      contagem={contarPorGatilho(filtros).tags}
      onLimpar={() => onMudar(limparGatilho(filtros, "tags"))}
      className="w-72"
    >
      <SecaoTags filtros={filtros} onMudar={onMudar} leads={leads} />
    </GatilhoComPainel>
  );
}

export function GatilhoDoDono({ filtros, onMudar }: Base) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Dono do negócio")}
      contagem={contarPorGatilho(filtros).dono}
      onLimpar={() => onMudar(limparGatilho(filtros, "dono"))}
      className="w-72"
    >
      {(fechar) => <SecaoDono filtros={filtros} onMudar={onMudar} onEscolher={fechar} />}
    </GatilhoComPainel>
  );
}

export function GatilhoMaisFiltros({
  filtros,
  onMudar,
  leads,
  settings,
}: Base & { leads: readonly Lead[]; settings?: Record<string, unknown> }) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Mais filtros")}
      contagem={contarPorGatilho(filtros).mais}
      onLimpar={() => onMudar(limparGatilho(filtros, "mais"))}
      className={LARGO}
    >
      <div className="space-y-6">
        <Bloco titulo={t("Conversas")}>
          <SecaoConversas filtros={filtros} onMudar={onMudar} />
        </Bloco>
        <Bloco titulo={t("Negócio")}>
          <SecaoNegocio filtros={filtros} onMudar={onMudar} leads={leads} settings={settings} />
        </Bloco>
        <Bloco titulo={t("Outros")}>
          <SecaoOutros filtros={filtros} onMudar={onMudar} />
        </Bloco>
      </div>
    </GatilhoComPainel>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-casca-texto">{titulo}</h3>
      {children}
    </section>
  );
}
