"use client";
import Link from "next/link";
import type { ReactNode } from "react";

import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { FunilDeConversao } from "@/components/escale/campanhas/molde/FunilDeConversao";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { custoEmDolar, etapasDoFunil, textoDoPorcento } from "@/lib/escale/prospeccao/apresentacao";
import { rotaDoAgente } from "@/lib/escale/prospeccao/rotas";
import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";

import { RitmoDaProspeccao } from "./RitmoDaProspeccao";

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] text-casca-suave">{rotulo}</dt>
      <dd className="text-[12px] text-casca-texto">{children}</dd>
    </div>
  );
}

/**
 * O SUMÁRIO DA PROSPECÇÃO (molde 009; D10): cartões e funil sobre as
 * encontradas, a fila, a busca com o custo em US$ e, à direita, a abordagem
 * (o que a Clint mostra na prévia do celular; aqui quem escreve é o agente).
 */
export function SumarioDaProspeccao({
  detalhe,
  opcoes,
}: {
  detalhe: DetalheDaProspeccao;
  opcoes: OpcoesDaProspeccao | undefined;
}) {
  const t = useT();
  const c = detalhe.linha;
  const config = detalhe.config;
  const numero = opcoes?.numeros.find((n) => n.id === config?.channel_session_id)?.nome ?? "—";
  const agente = opcoes?.agentes.find((a) => a.id === config?.agent_id)?.nome ?? "—";
  const etapa = (id: string | undefined) => opcoes?.etapas.find((e) => e.id === id);
  const entrada = etapa(config?.stage_id);
  const qualificados = etapa(config?.qualified_stage_id);
  const funil = entrada
    ? `${entrada.funilNome} · ${entrada.nome} → ${qualificados?.nome ?? "—"}`
    : "—";
  const cartao = (rotulo: string, dica: string, parte: number) => (
    <CartaoDoSumario
      rotulo={rotulo}
      dica={dica}
      valor={textoDoPorcento(parte, c.encontradas)}
      complemento={numeroBr(parte)}
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CartaoDoSumario
            rotulo={t("Encontradas")}
            dica={t("Empresas que a busca trouxe, sem as repetidas ou fechadas.")}
            valor={numeroBr(c.encontradas)}
          />
          {cartao(
            t("Abordadas"),
            t("Empresas que receberam a primeira mensagem do agente."),
            c.abordadas,
          )}
          {cartao(t("Responderam"), t("Empresas que responderam à abordagem."), c.responderam)}
          {cartao(
            t("Qualificadas"),
            t("Empresas que o agente moveu para a etapa de qualificados."),
            c.qualificadas,
          )}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <FunilDeConversao etapas={etapasDoFunil(c, t)} legenda={t("% sobre encontradas")} />
          <SecaoDoSumario titulo={t("Fila")}>
            <dl className="grid gap-3">
              <Item rotulo={t("Na fila")}>{numeroBr(c.naFila)}</Item>
              <Item rotulo={t("Não abordadas")}>{numeroBr(c.naoAbordadas)}</Item>
              <Item rotulo={t("Com falha")}>{numeroBr(c.falhas)}</Item>
            </dl>
          </SecaoDoSumario>
        </div>
        <SecaoDoSumario titulo={t("Busca")}>
          <dl className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <Item rotulo={t("Público ou segmento")}>{detalhe.busca.niche}</Item>
            <Item rotulo={t("Cidade ou região")}>{detalhe.busca.location}</Item>
            <Item rotulo={t("Até quantas empresas")}>{numeroBr(detalhe.busca.limit)}</Item>
            <Item rotulo={t("Teto da busca (US$)")}>{custoEmDolar(detalhe.busca.budget_usd)}</Item>
            <Item rotulo={t("Custo da busca")}>{custoEmDolar(detalhe.custoUsd)}</Item>
          </dl>
          {detalhe.repetidas > 0 ? (
            <p className="mt-3 text-[11px] text-casca-suave">
              {t("{n} resultados repetidos ou indisponíveis foram desconsiderados.").replace(
                "{n}",
                numeroBr(detalhe.repetidas),
              )}
            </p>
          ) : null}
          {detalhe.erro ? (
            <p className="mt-3 text-[12px] text-casca-alerta">{detalhe.erro}</p>
          ) : null}
        </SecaoDoSumario>
      </div>
      <SecaoDoSumario titulo={t("Abordagem")}>
        {config ? (
          <dl className="grid gap-3">
            <Item rotulo={t("Número")}>{numero}</Item>
            <Item rotulo={t("Agente de IA")}>
              <span className="block">{agente}</span>
              <Link
                href={rotaDoAgente(config.agent_id)}
                className="text-[11px] text-casca-marca hover:underline"
              >
                {t("Configurações avançadas do agente")}
              </Link>
            </Item>
            <Item rotulo={t("Funil")}>{funil}</Item>
            <Item rotulo={t("Quando a empresa entra no funil")}>
              {config.funnel_entry === "on_send"
                ? t("Só quando for abordada (recomendado)")
                : t("Todas ao iniciar")}
            </Item>
            <Item rotulo={t("Base legal")}>{config.legal_basis_ref}</Item>
            <Item rotulo={t("Ritmo")}>
              <RitmoDaProspeccao detalhe={detalhe} />
            </Item>
          </dl>
        ) : (
          <p className="text-[12px] text-casca-suave">
            {t("A abordagem ainda não foi configurada.")}
          </p>
        )}
      </SecaoDoSumario>
    </div>
  );
}
