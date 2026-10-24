"use client";
import { useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { useRitmoDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import {
  camposDoRitmo,
  validarRitmo,
  type CamposDoRitmo,
} from "@/lib/escale/campanhas/detalhe/ritmo";
import type { RitmoDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

const CAMPOS: Array<{ chave: keyof CamposDoRitmo; rotulo: string }> = [
  { chave: "intervalo", rotulo: "Intervalo entre mensagens (segundos)" },
  { chave: "tetoDiario", rotulo: "Teto por dia" },
  { chave: "tetoHorario", rotulo: "Teto por hora" },
  { chave: "janelaInicio", rotulo: "Janela: começa às (hora)" },
  { chave: "janelaFim", rotulo: "Janela: termina às (hora)" },
];

/**
 * "RITMO DE ENVIO" — editar (N8; o original deixa ajustar o ritmo em qualquer
 * estado vivo): a janela da casca, vazio = o do número; salva pelo PATCH do
 * original, que confere de novo e só deixa ir mais devagar que o número.
 */
export function JanelaDoRitmo({
  aberta,
  campanhaId,
  ritmo,
  aoFechar,
}: {
  aberta: boolean;
  campanhaId: string;
  ritmo: RitmoDaCampanha;
  aoFechar: () => void;
}) {
  const t = useT();
  const salvar = useRitmoDaCampanha(campanhaId);
  const [campos, setCampos] = useState<CamposDoRitmo>(() => camposDoRitmo(ritmo));
  const [erro, setErro] = useState<string | null>(null);

  const fechar = () => {
    setCampos(camposDoRitmo(ritmo));
    setErro(null);
    aoFechar();
  };

  async function enviar() {
    const v = validarRitmo(campos);
    if (!v.ok) {
      setErro(t(v.erro));
      return;
    }
    try {
      await salvar.mutateAsync(v.corpo);
      toast.success(t("Ritmo atualizado."));
      fechar();
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : t("Não foi possível salvar o ritmo. Tente novamente."),
      );
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar}>
      <CabecaDaJanela
        titulo={t("Ritmo de envio")}
        descricao={t("Deixe vazio para usar o do número.")}
      />
      <div className="grid gap-4">
        {CAMPOS.map((c) => (
          <Campo key={c.chave} rotulo={t(c.rotulo)}>
            <CampoDeTexto
              aria-label={t(c.rotulo)}
              inputMode="numeric"
              value={campos[c.chave]}
              onChange={(e) => setCampos((atual) => ({ ...atual, [c.chave]: e.target.value }))}
            />
          </Campo>
        ))}
        {erro ? (
          <p role="alert" className="text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={fechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={salvar.isPending} onClick={() => void enviar()}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
