"use client";
import { useT } from "@/hooks/i18n/useT";
import {
  contagemDasDecisoes,
  nivelDasDecisoes,
  type ColunaMapeada,
  type Decisoes,
  type TipoDeImportacao,
} from "@/lib/escale/importacao/regras";
import { ROTULO_DO_NIVEL, ROTULO_DO_TIPO } from "@/lib/escale/importacao/textos";
import { Flag } from "@/lib/ui/icons-da-casca";

import { ColunaCentral, Titulo } from "./pecas";

function LinhaDoResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex h-9 items-center justify-between border-t border-[#ECEBF1] px-4 text-[13px] first:border-t-0">
      <dt className="text-[#5A5964]">{rotulo}</dt>
      <dd className="min-w-0 truncate pl-4 text-casca-texto">{valor}</dd>
    </div>
  );
}

export function PassoPrevia({
  tipo,
  nomeDoArquivo,
  mapa,
  decisoes,
}: {
  tipo: TipoDeImportacao;
  nomeDoArquivo: string;
  mapa: readonly ColunaMapeada[];
  decisoes: Decisoes;
}) {
  const t = useT();
  const nivel = nivelDasDecisoes(decisoes, tipo, mapa);
  const conta = contagemDasDecisoes(decisoes, tipo, mapa);
  return (
    <>
      <Titulo titulo={t("Confira e confirme a importação")} subtitulo={t("Revise os detalhes antes de iniciar.")} />
      <ColunaCentral largura="max-w-[640px]">
        <dl data-testid="resumo-da-importacao" className="mt-5 rounded-[8px] border border-[#ECEBF1]">
          <LinhaDoResumo rotulo={t("Arquivo")} valor={nomeDoArquivo || "—"} />
          <LinhaDoResumo rotulo={t("Tipo")} valor={t(ROTULO_DO_TIPO[tipo])} />
          <LinhaDoResumo rotulo={t("Campos mapeados")} valor={String(mapa.filter((c) => c.para !== "none").length)} />
          <LinhaDoResumo
            rotulo={t("Nível de automação")}
            valor={nivel === "personalizado" ? t("Personalizado") : t(ROTULO_DO_NIVEL[nivel].rotulo)}
          />
          <LinhaDoResumo
            rotulo={t("Decisões")}
            valor={t("{auto} auto · {review} para revisar").replace("{auto}", String(conta.auto)).replace("{review}", String(conta.revisar))}
          />
        </dl>
        <div className="mt-5 flex gap-3 rounded-[8px] border border-[#ECEBF1] bg-[#F8F8FA] p-4">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-[#FFEBD6] text-[#C2570C]">
            <Flag size={16} />
          </span>
          <div>
            <p className="text-[13px] leading-5 font-medium text-casca-texto">
              {t("A importação conclui agora; as pendências ficam para revisar depois.")}
            </p>
            <p className="text-[12px] leading-5 text-[#5A5964]">
              {t(
                "Tudo que é seguro entra imediatamente. As linhas que precisam de decisão não entram até você resolvê-las na tela de revisão — mas o resto não fica esperando.",
              )}
            </p>
          </div>
        </div>
      </ColunaCentral>
    </>
  );
}
