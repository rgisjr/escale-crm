"use client";

import { useContasSociais } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import type { DadosDoGatilho } from "@/lib/automation/desenho-da-regra";
import { GATILHO_DE_MENCAO_EM_STORY, ROTULO_DO_OPERADOR } from "@/lib/escale/comentarios/constantes";
import { lerFiltro } from "@/lib/escale/comentarios/filtro";
import { configDoDirectSchema } from "@/lib/escale/comentarios/schema";

/** O CORPO DO NÓ DOS GATILHOS DE DIRECT (fork Escale, Fase 10D): a conta e o filtro. Só mostra. */
export function CorpoDoDirect({ dados }: { dados: DadosDoGatilho }) {
  const t = useT();
  const { contas } = useContasSociais();
  const lida = configDoDirectSchema.safeParse(dados.tela.configPropria);
  const config = lida.success ? lida.data : null;
  const conta = contas.find((c) => c.id === config?.channel_session_id);
  const filtro = config ? lerFiltro(config.filtro) : null;
  const mencao = dados.evento === GATILHO_DE_MENCAO_EM_STORY;
  return (
    <div className="flex flex-col gap-2">
      <span className="w-fit rounded-md bg-casca-raia px-2 py-0.5 text-[12px] text-casca-texto-2" data-testid="conta-do-gatilho">
        {conta ? conta.nome : t("Dispositivo não configurado")}
      </span>
      <div className="rounded-lg bg-casca-raia px-3 py-2">
        {mencao ? (
          <p className="text-[11px] text-casca-suave">{t("Toda menção à conta em story")}</p>
        ) : filtro && filtro.modo === "palavras" ? (
          <div className="flex flex-wrap gap-1">
            {filtro.condicoes.map((c, i) => (
              <span key={i} className="rounded bg-surface px-1.5 text-[11px] text-casca-texto-2">
                {`${t(ROTULO_DO_OPERADOR[c.operador])} · ${c.valor}`}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-casca-suave">{t("Qualquer mensagem")}</p>
        )}
      </div>
    </div>
  );
}
