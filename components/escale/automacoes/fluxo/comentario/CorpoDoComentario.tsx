"use client";

import { useContasSociais } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import type { DadosDoGatilho } from "@/lib/automation/desenho-da-regra";
import { configDoComentarioSchema, type CaminhoDoGatilho } from "@/lib/escale/comentarios/schema";

/** O rótulo de um caminho no nó: a legenda, "Qualquer publicação" ou "Grupo · n publicações". */
function useRotuloDoCaminho(escopo: "todos" | "especificos", caminho: CaminhoDoGatilho): string {
  const t = useT();
  if (escopo === "todos") return t("Qualquer publicação");
  if (caminho.publicacoes.length > 1) return t("Grupo · {n} publicações").replace("{n}", String(caminho.publicacoes.length));
  return caminho.publicacoes[0]?.legenda ?? t("Sem legenda");
}

function LinhaDoCaminho({ escopo, caminho }: { escopo: "todos" | "especificos"; caminho: CaminhoDoGatilho }) {
  const t = useT();
  const rotulo = useRotuloDoCaminho(escopo, caminho);
  const miniatura = caminho.publicacoes[0]?.miniatura ?? null;
  const resposta = caminho.resposta?.variacoes.find((v) => v.trim() !== "");
  return (
    <li className="flex gap-2 rounded-lg bg-casca-raia px-3 py-2" data-testid="caminho-do-no">
      {escopo === "especificos" ? (
        miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={miniatura} alt="" className="size-6 shrink-0 rounded object-cover" />
        ) : (
          <span className="size-6 shrink-0 rounded bg-surface" aria-hidden />
        )
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[12px] font-medium text-casca-texto">{rotulo}</p>
        {caminho.filtro.modo === "qualquer" ? (
          <p className="text-[11px] text-casca-suave">{t("Qualquer comentário")}</p>
        ) : (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {caminho.filtro.palavras.map((p) => (
              <span key={p} className="rounded bg-surface px-1.5 text-[11px] text-casca-texto-2">
                {p}
              </span>
            ))}
          </div>
        )}
        {resposta ? <p className="line-clamp-1 text-[11px] text-casca-suave italic">{`“${resposta}”`}</p> : null}
      </div>
    </li>
  );
}

/**
 * O CORPO DO NÓ DO GATILHO DE COMENTÁRIO (fork Escale, Fase 10B): o chip da conta e uma linha por
 * caminho. Todos os caminhos seguem pelo "Próximo passo" (D2). Só mostra; quem edita é o painel.
 */
export function CorpoDoComentario({ dados }: { dados: DadosDoGatilho }) {
  const t = useT();
  const { contas } = useContasSociais();
  const lida = configDoComentarioSchema.safeParse(dados.tela.configPropria);
  const config = lida.success ? lida.data : null;
  const conta = contas.find((c) => c.id === config?.channel_session_id);
  return (
    <div className="flex flex-col gap-2">
      <span className="w-fit rounded-md bg-casca-raia px-2 py-0.5 text-[12px] text-casca-texto-2" data-testid="conta-do-gatilho">
        {conta ? conta.nome : t("Dispositivo não configurado")}
      </span>
      {config && (config.escopo === "todos" || config.caminhos.length > 0) ? (
        <ul className="flex flex-col gap-1.5">
          {config.caminhos.map((c) => (
            <LinhaDoCaminho key={c.id} escopo={config.escopo} caminho={c} />
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-casca-suave">{t("Nenhuma publicação selecionada")}</p>
      )}
      <p className="text-[11px] text-casca-suave">{t("Caminhos sem conexão seguem pelo Próximo passo da automação.")}</p>
    </div>
  );
}
