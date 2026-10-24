"use client";

import { useId } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { Assistente } from "@/lib/escale/campanhas/assistente";

import { CAMPO, ROTULO } from "../molde/estilos";

type Ritmo = Assistente["ritmo"];
type Chave = keyof Ritmo;

const CAMPOS: ReadonlyArray<{ chave: Chave; rotulo: string; max: number; min: number }> = [
  {
    chave: "intervalo_segundos",
    rotulo: "Intervalo entre mensagens (segundos)",
    min: 1,
    max: 86_400,
  },
  { chave: "teto_diario", rotulo: "Máximo por dia", min: 1, max: 10_000 },
  { chave: "teto_horario", rotulo: "Máximo por hora", min: 1, max: 10_000 },
  { chave: "janela_inicio_hora", rotulo: "Enviar a partir das (hora)", min: 0, max: 23 },
  { chave: "janela_fim_hora", rotulo: "Enviar até as (hora)", min: 1, max: 24 },
];

/**
 * O RITMO DE ENVIO (fork Escale, Fase 8B; N11): os campos do original
 * (`ritmoSchema`), em branco = o ritmo do número. Texto com teclado numérico,
 * nunca o `<input type="number">` (as setas dele somam e o valor some no Firefox).
 */
export function RitmoDaCampanha({ ritmo, aoMudar }: { ritmo: Ritmo; aoMudar: (r: Ritmo) => void }) {
  const t = useT();
  const base = useId();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {CAMPOS.map((c) => {
        const id = `${base}-${c.chave}`;
        const valor = ritmo[c.chave];
        return (
          <div key={c.chave}>
            <label htmlFor={id} className={ROTULO}>
              {t(c.rotulo)}
            </label>
            <input
              id={id}
              inputMode="numeric"
              value={valor ?? ""}
              placeholder={t("O do número")}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, "");
                const n = digitos === "" ? null : Math.min(c.max, Math.max(c.min, Number(digitos)));
                aoMudar({ ...ritmo, [c.chave]: n });
              }}
              className={CAMPO}
            />
          </div>
        );
      })}
    </div>
  );
}
