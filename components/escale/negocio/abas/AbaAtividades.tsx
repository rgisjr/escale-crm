"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useContact } from "@/hooks/contacts/useContact";
import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import { useActiveOrg, usePermission, useUser } from "@/hooks/auth/AuthProvider";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { roleAtLeast } from "@/lib/auth/types";
import { useEngrenagemDaOrigem } from "@/lib/escale/configuracoes/abrir";
import {
  atividadesDaVista,
  chaveDoDia,
  dadosDasVariaveis,
  diasDaColuna,
  etapasDoTrilho,
  gruposDaLista,
  gruposDoPlaybook,
  podeExcluirAtividade,
  type AtividadeDoNegocio,
} from "@/lib/escale/negocio/atividades";
import { resolverVariaveis } from "@/lib/escale/playbook/variaveis";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";

import { ColunaDosDias } from "./atividades/ColunaDosDias";
import { DetalheDaAtividade } from "./atividades/DetalheDaAtividade";
import { JanelaEditarDataEHora } from "./atividades/JanelaEditarDataEHora";
import { JanelaNovaAtividadeDoNegocio } from "./atividades/JanelaNovaAtividadeDoNegocio";
import { ListaDeAtividades } from "./atividades/ListaDeAtividades";
import { RodapeDoTipo } from "./atividades/RodapeDoTipo";
import { TrilhoDeEtapas } from "./atividades/TrilhoDeEtapas";

/**
 * A ABA ATIVIDADES DA FICHA (fork Escale, Fase 1I; C19–C21; prints G01, 017 e 003).
 *
 * O trilho escolhe a etapa VISTA (só para ver, Q6). Na atual e nas anteriores,
 * a coluna Dias e a lista das atividades dela; na futura, o playbook dela por
 * prazo relativo, com a dica da Clint. A caixa conclui (e, sem dono, quem
 * concluiu vira o dono: o hook). O detalhe mostra o texto com as variáveis
 * trocadas; o rodapé de cada tipo (enviar o WhatsApp, chamar) é da Task 13.
 */
