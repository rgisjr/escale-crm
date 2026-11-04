/**
 * FORK ESCALE · 5D: a janela do Atraso ("Continuar entre 08:00 e 19:00", dias permitidos — Clint 07-028).
 * O atraso conta o tempo e, se acabar fora da janela, segue na próxima abertura. A régua é a MESMA do
 * horário comercial do canal (`proximaAberturaComercial`), no fuso da organização.
 */
import { z } from "zod";

import { proximaAberturaComercial, type FaixaComercial } from "@/lib/canais/horario-comercial";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const janelaDoAtrasoSchema = z.strictObject({
  de: z.string().regex(HORA),
  ate: z.string().regex(HORA),
  dias: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});
export type JanelaDoAtraso = z.infer<typeof janelaDoAtrasoSchema>;

function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "de" igual a "ate" = o dia inteiro. "ate" menor que "de" atravessa a meia-noite. */
export function faixasDaJanela(janela: JanelaDoAtraso): FaixaComercial[] {
  const de = minutos(janela.de);
  const ate = minutos(janela.ate);
  return [...new Set(janela.dias)].flatMap((dia): FaixaComercial[] => {
    if (de === ate) return [{ diaDaSemana: dia, inicioMin: 0, fimMin: 1440 }];
    if (de < ate) return [{ diaDaSemana: dia, inicioMin: de, fimMin: ate }];
    return [
      { diaDaSemana: dia, inicioMin: de, fimMin: 1440 },
      { diaDaSemana: (dia + 1) % 7, inicioMin: 0, fimMin: ate },
    ];
  });
}

export function instanteNaJanela(instante: Date, fuso: string, janela: JanelaDoAtraso): Date {
  return proximaAberturaComercial(instante, fuso, faixasDaJanela(janela)) ?? instante;
}
