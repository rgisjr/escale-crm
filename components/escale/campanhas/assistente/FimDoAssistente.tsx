"use client";

import { useRouter } from "next/navigation";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DAS_CAMPANHAS } from "@/lib/escale/campanhas/rotas";
import { CircleCheck, CircleX } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "../molde/estilos";

/**
 * O FIM DO ASSISTENTE (fork Escale, Fase 8B; PRD B18; sem print: provisório no
 * molde do vazio da 8A). Sucesso com "Criar nova campanha" e "Ir para a tela
 * inicial"; erro com a mensagem e "Tentar novamente".
 */
export function FimDoAssistente({
  resultado,
  aoNovaCampanha,
  aoTentarDeNovo,
}: {
  resultado:
    | { tipo: "sucesso"; nome: string; modo: "iniciada" | "agendada" }
    | { tipo: "erro"; mensagem: string };
  aoNovaCampanha: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const sucesso = resultado.tipo === "sucesso";
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span
        aria-hidden
        className={`flex size-14 items-center justify-center rounded-[10px] ${sucesso ? "bg-casca-marca-suave text-casca-marca" : "bg-(--escale-tom-vermelho-fundo) text-(--escale-tom-vermelho-texto)"}`}
      >
        {sucesso ? <CircleCheck className="size-6" /> : <CircleX className="size-6" />}
      </span>
      <p className="mt-4 text-[15px] font-semibold text-casca-texto">
        {resultado.tipo === "sucesso"
          ? (resultado.modo === "agendada"
              ? t("Campanha {nome} agendada com sucesso")
              : t("Campanha {nome} enviada com sucesso")
            ).replace("{nome}", resultado.nome)
          : t("Erro ao criar campanha de WhatsApp")}
      </p>
      {resultado.tipo === "erro" && (
        <p className="mt-2 max-w-[360px] text-[13px] text-casca-suave">{resultado.mensagem}</p>
      )}
      <div className="mt-6 flex gap-2">
        {sucesso ? (
          <>
            <button type="button" onClick={aoNovaCampanha} className={BOTAO_CONTORNADO}>
              {t("Criar nova campanha")}
            </button>
            <button
              type="button"
              onClick={() => router.push(ROTA_DAS_CAMPANHAS)}
              className={BOTAO_DA_MARCA}
            >
              {t("Ir para a tela inicial")}
            </button>
          </>
        ) : (
          <button type="button" onClick={aoTentarDeNovo} className={BOTAO_DA_MARCA}>
            {t("Tentar novamente")}
          </button>
        )}
      </div>
    </div>
  );
}