export function AbaAtividades({
  lead,
  stages,
  pipeline,
}: {
  lead: Lead;
  stages: Stage[];
  pipeline: Pipeline;
}) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const org = useActiveOrg();
  const user = useUser();
  const podeEditar = usePermission("pipeline.move_card");
  const ativ = useAtividadesDoNegocio(lead);
  // As variáveis dos campos personalizados (P10): as definições da origem e os valores do contato.
  const contato = useContact(lead.contact_id ?? "");
  const defs = useMemo(() => camposDoFunil(pipeline.settings ?? null), [pipeline.settings]);
  const { data: membros } = useAssignableMembers(true);
  const nomes = useMemo(
    () => new Map((membros ?? []).map((m) => [m.user_id, m.full_name ?? ""] as const)),
    [membros],
  );
  const etapas = useMemo(() => etapasDoTrilho(stages), [stages]);
  const doTrilho = useMemo(() => new Set(etapas.map((e) => e.id)), [etapas]);
  const engrenagem = useEngrenagemDaOrigem(
    lead.pipeline_id,
    roleAtLeast(org?.role, "manager"),
    "etapas",
  );

  const [vista, setVista] = useState(lead.stage_id);
  const [dia, setDia] = useState<string | null>(null);
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const [editandoData, setEditandoData] = useState<AtividadeDoNegocio | null>(null);

  const agora = new Date();
  const etapaVista = etapas.find((e) => e.id === vista) ?? null;
  const etapaAtual = etapas.find((e) => e.id === lead.stage_id) ?? null;
  const futura =
    vista !== lead.stage_id &&
    etapas.findIndex((e) => e.id === vista) > etapas.findIndex((e) => e.id === lead.stage_id);
  const daVista = atividadesDaVista(ativ.dados?.atividades ?? [], vista, lead.stage_id, doTrilho);
  const dias = futura ? [] : diasDaColuna(daVista, agora, idioma, t);
  const filtradas = dia
    ? daVista.filter((a) => a.due_date && chaveDoDia(new Date(a.due_date)) === dia)
    : daVista;
  const grupos = gruposDaLista(filtradas, agora, idioma, t);
  const previa = futura ? gruposDoPlaybook(ativ.dados?.modelos ?? [], vista, t) : null;

  const escolhida = futura
    ? null
    : (filtradas.find((a) => a.id === escolhidaId) ?? grupos[0]?.itens[0] ?? null);
  const modeloEscolhido = previa
    ? (previa.flatMap((g) => g.modelos).find((m) => m.id === escolhidaId) ??
      previa[0]?.modelos[0] ??
      null)
    : null;

  const dados = dadosDasVariaveis(
    lead,
    tituloDoCard(lead),
    etapaAtual?.name ?? null,
    { nome: user.full_name, email: user.email },
    org?.name ?? null,
    { defs, contato: contato.data?.data.custom_fields ?? null, t },
  );
  const resolver = (texto: string | null) => resolverVariaveis(texto ?? "", dados);

  const verEtapa = (id: string) => {
    setVista(id);
    setDia(null);
    setEscolhidaId(null);
  };
  const acoes = {
    alternar: async (a: AtividadeDoNegocio) => {
      try {
        const r = await ativ.alternar(a);
        toast.success(
          r === "concluida"
            ? t("Tarefa concluída com sucesso")
            : t("Marcação de tarefa removida com sucesso"),
        );
      } catch {
        toast.error(t("Erro ao atualizar atividade. Tente novamente."));
      }
    },
    editarData: (a: AtividadeDoNegocio) => setEditandoData(a),
    excluir: async (a: AtividadeDoNegocio) => {
      try {
        await ativ.excluir(a.id);
        toast.success(t("Atividade removida com sucesso"));
      } catch {
        toast.error(t("Erro ao atualizar atividade. Tente novamente."));
      }
    },
  };
  const salvarConteudo = (a: AtividadeDoNegocio) => (texto: string) => {
    ativ.editar(a.id, { description: texto.trim() ? texto : null }).catch(() => {
      toast.error(t("Erro ao atualizar atividade. Tente novamente."));
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-h-0 flex-col">
        <TrilhoDeEtapas lead={lead} etapas={etapas} vista={vista} aoVer={verEtapa} />
        <div className="flex min-h-0 flex-1">
          <ColunaDosDias dias={dias} escolhido={dia} aoEscolher={setDia} />
          <ListaDeAtividades
            titulo={
              vista === lead.stage_id
                ? t("Próximas atividades")
                : `${t("Atividades")} · ${etapaVista?.name ?? ""}`
            }
            dica={
              futura
                ? t(
                    "O negócio ainda não está na etapa {stage}. Estas são as atividades previstas, agrupadas por quando devem ser feitas após a entrada; as datas só são definidas quando o negócio chega aqui.",
                  ).replace("{stage}", etapaVista?.name ?? "")
                : null
            }
            engrenagem={{
              aoConfigurar: engrenagem.aoConfigurar,
              dica: engrenagem.dicaDaEngrenagem,
            }}
            estado={ativ.carregando ? "carregando" : ativ.falhou ? "falhou" : "pronto"}
            grupos={grupos}
            previa={previa}
            escolhidaId={escolhida?.id ?? modeloEscolhido?.id ?? null}
            aoEscolher={setEscolhidaId}
            acoes={{
              alternar: (a) => void acoes.alternar(a),
              editarData: acoes.editarData,
              excluir: (a) => void acoes.excluir(a),
            }}
            podeEditar={podeEditar && !futura}
            nomes={nomes}
            idioma={idioma}
            agora={agora}
            aoNova={() => setNova(true)}
            aoRecarregar={ativ.recarregar}
          />
          {escolhida ? (
            <DetalheDaAtividade
              key={escolhida.id}
              tipo={escolhida.tipo}
              titulo={escolhida.title}
              conteudo={escolhida.description}
              textoResolvido={resolver(escolhida.description)}
              editavel={podeEditar}
              aoSalvarConteudo={salvarConteudo(escolhida)}
              podeRemover={podeEditar && podeExcluirAtividade(escolhida)}
              aoRemover={() => void acoes.excluir(escolhida)}
              rodape={
                <RodapeDoTipo
                  lead={lead}
                  atividade={escolhida}
                  texto={resolver(escolhida.description)}
                  alternar={ativ.alternar}
                />
              }
            />
          ) : modeloEscolhido ? (
            <DetalheDaAtividade
              key={modeloEscolhido.id}
              tipo={modeloEscolhido.tipo}
              titulo={modeloEscolhido.titulo}
              conteudo={modeloEscolhido.conteudo}
              textoResolvido={resolver(modeloEscolhido.conteudo)}
              editavel={false}
              podeRemover={false}
            />
          ) : (
            <section
              aria-label={t("Detalhes da atividade")}
              className="flex flex-1 flex-col items-center justify-center px-6 text-center"
            >
              <p className="text-[13px] font-semibold text-casca-texto">
                {t("Nenhuma atividade selecionada")}
              </p>
              <p className="mt-1 text-[12px] text-casca-suave">
                {t("Escolha uma atividade na lista ao lado para visualizar os detalhes.")}
              </p>
            </section>
          )}
        </div>
      </div>
      {nova && etapaVista ? (
        <JanelaNovaAtividadeDoNegocio
          aberta
          etapa={{ id: etapaVista.id, name: etapaVista.name }}
          aoFechar={() => setNova(false)}
          aoCriar={ativ.criar}
        />
      ) : null}
      {editandoData ? (
        <JanelaEditarDataEHora
          aberta
          atividade={editandoData}
          aoFechar={() => setEditandoData(null)}
          aoSalvar={(iso) => ativ.editar(editandoData.id, { due_date: iso })}
        />
      ) : null}
    </TooltipProvider>
  );
}
