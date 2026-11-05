"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";

/**
 * A FAIXA DO RASCUNHO (fork Escale; a Clint não tem rascunho — molde: o amarelo do selo "Alterações não
 * salvas"). Diz que a tela está num rascunho e, na automação já publicada, deixa descartá-lo.
 */
export function FaixaDoRascunho({
  salvoEm,
  publicada,
  fuso,
  aoDescartar,
}: {
  salvoEm: string;
  publicada: boolean;
  fuso: string;
  aoDescartar: () => void;
}) {
  const t = useT();
  const data = dataHoraBr(salvoEm, fuso);
  return (
    <div role="status" className="flex shrink-0 items-center gap-3 border-b border-casca-divisoria bg-warning-bg px-5 py-2 text-[12px] text-warning-fg">
      <p className="min-w-0 flex-1">
        {publicada
          ? t("Rascunho não publicado, salvo em {data}. A automação no ar segue a última versão publicada até você salvar sem pendências.").replace("{data}", data)
          : t("Rascunho salvo em {data}. Corrija os pontos marcados e salve para poder ligar a automação.").replace("{data}", data)}
      </p>
      {publicada ? (
        <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoDescartar}>
          {t("Descartar rascunho")}
        </BotaoDaCasca>
      ) : null}
    </div>
  );
}
