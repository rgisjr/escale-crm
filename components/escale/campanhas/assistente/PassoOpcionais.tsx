"use client";

import type { ReactNode } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useDestinosDaImportacao } from "@/hooks/escale/useImportacoes";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import {
  ROTULO_DO_STATUS_DO_POS_ENVIO,
  STATUS_DO_POS_ENVIO,
  NUMEROS_EXTRAS_MAX,
  type StatusDoPosEnvio,
} from "@/lib/escale/campanhas/assistente";
import {
  errosDoPasso,
  type AcaoDoAssistente,
  type EstadoDoAssistente,
} from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

import { SUBTITULO_DO_PASSO, TITULO_DO_PASSO } from "../molde/estilos";
import { EscolhaDeTagsDaCampanha } from "./EscolhaDeTagsDaCampanha";
import { RitmoDaCampanha } from "./RitmoDaCampanha";

function Linha({
  rotulo,
  ajuda,
  children,
}: {
  rotulo: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-casca-divisoria py-4 md:flex-row md:items-start">
      <span className="flex w-[240px] shrink-0 items-center gap-2 pt-1.5 text-[13px] font-medium text-casca-texto">
        {rotulo}
        {ajuda && <AjudaDaCasca texto={ajuda} />}
      </span>
      <div className="w-full max-w-[620px] space-y-2">{children}</div>
    </div>
  );
}

