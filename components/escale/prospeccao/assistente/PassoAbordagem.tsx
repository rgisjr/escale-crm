"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { ProspectingAgentBuilder } from "@/app/app/prospecting/_create-agent";
import { CartaoDeEscolha } from "@/components/escale/campanhas/molde/CartaoDeEscolha";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  aplicarAgenteCriado,
  canaisDoConstrutor,
  configDoRascunho,
  etapasDoConstrutor,
  funisDasEtapas,
  type RascunhoDaProspeccao,
} from "@/lib/escale/prospeccao/assistente";
import { rotaDoAgente } from "@/lib/escale/prospeccao/rotas";
import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";

import { CampoDeTexto, CampoDeTextoLongo } from "../campos";

/** O bloco do 038: rótulo à esquerda (240px), campo à direita, divisória embaixo. */
function Bloco({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-casca-divisoria py-5 md:grid-cols-[240px_minmax(0,1fr)]">
      <p className="text-[13px] font-medium text-casca-texto">{rotulo}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * PASSO 3 — CONFIGURE A ABORDAGEM (molde 038; D9, A1). Por conversa:
 * o construtor do original (precisa da campanha criada pela busca); depois de
 * publicar, o cartão do agente. Existente: funil, etapas, oferta e critério à
 * mão. Nos dois: ritmo e quando a empresa entra no funil.
 */
export function PassoAbordagem({
  r,
  atualizar,
  opcoes,
  campanha,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  opcoes: OpcoesDaProspeccao;
  campanha: DetalheDaProspeccao;
}) {
  const t = useT();
  const etapasDoFunil = opcoes.etapas
    .filter((e) => e.funilId === r.funilId)
    .map((e) => ({ valor: e.id, rotulo: e.nome }));
  const agente =
    opcoes.agentes.find((a) => a.id === r.agenteId)?.nome ?? t("Agente publicado e selecionado.");

  return (
    <section className="mx-auto max-w-[1080px]">
      <header className="space-y-1 pb-2">
        <h2 className="text-[18px] font-semibold text-casca-texto">{t("Configure a abordagem")}</h2>
        <p className="text-[12px] text-casca-suave">
          {t(
            "A IA usa o agente escolhido para abrir a conversa e atender as respostas. As proteções do canal continuam valendo.",
          )}
        </p>
      </header>

      {r.modo === "conversa" && !r.agenteId ? (
        <div className="py-5">
          <ProspectingAgentBuilder
            campaign={{ id: campanha.linha.id, name: campanha.linha.nome }}
            config={configDoRascunho(r)}
            channels={canaisDoConstrutor(opcoes)}
            stages={etapasDoConstrutor(opcoes)}
            onCreated={async (_id, criado, setup) => {
              atualizar(aplicarAgenteCriado(criado.agent, setup));
              toast.success(t("Agente publicado e selecionado."));
            }}
          />
        </div>
      ) : null}

      {r.modo === "conversa" && r.agenteId ? (
        <Bloco rotulo={t("Agente de IA")}>
          <p className="text-[13px] font-medium text-casca-texto">{agente}</p>
          <p className="text-[12px] whitespace-pre-wrap text-casca-suave">{r.instrucao}</p>
          <Link
            href={rotaDoAgente(r.agenteId)}
            className="text-[12px] text-casca-marca hover:underline"
          >
            {t("Configurações avançadas do agente")}
          </Link>
        </Bloco>
      ) : null}

      {r.modo === "existente" ? (
        <>
          <Bloco rotulo={t("Funil")}>
            <SeletorDaCasca
              aparencia="janela"
              aria-label={t("Funil")}
              vazio={t("Escolha o funil")}
              valor={r.funilId}
              opcoes={funisDasEtapas(opcoes)}
              aoMudar={(v) => atualizar({ funilId: v, etapaId: "", etapaQualificadaId: "" })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[12px] text-casca-suave">{t("Etapa inicial")}</p>
                <SeletorDaCasca
                  aparencia="janela"
                  aria-label={t("Etapa inicial")}
                  vazio={t("Escolha a etapa")}
                  valor={r.etapaId}
                  opcoes={etapasDoFunil}
                  aoMudar={(v) => atualizar({ etapaId: v })}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[12px] text-casca-suave">{t("Etapa de qualificados")}</p>
                <SeletorDaCasca
                  aparencia="janela"
                  aria-label={t("Etapa de qualificados")}
                  vazio={t("Escolha a etapa")}
                  valor={r.etapaQualificadaId}
                  opcoes={etapasDoFunil}
                  aoMudar={(v) => atualizar({ etapaQualificadaId: v })}
                />
              </div>
            </div>
          </Bloco>
          <Bloco rotulo={t("Oferta e qualificação")}>
            <CampoDeTextoLongo
              id="abordagem-instrucao"
              rotulo={t("O que a IA deve oferecer e como iniciar")}
              valor={r.instrucao}
              aoMudar={(instrucao) => atualizar({ instrucao })}
              maximo={2000}
              placeholder={t("Descreva sua oferta e o objetivo da primeira conversa.")}
              ajuda={t(
                "Este texto se soma ao prompt do agente nas conversas desta campanha. Se você mudar o prompt do agente, confira se os dois ainda dizem a mesma coisa.",
              )}
            />
            <CampoDeTextoLongo
              id="abordagem-qualificacao"
              rotulo={t("Quando considerar o cliente qualificado")}
              valor={r.qualificacao}
              aoMudar={(qualificacao) => atualizar({ qualificacao })}
              maximo={2000}
              placeholder={t(
                "Ex.: confirmou a necessidade, participa da decisão e deseja conversar sobre a solução.",
              )}
            />
          </Bloco>
        </>
      ) : null}

      <Bloco rotulo={t("Ritmo")}>
        <div className="grid grid-cols-2 gap-3">
          <CampoDeTexto
            id="abordagem-diario"
            numerico
            rotulo={t("Máximo em 24 horas")}
            valor={r.limiteDiario}
            aoMudar={(limiteDiario) => atualizar({ limiteDiario })}
          />
          <CampoDeTexto
            id="abordagem-intervalo"
            numerico
            rotulo={t("Intervalo mínimo (minutos)")}
            valor={r.intervaloMinutos}
            aoMudar={(intervaloMinutos) => atualizar({ intervaloMinutos })}
          />
        </div>
      </Bloco>

      <Bloco rotulo={t("Quando a empresa entra no funil")}>
        <div
          role="radiogroup"
          aria-label={t("Quando a empresa entra no funil")}
          className="grid gap-3 md:grid-cols-2"
        >
          <CartaoDeEscolha
            selecionado={r.entrada === "on_send"}
            aoEscolher={() => atualizar({ entrada: "on_send" })}
            titulo={t("Só quando for abordada (recomendado)")}
            descricao={t("O funil mostra só quem já recebeu a primeira mensagem.")}
          />
          <CartaoDeEscolha
            selecionado={r.entrada === "on_start"}
            aoEscolher={() => atualizar({ entrada: "on_start" })}
            titulo={t("Todas ao iniciar")}
            descricao={t(
              "Contato, negócio e conversa de toda a fila são criados na hora de iniciar.",
            )}
          />
        </div>
      </Bloco>
    </section>
  );
}
