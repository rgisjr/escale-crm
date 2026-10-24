"use client";
import Link from "next/link";

import { CampoComContador } from "@/components/escale/campanhas/molde/CampoComContador";
import { CartaoDeEscolha } from "@/components/escale/campanhas/molde/CartaoDeEscolha";
import { SeletorDeNumero } from "@/components/escale/campanhas/molde/SeletorDeNumero";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  NOME_MAX,
  numerosDoSeletor,
  type RascunhoDaProspeccao,
} from "@/lib/escale/prospeccao/assistente";
import type { OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Bot, MessageCircle } from "@/lib/ui/icons-da-casca";

import { Ajuda } from "../campos";

/**
 * PASSO 1 — CONFIGURE A SUA PROSPECÇÃO (molde 018/019; D9): o nome com o
 * contador, o número (só não oficiais e conectados) e o agente: por conversa
 * (o construtor do original, no passo 3) ou um existente.
 */
export function PassoConfigure({
  r,
  atualizar,
  opcoes,
  nomeTravado,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  opcoes: OpcoesDaProspeccao;
  nomeTravado: boolean;
}) {
  const t = useT();
  const numeros = numerosDoSeletor(opcoes, t("Não oficial"));

  return (
    <section className="mx-auto max-w-[640px] space-y-5">
      <header className="space-y-1">
        <h2 className="text-[18px] font-semibold text-casca-texto">{t("Prospecção com IA")}</h2>
        <p className="text-[12px] text-casca-suave">
          {t("Dê um nome à prospecção, escolha o número e quem vai conversar com as empresas.")}
        </p>
      </header>

      {nomeTravado ? (
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-casca-texto">{t("Nome da prospecção")}</p>
          <p className="text-[13px] text-casca-texto">{r.nome}</p>
          <Ajuda>{t("O nome foi gravado com a busca.")}</Ajuda>
        </div>
      ) : (
        <CampoComContador
          id="prospeccao-nome"
          rotulo={t("Nome da prospecção")}
          valor={r.nome}
          aoMudar={(nome) => atualizar({ nome })}
          maximo={NOME_MAX}
          placeholder={t("Ex: Clínicas de estética em Campinas")}
        />
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-casca-texto">{t("Número de WhatsApp")}</p>
        {numeros.length ? (
          <SeletorDeNumero
            numeros={numeros}
            valor={r.numeroId}
            aoMudar={(numeroId) => atualizar({ numeroId })}
            placeholder={t("Selecionar número")}
          />
        ) : (
          <p className="text-[12px] text-casca-alerta">
            {t("Nenhuma conexão ativa permite iniciar conversas de texto.")}{" "}
            <Link href="/app/connections" className="text-casca-marca hover:underline">
              {t("Ver conexões e proteções de envio")}
            </Link>
          </p>
        )}
        <Ajuda>
          {t(
            "Só números não oficiais: a prospecção abre a conversa com texto livre, e o número oficial exige modelo aprovado.",
          )}
        </Ajuda>
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-casca-texto">{t("Agente de IA")}</p>
        <div role="radiogroup" aria-label={t("Agente de IA")} className="grid grid-cols-2 gap-3">
          <CartaoDeEscolha
            selecionado={r.modo === "conversa"}
            aoEscolher={() => {
              if (r.modo !== "conversa") atualizar({ modo: "conversa", agenteId: null });
            }}
            titulo={t("Configurar por conversa")}
            descricao={t("A IA monta o agente conversando com você no passo 3, depois da busca.")}
            icone={<MessageCircle size={16} aria-hidden />}
          />
          <CartaoDeEscolha
            selecionado={r.modo === "existente"}
            aoEscolher={() => atualizar({ modo: "existente" })}
            titulo={t("Usar agente existente")}
            descricao={t("Escolha um agente publicado e configure a abordagem à mão.")}
            icone={<Bot size={16} aria-hidden />}
          />
        </div>
        {r.modo === "existente" ? (
          <SeletorDaCasca
            aparencia="janela"
            aria-label={t("Agente de IA")}
            vazio={t("Escolha um agente publicado")}
            valor={r.agenteId ?? ""}
            opcoes={opcoes.agentes.map((a) => ({ valor: a.id, rotulo: a.nome }))}
            aoMudar={(v) => atualizar({ agenteId: v || null })}
          />
        ) : null}
      </div>
    </section>
  );
}
