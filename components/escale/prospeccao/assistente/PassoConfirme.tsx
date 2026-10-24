"use client";
import { ResumoDoEnvio } from "@/components/escale/campanhas/molde/ResumoDoEnvio";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { custoEmDolar, textoDoRitmo } from "@/lib/escale/prospeccao/apresentacao";
import { inteiroDoTexto, type RascunhoDaProspeccao } from "@/lib/escale/prospeccao/assistente";
import { contarMarcadas } from "@/lib/escale/prospeccao/selecao";
import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Bot, Clock, Phone, Tag, Users } from "@/lib/ui/icons-da-casca";

import { CampoDeTextoLongo } from "../campos";

/**
 * PASSO 4 — CONFIRME E INICIE (molde 044; D9): o resumo com ícones, o custo
 * da busca na faixa de baixo (a Clint mostra o custo estimado; aqui é o custo
 * real da busca em US$), a base legal obrigatória e o aviso do original.
 */
export function PassoConfirme({
  r,
  atualizar,
  opcoes,
  detalhe,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  opcoes: OpcoesDaProspeccao;
  detalhe: DetalheDaProspeccao;
}) {
  const t = useT();
  const marcadas = contarMarcadas(detalhe.empresas);
  const numero = opcoes.numeros.find((n) => n.id === r.numeroId)?.nome ?? "—";
  const agente = opcoes.agentes.find((a) => a.id === r.agenteId)?.nome ?? "—";

  return (
    <section className="mx-auto max-w-[640px] space-y-4">
      <h2 className="text-[18px] font-semibold text-casca-texto">{t("Confirme sua prospecção")}</h2>
      <ResumoDoEnvio
        linhas={[
          { icone: <Tag size={14} aria-hidden />, rotulo: t("Nome da prospecção"), valor: r.nome },
          {
            icone: <Phone size={14} aria-hidden />,
            rotulo: t("Número de WhatsApp"),
            valor: numero,
          },
          { icone: <Bot size={14} aria-hidden />, rotulo: t("Agente de IA"), valor: agente },
          {
            icone: <Users size={14} aria-hidden />,
            rotulo: t("Abordar"),
            valor:
              marcadas === 1
                ? t("1 empresa marcada")
                : t("{n} empresas marcadas").replace("{n}", numeroBr(marcadas)),
          },
          {
            icone: <Clock size={14} aria-hidden />,
            rotulo: t("Ritmo"),
            valor: textoDoRitmo(
              inteiroDoTexto(r.limiteDiario) ?? 0,
              inteiroDoTexto(r.intervaloMinutos) ?? 0,
              t,
            ),
          },
        ]}
        rodape={
          <div className="flex items-center justify-between px-4 py-3 text-[12px] text-casca-marca">
            <span>{t("Custo da busca")}</span>
            <strong className="text-[15px]">{custoEmDolar(detalhe.custoUsd)}</strong>
          </div>
        }
      />
      <CampoDeTextoLongo
        id="confirme-base-legal"
        rotulo={t("Referência da avaliação de legítimo interesse")}
        valor={r.baseLegal}
        aoMudar={(baseLegal) => atualizar({ baseLegal })}
        maximo={500}
        ajuda={t(
          "Informe a referência real da avaliação que fundamenta esta prospecção. Isso não registra consentimento dos contatos.",
        )}
      />
      <aside className="rounded-r-md border-l-2 border-casca-marca bg-casca-marca-suave p-4 text-[12px] text-casca-texto">
        {r.entrada === "on_send"
          ? t(
              "Ao iniciar, as empresas com telefone entram na fila. Cada uma entra no funil só quando for abordada. Contatos já existentes são preservados. A fila faz uma primeira abordagem; respostas seguem no Inbox. Uma mensagem já em transmissão pode concluir após a pausa.",
            )
          : t(
              "Ao iniciar, os contatos novos com telefone entram no funil. Contatos já existentes são preservados. A fila faz uma primeira abordagem; respostas seguem no Inbox. Uma mensagem já em transmissão pode concluir após a pausa.",
            )}
      </aside>
    </section>
  );
}
