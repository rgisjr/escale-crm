"use client";
import { useState } from "react";

import { BotaoDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  ATALHOS_DO_PRAZO,
  UNIDADES_DO_PRAZO,
  minutosDoPrazo,
  prazoPorUnidade,
  quantidadeDoPrazoValida,
  textoDoPrazo,
  type UnidadeDoPrazo,
} from "@/lib/escale/playbook/regras";

/**
 * O PRAZO DA ATIVIDADE (fork Escale, Fase 1I; print 024): a caixa "1 dia(s)"
 * abre o popover da Clint ("Criar atividade após entrar na etapa em:"), com o
 * número de 1 a 999, a unidade, os atalhos e Cancelar/Salvar. O valor é em
 * minutos (`time_to_check`).
 */
export function PrazoDaAtividade({
  minutos,
  aoMudar,
  desabilitado = false,
}: {
  minutos: number;
  aoMudar: (minutos: number) => void;
  desabilitado?: boolean;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState<UnidadeDoPrazo>("dia");
  const numero = Number(quantidade);
  const valido = quantidadeDoPrazoValida(numero);

  const abrir = (sim: boolean) => {
    if (sim) {
      const p = prazoPorUnidade(minutos);
      setQuantidade(String(p.quantidade || 1));
      setUnidade(p.unidade);
    }
    setAberto(sim);
  };
  const gravar = (valor: number) => {
    aoMudar(valor);
    setAberto(false);
  };

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={desabilitado}
          title={desabilitado ? t("Em breve") : undefined}
          aria-label={t("Data da atividade")}
          className="h-10 w-[175px] rounded-[4px] bg-casca-raia text-[14px] text-casca-texto transition-colors hover:bg-casca-marca-suave disabled:cursor-not-allowed disabled:opacity-60"
        >
          {textoDoPrazo(minutos, t)}
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="w-[320px] p-4">
        <p className="mb-3 text-[13px] font-medium text-casca-texto">
          {t("Criar atividade após entrar na etapa em:")}
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            aria-label={t("Quantidade")}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="h-9 w-20 rounded-[4px] border-0 bg-casca-raia px-3 text-[13px] text-casca-texto outline-hidden focus:ring-2 focus:ring-casca-marca"
          />
          <SeletorDaCasca
            aria-label={t("Unidade")}
            aparencia="janela"
            valor={unidade}
            aoMudar={(v) => v && setUnidade(v)}
            opcoes={UNIDADES_DO_PRAZO.map((u) => ({ valor: u.unidade, rotulo: t(u.rotulo) }))}
            className="h-9 flex-1"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ATALHOS_DO_PRAZO.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              onClick={() => gravar(a.minutos)}
              className="rounded-full border border-casca-borda px-2.5 py-1 text-[11px] text-casca-texto hover:bg-casca-raia"
            >
              {t(a.rotulo)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <BotaoDaJanela variante="cancelar" onClick={() => setAberto(false)}>
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={!valido}
            title={valido ? undefined : t("Digite um número de 1 a 999.")}
            onClick={() => gravar(minutosDoPrazo(numero, unidade))}
          >
            {t("Salvar")}
          </BotaoDaJanela>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
