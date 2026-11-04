"use client";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { fraseDoFluxo } from "@/lib/escale/automacoes/fluxo/frases";
import type { DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import {
  ATRASO_MAXIMO_MS,
  ATRASO_MINIMO_MS,
  RECUSA_ATRASO_MAXIMO,
  RECUSA_ATRASO_MINIMO,
  msDoAtraso,
  type DadosDoAtraso,
  type UnidadeDoAtraso,
} from "@/lib/escale/automacoes/fluxo/caixas";
import { DIAS_NA_ORDEM, NOME_DO_DIA, mascaraDeHora } from "@/lib/escale/automacoes/fluxo/condicoes";

import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";
import { useRascunho } from "./useRascunho";

const UNIDADES: readonly { valor: UnidadeDoAtraso; rotulo: string }[] = [
  { valor: "segundos", rotulo: "Segundos" },
  { valor: "minutos", rotulo: "Minutos" },
  { valor: "horas", rotulo: "Horas" },
  { valor: "dias", rotulo: "Dias" },
];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

type Estado = { quantidade: string; unidade: UnidadeDoAtraso; limite: boolean; de: string; ate: string; dias: string[] };

function estadoDe(d: DadosDoAtraso): Estado {
  return {
    quantidade: String(d.quantidade),
    unidade: d.unidade,
    limite: d.janela !== null,
    de: d.janela?.de ?? "",
    ate: d.janela?.ate ?? "",
    dias: (d.janela?.dias ?? []).map(String),
  };
}

/** O tempo digitado, ou `null` enquanto não é um número inteiro de 1 em diante. */
function quantidadeDe(texto: string): number | null {
  return /^\d+$/.test(texto) && Number(texto) >= 1 ? Number(texto) : null;
}

/**
 * O PAINEL DO ATRASO (07-028): "Condição › Tempo", o número com a unidade, a caixa "Definir tempo limite
 * de continuação" e, marcada, "Continuar entre" duas horas e os dias da semana. O atraso mínimo é de 30
 * segundos (o relógio do fluxo roda a cada ~25 s) e o máximo, de 90 dias.
 */
export function PainelDoAtraso({
  dados,
  aoCancelar,
  aoSalvar,
  aoMudarRascunho,
}: {
  dados: DadosDoAtraso & { problemas?: Parameters<typeof ProblemasDoPainel>[0]["lista"] };
  aoCancelar: () => void;
  aoSalvar: (dados: DadosDaCaixa) => void;
  aoMudarRascunho?: (sujo: boolean) => void;
}) {
  const t = useT();
  const { rascunho, setRascunho, sujo } = useRascunho<Estado>(estadoDe(dados), aoMudarRascunho);
  const quantidade = quantidadeDe(rascunho.quantidade);
  const ms = quantidade === null ? null : msDoAtraso({ quantidade, unidade: rascunho.unidade });
  const erroDoTempo = ms === null ? null : ms < ATRASO_MINIMO_MS ? RECUSA_ATRASO_MINIMO : ms > ATRASO_MAXIMO_MS ? RECUSA_ATRASO_MAXIMO : null;
  const janelaValida = !rascunho.limite || (HORA.test(rascunho.de) && HORA.test(rascunho.ate) && rascunho.dias.length > 0);
  const podeSalvar = quantidade !== null && erroDoTempo === null && janelaValida;
  const mudar = (patch: Partial<Estado>) => setRascunho({ ...rascunho, ...patch });

  function salvar() {
    if (quantidade === null || !podeSalvar) return;
    aoSalvar({
      kind: "atraso",
      quantidade,
      unidade: rascunho.unidade,
      janela: rascunho.limite
        ? { de: rascunho.de, ate: rascunho.ate, dias: rascunho.dias.map(Number).sort((a, b) => a - b) }
        : null,
    });
  }

  return (
    <PainelDoNo tipo="atraso" titulo={t("Atraso")} aoCancelar={aoCancelar} aoSalvar={salvar} salvarDesabilitado={!podeSalvar || !sujo}>
      <ProblemasDoPainel lista={dados.problemas} />
      <div className="flex items-center gap-3">
        <span className="w-[66px] shrink-0 text-[14px] text-casca-texto">{t("Condição")}</span>
        <div className="min-w-0 flex-1">
          <SeletorDaCasca
            aria-label={t("Condição")}
            aparencia="janela"
            valor="tempo"
            aoMudar={() => undefined}
            opcoes={[{ valor: "tempo", rotulo: t("Tempo") }]}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <CampoDeTexto
          inputMode="numeric"
          aria-label={t("Tempo")}
          value={rascunho.quantidade}
          onChange={(e) => mudar({ quantidade: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          className="w-[88px]"
        />
        <div className="w-[140px]">
          <SeletorDaCasca
            aria-label={t("Unidade")}
            aparencia="janela"
            valor={rascunho.unidade}
            aoMudar={(v) => mudar({ unidade: (v || "minutos") as UnidadeDoAtraso })}
            opcoes={UNIDADES.map((u) => ({ valor: u.valor, rotulo: t(u.rotulo) }))}
          />
        </div>
      </div>
      {erroDoTempo ? (
        <p role="alert" className="mt-2 text-[12px] text-casca-alerta">
          {fraseDoFluxo(erroDoTempo, t)}
        </p>
      ) : null}
      <div className="mt-4 border-b border-casca-divisoria pb-2">
        <CaixaDaCasca
          marcada={rascunho.limite}
          aoMudar={(limite) => mudar({ limite })}
          rotulo={t("Definir tempo limite de continuação")}
        />
      </div>
      {rascunho.limite ? (
        <div className="mt-5 flex flex-col gap-3">
          <span className="text-[14px] text-casca-texto">{t("Continuar entre")}</span>
          <div className="flex items-center gap-3">
            <CampoDeTexto
              inputMode="numeric"
              aria-label={t("Hora inicial")}
              value={rascunho.de}
              placeholder="08:00"
              onChange={(e) => mudar({ de: mascaraDeHora(e.target.value) })}
              className="w-[88px] px-0 text-center"
            />
            <span className="text-[14px] text-casca-texto">{t("e")}</span>
            <CampoDeTexto
              inputMode="numeric"
              aria-label={t("Hora final")}
              value={rascunho.ate}
              placeholder="19:00"
              onChange={(e) => mudar({ ate: mascaraDeHora(e.target.value) })}
              className="w-[88px] px-0 text-center"
            />
          </div>
          <SeletorMultiploDaCasca
            aria-label={t("Dias da semana")}
            vazio={t("Selecione os dias")}
            valores={rascunho.dias}
            aoMudar={(dias) => mudar({ dias })}
            resumir={(nomes) => (nomes.length > 2 ? `${nomes.length} ${t("selecionados")}` : nomes.join(", "))}
            opcoes={DIAS_NA_ORDEM.map((d) => ({ valor: String(d), rotulo: t(NOME_DO_DIA[d]) }))}
          />
        </div>
      ) : null}
    </PainelDoNo>
  );
}