function Secao({
  titulo,
  ajuda,
  descricao,
  children,
}: {
  titulo: string;
  ajuda?: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-casca-divisoria pt-6 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-casca-texto">
        {titulo}
        {ajuda && <AjudaDaCasca texto={ajuda} />}
      </h2>
      {descricao && <p className="mt-1 text-[13px] text-casca-suave">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** PASSO 3 — "Configurações opcionais" (fork Escale, Fase 8B; 09-038 a 09-043; N11–N13). */
export function PassoOpcionais({
  estado,
  despachar,
  numeros,
}: {
  estado: EstadoDoAssistente;
  despachar: (a: AcaoDoAssistente) => void;
  numeros: NumeroDaCampanha[];
}) {
  const t = useT();
  const d = estado.dados;
  const p = d.posEnvio;
  const destinos = useDestinosDaImportacao(true).data ?? [];
  const membros = useAssignableMembers(true).data ?? [];
  const agentes = useAssignableAgents(true).data ?? [];
  const erros = estado.tentou ? errosDoPasso(2, d, { numero: null, agora: new Date() }) : {};
  const mudarPos = (campos: Partial<typeof p>) => despachar({ tipo: "mudarPosEnvio", campos });
  const numero = numeros.find((n) => n.id === d.numeroId) ?? null;
  const origem = destinos.find((o) => o.id === p.origemId) ?? null;
  const extrasPossiveis = numeros.filter((n) => !n.oficial && n.conectado && n.id !== d.numeroId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={TITULO_DO_PASSO}>{t("Configurações opcionais")}</h1>
        <p className={SUBTITULO_DO_PASSO}>
          {t(
            "Personalize as configurações da sua campanha no CRM. Essas configurações são opcionais e serão aplicadas somente aos contatos que obtiverem sucesso na campanha após sua conclusão.",
          )}
        </p>
      </div>

      <Secao
        titulo={t("Adicionar tag para contatos")}
        ajuda={t(
          'A tag entra pelo mesmo caminho da tela e liga as automações de "tag adicionada".',
        )}
        descricao={t("As tags serão aplicadas aos contatos alcançados pela campanha.")}
      >
        <EscolhaDeTagsDaCampanha tags={p.tags} aoMudar={(tags) => mudarPos({ tags })} />
      </Secao>

      <Secao
        titulo={t("Negócios e atendimento")}
        descricao={t("Defina como os contatos serão tratados no funil após o envio.")}
      >
        <Linha
          rotulo={t("Criar negócios em uma origem")}
          ajuda={t(
            "O negócio nasce para todos os contatos que receberam a mensagem, nesta origem e etapa.",
          )}
        >
          <SeletorDaCasca
            valor={p.origemId ?? ""}
            vazio={t("Selecione uma origem")}
            aria-label={t("Criar negócios em uma origem")}
            opcoes={destinos.map((o) => ({
              valor: o.id,
              rotulo: o.nome,
              grupo: o.grupo ?? undefined,
            }))}
            aoMudar={(id) => {
              const escolhida = destinos.find((o) => o.id === id);
              mudarPos({
                origemId: id || null,
                etapaId: escolhida?.etapas[0]?.id ?? null,
                donoDoNegocio: id ? p.donoDoNegocio : false,
              });
            }}
          />
        </Linha>
        {origem && (
          <Linha rotulo={t("Etapa")}>
            <SeletorDaCasca
              valor={p.etapaId ?? ""}
              vazio={t("Selecione uma etapa")}
              aria-label={t("Etapa")}
              opcoes={origem.etapas.map((e) => ({ valor: e.id, rotulo: e.nome }))}
              aoMudar={(id) => mudarPos({ etapaId: id || null })}
            />
            {erros.etapaId && (
              <p role="alert" className="text-[11px] text-casca-alerta">
                {t(erros.etapaId)}
              </p>
            )}
          </Linha>
        )}
        <Linha rotulo={t("Status da conversa")}>
          <SeletorDaCasca<StatusDoPosEnvio>
            valor={p.statusDaConversa}
            aria-label={t("Status da conversa")}
            opcoes={STATUS_DO_POS_ENVIO.map((s) => ({
              valor: s,
              rotulo: t(ROTULO_DO_STATUS_DO_POS_ENVIO[s]),
            }))}
            aoMudar={(s) => mudarPos({ statusDaConversa: s || "aberta" })}
          />
          <CaixaDaCasca
            marcada={p.manterStatus}
            aoMudar={(v) => mudarPos({ manterStatus: v })}
            rotulo={t("Para atendimentos existentes manter o status atual da conversa")}
          />
        </Linha>
        <Linha rotulo={t("Atribuir um atendente")}>
          <SeletorDaCasca
            valor={p.atendenteId ?? ""}
            vazio={t("Selecione...")}
            aria-label={t("Atribuir um atendente")}
            opcoes={membros.map((m) => ({ valor: m.user_id, rotulo: m.full_name ?? m.user_id }))}
            aoMudar={(id) => mudarPos({ atendenteId: id || null })}
          />
          <CaixaDaCasca
            marcada={p.manterAtendente}
            aoMudar={(v) => mudarPos({ manterAtendente: v })}
            rotulo={t("Para atendimentos existentes manter o mesmo atendente")}
          />
          <span className="flex items-center gap-2">
            <CaixaDaCasca
              marcada={p.donoDoNegocio}
              desabilitada={!p.origemId}
              aoMudar={(v) => mudarPos({ donoDoNegocio: v })}
              rotulo={t("Manter atendente de acordo com a distribuição de dono do negócio")}
            />
            <AjudaDaCasca
              texto={t(
                "O atendente é o dono do negócio criado na origem (a distribuição de dono da origem decide quem é).",
              )}
            />
          </span>
        </Linha>
      </Secao>

      <Secao
        titulo={t("Quem atende a resposta")}
        descricao={t("O agente que responde quem escrever de volta. Em branco, vale o do número.")}
      >
        <SeletorDaCasca
          valor={d.agenteId ?? ""}
          vazio={t("O do número")}
          aria-label={t("Quem atende a resposta")}
          opcoes={agentes.map((a) => ({ valor: a.agent_id, rotulo: a.name }))}
          aoMudar={(id) => despachar({ tipo: "mudar", campos: { agenteId: id || null } })}
          className="max-w-[620px]"
        />
      </Secao>

      <Secao
        titulo={t("Ritmo de envio")}
        descricao={t(
          "A campanha só pode ser mais lenta que o número. Em branco, vale o ritmo do número.",
        )}
      >
        <RitmoDaCampanha
          ritmo={d.ritmo}
          aoMudar={(ritmo) => despachar({ tipo: "mudar", campos: { ritmo } })}
        />
      </Secao>

      {numero && !numero.oficial && (
        <Secao
          titulo={t("Números extras")}
          descricao={t("Outros números que dividem o envio com o principal (rodízio).")}
        >
          <SeletorMultiploDaCasca
            valores={d.numerosExtras}
            vazio={t("Nenhum número extra")}
            aria-label={t("Números extras")}
            opcoes={extrasPossiveis.map((n) => ({ valor: n.id, rotulo: n.nome }))}
            aoMudar={(ids) =>
              despachar({
                tipo: "mudar",
                campos: { numerosExtras: ids.slice(0, NUMEROS_EXTRAS_MAX) },
              })
            }
          />
        </Secao>
      )}
    </div>
  );
}
