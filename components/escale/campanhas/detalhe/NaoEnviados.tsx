"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import type { FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";

/** "NÃO ENVIADOS" (material 2.3; C15): só com alguém; "Ver contatos" e "Criar campanha" para eles. */
export function NaoEnviados({
  quantidade,
  aoVerContatos,
  aoCriarCampanha,
  criando,
}: {
  quantidade: number;
  aoVerContatos: (filtros: FiltrosDeDestinatarios) => void;
  aoCriarCampanha: () => void;
  criando: boolean;
}) {
  const t = useT();
  if (quantidade === 0) return null;
  const link = "text-[12px] font-medium text-casca-marca hover:underline disabled:opacity-60";
  return (
    <SecaoDoSumario
      titulo={t("Não enviados")}
      ajuda={t(
        "Contatos que não receberam a mensagem por cancelamento, interrupção ou linha inválida.",
      )}
    >
      <p className="text-[18px] font-bold">{numeroBr(quantidade)}</p>
      <div className="mt-2 flex gap-4">
        <button
          type="button"
          onClick={() => aoVerContatos({ situacoes: ["nao_enviado"] })}
          className={link}
        >
          {t("Ver contatos")}
        </button>
        <button type="button" disabled={criando} onClick={aoCriarCampanha} className={link}>
          {t("Criar campanha")}
        </button>
      </div>
    </SecaoDoSumario>
  );
}
