"use client";
import { useReactFlow } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ActionType } from "@/app/app/webhooks/_components/labels";
import { JanelaRenomearAutomacao } from "@/components/escale/automacoes/lista/JanelaRenomearAutomacao";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useT } from "@/hooks/i18n/useT";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import type { DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import { ehGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import type { PassoDaPaleta } from "@/lib/escale/automacoes/fluxo/paleta";
import { ROTA_DA_LISTA_DE_AUTOMACOES, rotaDoEditor } from "@/lib/escale/automacoes/rotas";

import type { AbaDoFluxo } from "./AbasDoFluxo";
import { AcoesDoNoContext, type AcoesDoNo } from "./BarraDoNo";
import { CabecalhoDoFluxo } from "./CabecalhoDoFluxo";
import { CanvasDoFluxo } from "./CanvasDoFluxo";
import { MenuDoFluxo } from "./MenuDoFluxo";
import { PaletaDoFluxo } from "./PaletaDoFluxo";
import { PainelDaAcao } from "./painel/PainelDaAcao";
import { PainelDoGrupo } from "./painel/PainelDoGrupo";
import { PainelDaMensagem } from "./painel/PainelDaMensagem";
import { PainelDasCondicoes } from "./painel/PainelDasCondicoes";
import { PainelDoGatilho } from "./painel/PainelDoGatilho";
import { useFluxo } from "./useFluxo";

/**
 * A TELA DO FLUXO (07-013): cabeçalho em cima; embaixo o canvas, o painel do nó por
 * cima à esquerda e a paleta à direita. O que mexe no rascunho do painel passa pelo
 * guarda "Configuração … não salva" (D13); sair com o desenho sujo, por "Alterações
 * não salvas" (D17).
 */
export function TelaDoFluxo({
  regra,
  fuso,
  nomeInicial,
  aoCriar,
}: {
  regra: AutomationRuleRow | null;
  fuso: string;
  nomeInicial?: string;
  aoCriar?: (id: string) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const { fitView } = useReactFlow();
  const aoReorganizar = useCallback(() => {
    window.setTimeout(() => void fitView({ padding: 0.2, duration: 200 }), 0);
  }, [fitView]);
  const fluxo = useFluxo(regra, { nomeInicial, aoCriar, aoReorganizar });
  const { selecionado, sujo } = fluxo;

  const [aba, setAba] = useState<AbaDoFluxo>("editor");
  const [painelSujo, setPainelSujo] = useState(false);
  const [pendente, setPendente] = useState<(() => void) | null>(null);
  const [saindo, setSaindo] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState(false);

  // O aviso do navegador ao fechar ou recarregar a aba com alterações (D17).
  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  const noAberto = fluxo.nos.find((n) => n.id === selecionado) ?? null;

  /** Roda a ação já, ou pede "Descartar e continuar" se o painel aberto tem rascunho mexido. */
  const comGuarda = useCallback(
    (acao: () => void) => {
      if (painelSujo && selecionado) setPendente(() => acao);
      else acao();
    },
    [painelSujo, selecionado],
  );

  const fechar = useCallback(() => {
    setPainelSujo(false);
    fluxo.selecionar(null);
  }, [fluxo]);

  const escolherPasso = useCallback(
    (passo: PassoDaPaleta, posicao?: { x: number; y: number }) => {
      comGuarda(() => {
        setPainelSujo(false);
        if (passo === "gatilho") fluxo.selecionar("gatilho");
        else if (passo === "acoes") fluxo.adicionar("grupo", posicao);
        else fluxo.adicionar(passo === "condicoes" ? "condicoes" : (passo as ActionType), posicao);
      });
    },
    [comGuarda, fluxo],
  );

  const acoesDoNo = useMemo<AcoesDoNo>(
    () => ({
      duplicar: (id) =>
        comGuarda(() => {
          setPainelSujo(false);
          fluxo.duplicarNo(id);
        }),
      remover: (id) => setRemovendo(id),
    }),
    [comGuarda, fluxo],
  );

  function sairPara(destino: string) {
    if (sujo) setSaindo(destino);
    else router.push(destino);
  }

  const aplicarNoPainel = (dados: DadosDaCaixa) => {
    if (selecionado) fluxo.aplicarNoNo(selecionado, dados);
    fechar();
  };

  const painel = (() => {
    if (!noAberto) return null;
    const dados = noAberto.data;
    if (dados.kind === "gatilho") {
      const temCondicoes = fluxo.nos.some((n) => n.data.kind === "condicoes" && n.data.linhas.length > 0);
      return (
        <PainelDoGatilho
          key={noAberto.id}
          dados={dados}
          temCondicoes={temCondicoes}
          aoCancelar={fechar}
          aoMudarRascunho={setPainelSujo}
          aoTrocar={(evento, tela) => {
            fluxo.trocarGatilho(evento, tela);
            fechar();
          }}
        />
      );
    }
    if (dados.kind === "condicoes") {
      return (
        <PainelDasCondicoes
          key={noAberto.id}
          dados={dados}
          evento={fluxo.evento}
          aoCancelar={fechar}
          aoSalvar={aplicarNoPainel}
          aoMudarRascunho={setPainelSujo}
        />
      );
    }
    if (ehGrupo(dados)) {
      return (
        <PainelDoGrupo
          key={noAberto.id}
          dados={dados}
          evento={fluxo.evento}
          aoCancelar={fechar}
          aoSalvar={aplicarNoPainel}
          aoMudarRascunho={setPainelSujo}
        />
      );
    }
    if (dados.acao.type === "send_whatsapp_message") {
      return (
        <PainelDaMensagem
          key={noAberto.id}
          dados={dados}
          aoCancelar={fechar}
          aoSalvar={aplicarNoPainel}
          aoMudarRascunho={setPainelSujo}
        />
      );
    }
    return (
      <PainelDaAcao
        key={noAberto.id}
        dados={dados}
        evento={fluxo.evento}
        aoCancelar={fechar}
        aoSalvar={aplicarNoPainel}
        aoMudarRascunho={setPainelSujo}
      />
    );
  })();

  const configuracaoDoGatilho = noAberto?.data.kind === "gatilho";

  return (
    <AcoesDoNoContext.Provider value={acoesDoNo}>
      <div data-escale-fluxo className="flex h-full min-h-0 flex-col">
        <CabecalhoDoFluxo
          nome={fluxo.nome}
          existe={regra !== null}
          ativo={fluxo.ativo}
          sujo={sujo}
          salvando={fluxo.salvando}
          atualizadoEm={fluxo.versao}
          fuso={fuso}
          aba={aba}
          insightsDisponivel={false}
          aoMudarAba={setAba}
          aoVoltar={() => sairPara(ROTA_DA_LISTA_DE_AUTOMACOES)}
          aoRenomear={() => setRenomeando(true)}
          aoSalvar={() => void fluxo.salvar()}
          aoAlternarAtivo={fluxo.alternarAtivo}
          menu={
            <MenuDoFluxo
              id={regra?.id ?? null}
              sujo={sujo}
              aoEditarNoEditor={() => regra && sairPara(rotaDoEditor(regra.id))}
              aoOrganizar={fluxo.reorganizar}
            />
          }
        />
        <div className="relative flex min-h-0 flex-1">
          <CanvasDoFluxo
            fluxo={fluxo}
            aoClicarNo={(id) => id !== selecionado && comGuarda(() => fluxo.selecionar(id))}
            aoClicarFundo={() => selecionado && comGuarda(fechar)}
            aoSoltar={escolherPasso}
            aoPedirRemover={setRemovendo}
          />
          {painel}
          <PaletaDoFluxo aoEscolher={(passo) => escolherPasso(passo)} />
        </div>

        <JanelaRenomearAutomacao
          automacao={renomeando ? { id: regra?.id ?? "nova", nome: fluxo.nome } : null}
          aoFechar={() => setRenomeando(false)}
          aoSalvar={(nome) => {
            fluxo.setNome(nome);
            setRenomeando(false);
          }}
        />
        <JanelaDeConfirmacao
          aberta={saindo !== null}
          aoFechar={() => setSaindo(null)}
          titulo={t("Alterações não salvas")}
          rotuloDoConfirmar={t("Sair sem salvar")}
          aoConfirmar={() => {
            const destino = saindo;
            setSaindo(null);
            if (destino) router.push(destino);
          }}
        >
          <p className="font-medium text-casca-texto">{t("Você está saindo do editor da automação")}</p>
          <p>{t("Alterações não salvas serão perdidas se você continuar sem salvar.")}</p>
        </JanelaDeConfirmacao>
        <JanelaDeConfirmacao
          aberta={removendo !== null}
          aoFechar={() => setRemovendo(null)}
          perigo
          rotuloDoConfirmar={t("Remover passo")}
          aoConfirmar={() => {
            if (removendo) fluxo.removerNo(removendo);
            setRemovendo(null);
            setPainelSujo(false);
          }}
        >
          <p>{t("Tem certeza que deseja remover esse bloco?")}</p>
        </JanelaDeConfirmacao>
        <JanelaDeConfirmacao
          aberta={pendente !== null}
          aoFechar={() => setPendente(null)}
          titulo={configuracaoDoGatilho ? t("Configuração do gatilho não salva") : t("Configuração do passo não salva")}
          rotuloDoConfirmar={t("Descartar e continuar")}
          aoConfirmar={() => {
            const seguir = pendente;
            setPendente(null);
            setPainelSujo(false);
            seguir?.();
          }}
        >
          <p className="font-medium text-casca-texto">
            {configuracaoDoGatilho ? t("Você está saindo da configuração do gatilho") : t("Você está saindo da configuração do passo")}
          </p>
          <p>
            {configuracaoDoGatilho
              ? t("O que você preencheu neste gatilho será perdido se abrir outro item agora. Para manter, cancele e use o botão Salvar.")
              : t("O que você preencheu neste passo será perdido se abrir outro item agora. Para manter, cancele e use o botão Salvar.")}
          </p>
        </JanelaDeConfirmacao>
      </div>
    </AcoesDoNoContext.Provider>
  );
}
