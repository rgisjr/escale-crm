"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { JanelaDoDetalhe } from "@/components/escale/campanhas/molde/JanelaDoDetalhe";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useAcoesDaCampanha } from "@/hooks/escale/useCampanhasDaCasca";
import {
  baixarCsvDaCampanha,
  useDetalheDaCampanha,
  useMassaDaCampanha,
} from "@/hooks/escale/useDetalheDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { botaoDaLinha } from "@/lib/escale/campanhas/acoes-da-linha";
import {
  textoDosFiltrosDeDestinatarios,
  type FiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import type { SituacaoDosNegocios } from "@/lib/escale/campanhas/detalhe/tipos";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import { CirclePause, Play } from "@/lib/ui/icons-da-casca";

import { ColunaDaMensagem } from "./ColunaDaMensagem";
import { DetalhesDaCampanha } from "./DetalhesDaCampanha";
import { GavetaDeNegocios } from "./GavetaDeNegocios";
import { JanelaPausarCampanha } from "./JanelaPausarCampanha";
import { SumarioCarregando, SumarioDaCampanha } from "./SumarioDaCampanha";

type Aba = "sumario" | "detalhes";

/**
 * O DETALHE DA CAMPANHA NA CASCA (fork Escale, Fase 8C; 009–013; C1–C15): a
 * janela com Pausar/Retomar (só em andamento e pausada), "Baixar .CSV" e o X;
 * as abas Sumário e Detalhes; a gaveta de negócios e o diálogo de pausar.
 */
export function DetalheDaCampanhaDaCasca({
  id,
  origens,
  fuso,
  aoFechar,
}: {
  id: string;
  origens: OrigemParaCriar[];
  fuso?: string;
  aoFechar: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const consulta = useDetalheDaCampanha(id);
  const acoes = useAcoesDaCampanha();
  const massa = useMassaDaCampanha(id);
  const sessoes = useChannelSessions().data;
  const [aba, setAba] = useState<Aba>("sumario");
  const [filtros, setFiltros] = useState<FiltrosDeDestinatarios>({});
  const [gaveta, setGaveta] = useState<SituacaoDosNegocios | null>(null);
  const [pausando, setPausando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const dados = consulta.data;
  const fusoDaTela = dados?.fuso ?? fuso;
  const botao = dados ? botaoDaLinha(dados.campanha.status) : null;
  const nomeDoNumero = useMemo(() => {
    const nomes = new Map((sessoes ?? []).map((s) => [s.id, channelLabel(s, t)]));
    return (numero: string) => nomes.get(numero) ?? "—";
  }, [sessoes, t]);

  const verContatos = (f: FiltrosDeDestinatarios) => {
    setFiltros(f);
    setAba("detalhes");
  };

  async function criarDosNaoEnviados() {
    try {
      const r = await massa.mutateAsync({
        acao: "nova_campanha",
        alvo: {
          tipo: "filtro",
          f: textoDosFiltrosDeDestinatarios({ situacoes: ["nao_enviado"] }),
          excluidos: [],
        },
      });
      if (r.tipo !== "campanha") return;
      toast.success(t("A campanha foi criada como rascunho."));
      router.push(rotaDoRascunho(r.id));
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : t("Não consegui completar essa ação. Tente de novo."),
      );
    }
  }

  async function baixar() {
    if (!dados) return;
    setBaixando(true);
    try {
      await baixarCsvDaCampanha(id, dados.campanha.nome, fusoDaTela);
    } catch {
      toast.error(t("Não foi possível baixar o arquivo. Tente novamente."));
    } finally {
      setBaixando(false);
    }
  }

  async function pausar() {
    try {
      await acoes.mutateAsync({ id, acao: "pausar" });
      toast.success(t("Campanha pausada com sucesso!"));
      setPausando(false);
    } catch {
      toast.error(t("Falha ao pausar a campanha. Tente novamente."));
    }
  }

  async function retomar() {
    try {
      await acoes.mutateAsync({ id, acao: "retomar" });
      toast.success(t("Campanha retomada com sucesso!"));
    } catch {
      toast.error(t("Falha ao retomar a campanha. Tente novamente."));
    }
  }

  const naoAchou = consulta.error instanceof ApiError && consulta.error.status === 404;
  const contornado =
    "inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-60";
  const cheio =
    "inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-semibold text-white hover:bg-casca-marca-forte disabled:opacity-60";

  const acoesDoCabecalho = (
    <>
      {botao === "pausar" ? (
        <button
          type="button"
          disabled={acoes.isPending}
          onClick={() => setPausando(true)}
          className={contornado}
        >
          <CirclePause size={14} aria-hidden />
          {t("Pausar")}
        </button>
      ) : null}
      {botao === "retomar" ? (
        <button
          type="button"
          disabled={acoes.isPending}
          onClick={() => void retomar()}
          className={cheio}
        >
          <Play size={14} aria-hidden />
          {t("Retomar")}
        </button>
      ) : null}
      <button
        type="button"
        disabled={!dados || baixando}
        onClick={() => void baixar()}
        className={cheio}
      >
        {t("Baixar .CSV")}
      </button>
    </>
  );

  let corpo;
  if (consulta.isError) {
    corpo = (
      <div role="alert" className="py-16 text-center text-[13px]">
        <p>
          {naoAchou ? t("Campanha não encontrada.") : t("Não foi possível carregar a campanha.")}
        </p>
        {naoAchou ? null : (
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="mt-2 font-medium text-casca-marca hover:underline"
          >
            {t("Tentar novamente")}
          </button>
        )}
      </div>
    );
  } else if (!dados) {
    corpo = <SumarioCarregando />;
  } else if (aba === "sumario") {
    corpo = (
      <SumarioDaCampanha
        dados={dados}
        colunaDireita={
          <ColunaDaMensagem
            campanha={dados.campanha}
            nomeDoNumero={nomeDoNumero}
            fuso={fusoDaTela}
          />
        }
        aoVerContatos={verContatos}
        aoCriarCampanhaDosNaoEnviados={() => void criarDosNaoEnviados()}
        criando={massa.isPending}
        aoAbrirNegocios={setGaveta}
      />
    );
  } else {
    corpo = (
      <DetalhesDaCampanha
        campanha={dados.campanha}
        sumario={dados.sumario}
        motivos={dados.motivos}
        filtros={filtros}
        aoMudarFiltros={setFiltros}
        origens={origens}
        fuso={fusoDaTela}
      />
    );
  }

  return (
    <>
      <JanelaDoDetalhe
        aberta
        aoFechar={aoFechar}
        rotulo={t("Informações da campanha")}
        titulo={dados?.campanha.nome ?? t("Carregando campanha")}
        acoes={acoesDoCabecalho}
        abas={[
          { valor: "sumario", rotulo: t("Sumário") },
          { valor: "detalhes", rotulo: t("Detalhes") },
        ]}
        abaAtiva={aba}
        aoTrocarAba={(v) => setAba(v === "detalhes" ? "detalhes" : "sumario")}
      >
        {corpo}
      </JanelaDoDetalhe>
      {dados ? (
        <GavetaDeNegocios
          campanhaId={id}
          nomeDaCampanha={dados.campanha.nome}
          situacao={gaveta}
          aoFechar={() => setGaveta(null)}
          fuso={fusoDaTela}
        />
      ) : null}
      <JanelaPausarCampanha
        aberta={pausando}
        ocupado={acoes.isPending}
        aoFechar={() => setPausando(false)}
        aoConfirmar={() => void pausar()}
      />
    </>
  );
}
