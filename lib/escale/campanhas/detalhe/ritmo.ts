import { numeroBr, type Traduzir } from "@/lib/escale/campanhas/apresentacao";

import type { RitmoDaCampanha } from "./tipos";

/**
 * O BLOCO "ENTREGA" DO DETALHE (fork Escale, Fase 8C; N8; C13): o ritmo próprio
 * da campanha (vazio = o do número), a validação da janela de editar (as faixas
 * do CHECK da 0375 e do `ritmoSchema` do original) e a base legal.
 */
export type CamposDoRitmo = Record<
  "intervalo" | "tetoDiario" | "tetoHorario" | "janelaInicio" | "janelaFim",
  string
>;

export type CorpoDoRitmo = {
  intervalo_segundos: number | null;
  teto_diario: number | null;
  teto_horario: number | null;
  janela_inicio_hora: number | null;
  janela_fim_hora: number | null;
};

export type RitmoValidado = { ok: true; corpo: CorpoDoRitmo } | { ok: false; erro: string };

const texto = (n: number | null) => (n === null ? "" : String(n));

export const camposDoRitmo = (r: RitmoDaCampanha): CamposDoRitmo => ({
  intervalo: texto(r.intervaloSegundos),
  tetoDiario: texto(r.tetoDiario),
  tetoHorario: texto(r.tetoHorario),
  janelaInicio: texto(r.janelaInicioHora),
  janelaFim: texto(r.janelaFimHora),
});

/** Vazio = `null`; não inteiro = `NaN` (cai na faixa). */
function inteiro(s: string): number | null {
  const v = s.trim();
  if (v === "") return null;
  return /^\d+$/.test(v) ? Number(v) : Number.NaN;
}

const fora = (n: number | null, min: number, max: number) => n !== null && !(n >= min && n <= max);

export function validarRitmo(c: CamposDoRitmo): RitmoValidado {
  const intervalo = inteiro(c.intervalo);
  const tetoDiario = inteiro(c.tetoDiario);
  const tetoHorario = inteiro(c.tetoHorario);
  const inicio = inteiro(c.janelaInicio);
  const fim = inteiro(c.janelaFim);
  if (fora(intervalo, 1, 86_400))
    return { ok: false, erro: "O intervalo vai de 1 a 86.400 segundos." };
  if (fora(tetoDiario, 1, 10_000) || fora(tetoHorario, 1, 10_000)) {
    return { ok: false, erro: "Os tetos vão de 1 a 10.000 mensagens." };
  }
  if ((inicio === null) !== (fim === null)) {
    return { ok: false, erro: "Preencha o início e o fim da janela, ou deixe os dois vazios." };
  }
  if (
    inicio !== null &&
    fim !== null &&
    (fora(inicio, 0, 23) || fora(fim, 1, 24) || fim <= inicio)
  ) {
    return { ok: false, erro: "A janela precisa terminar depois de começar." };
  }
  return {
    ok: true,
    corpo: {
      intervalo_segundos: intervalo,
      teto_diario: tetoDiario,
      teto_horario: tetoHorario,
      janela_inicio_hora: inicio,
      janela_fim_hora: fim,
    },
  };
}

const hora = (h: number) => String(h).padStart(2, "0");

export function textosDoRitmo(
  r: RitmoDaCampanha,
  t: Traduzir,
): Array<{ rotulo: string; valor: string }> {
  const doNumero = t("O do número");
  return [
    {
      rotulo: t("Intervalo entre mensagens"),
      valor: r.intervaloSegundos === null ? doNumero : `${numeroBr(r.intervaloSegundos)} s`,
    },
    { rotulo: t("Teto por dia"), valor: r.tetoDiario === null ? doNumero : numeroBr(r.tetoDiario) },
    {
      rotulo: t("Teto por hora"),
      valor: r.tetoHorario === null ? doNumero : numeroBr(r.tetoHorario),
    },
    {
      rotulo: t("Janela de envio"),
      valor:
        r.janelaInicioHora === null || r.janelaFimHora === null
          ? doNumero
          : t("{inicio}h às {fim}h")
              .replace("{inicio}", hora(r.janelaInicioHora))
              .replace("{fim}", hora(r.janelaFimHora)),
    },
  ];
}

export function textoDaBaseLegal(base: string, lia: string | null, t: Traduzir): string {
  if (base === "legitimate_interest") return `${t("Interesse legítimo")}${lia ? ` (${lia})` : ""}`;
  return t("Consentimento");
}
