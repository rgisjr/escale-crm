"use client";
import { useEffect, useRef } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useContasSociais, useGarantirAssinatura } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";

const NOME_DA_REDE = { instagram: "Instagram", facebook: "Facebook" } as const;

/**
 * "SELECIONE O DISPOSITIVO INSTAGRAM" (fork Escale, Fase 10B, D4/D14): as contas do Instagram e do
 * Facebook; ao escolher (e ao abrir com conta já escolhida) garante a assinatura de `comment.received`
 * do canal e mostra o estado. A conta desconectada aparece desabilitada.
 */
export function SeletorDeConta({
  canal,
  aoEscolher,
  soInstagram = false,
}: {
  canal: string;
  aoEscolher: (id: string) => void;
  /** Fase 10D: os gatilhos de story são só do Instagram, então as páginas do Facebook somem. */
  soInstagram?: boolean;
}) {
  const t = useT();
  const { contas } = useContasSociais();
  const assinatura = useGarantirAssinatura();
  const garantidoPara = useRef<string | null>(null);
  const { mutate } = assinatura;

  useEffect(() => {
    if (!canal || garantidoPara.current === canal) return;
    garantidoPara.current = canal;
    mutate(canal);
  }, [canal, mutate]);

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
        {t("Selecione o dispositivo Instagram")}
        <AjudaDaCasca texto={t("A conta do Instagram ou a página do Facebook cujos comentários disparam a automação.")} />
      </p>
      <SeletorDaCasca
        aria-label={t("Conta do Instagram")}
        aparencia="janela"
        valor={canal}
        vazio={t("Escolha a conta")}
        aoMudar={(v) => v && aoEscolher(v)}
        opcoes={contas.filter((c) => !soInstagram || c.plataforma === "instagram").map((c) => ({
          valor: c.id,
          rotulo: `${c.nome} · ${NOME_DA_REDE[c.plataforma]}${c.conectada ? "" : ` — ${t("desconectada")}`}`,
          desabilitada: !c.conectada,
        }))}
      />
      {assinatura.isPending ? (
        <p className="text-[11px] text-casca-suave">{t("Ligando o recebimento de comentários…")}</p>
      ) : null}
      {assinatura.isError ? (
        <div role="alert" className="rounded-md border border-casca-alerta/40 p-2.5 text-[12px] text-casca-alerta">
          <p>
            {t("Não consegui ligar o recebimento de comentários nesta conta.")} {assinatura.error?.message}
          </p>
          <button
            type="button"
            onClick={() => mutate(canal)}
            className="mt-1 font-medium underline"
          >
            {t("Tentar novamente")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
