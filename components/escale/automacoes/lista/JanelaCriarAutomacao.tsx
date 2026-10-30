"use client";
import { useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { FormaDeMontar } from "@/lib/escale/automacoes/rotas";
import type { PastaDeAutomacao } from "@/lib/escale/automacoes/tipos";
import { ListChecks, Workflow } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CabecalhoDaJanelaDeNome, CampoDoNome, RodapeDaJanelaDeNome, useCampoDoNome } from "./CampoDoNome";

const SEM_PASTA = "__sem_pasta__";

export type NovaAutomacao = { nome: string; pastaId: string | null; forma: FormaDeMontar };

function CartaoDeForma({
  escolhido,
  aoEscolher,
  icone,
  titulo,
  descricao,
}: {
  escolhido: boolean;
  aoEscolher: () => void;
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={escolhido}
      onClick={aoEscolher}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
        escolhido ? "border-casca-marca bg-casca-marca-suave" : "border-casca-divisoria hover:bg-casca-raia",
      )}
    >
      <span className={escolhido ? "text-casca-marca" : "text-casca-suave"}>{icone}</span>
      <span className="text-[13px] font-medium text-casca-texto">{titulo}</span>
      <span className="text-[12px] text-casca-suave">{descricao}</span>
    </button>
  );
}

function Conteudo({
  pastas,
  pastaInicial,
  aoFechar,
  aoCriar,
}: {
  pastas: readonly PastaDeAutomacao[];
  pastaInicial: string | null;
  aoFechar: () => void;
  aoCriar: (e: NovaAutomacao) => void;
}) {
  const t = useT();
  const campo = useCampoDoNome("");
  const [pasta, setPasta] = useState(pastaInicial ?? SEM_PASTA);
  const [forma, setForma] = useState<FormaDeMontar>("fluxo");

  function salvar() {
    const nome = campo.validar();
    if (nome === null) return;
    aoCriar({ nome, pastaId: pasta === SEM_PASTA ? null : pasta, forma });
  }

  return (
    <>
      <CabecalhoDaJanelaDeNome titulo={t("Criar nova automação")} />
      <div className="flex flex-col gap-5 px-6 py-6">
        <CampoDoNome valor={campo.nome} aoMudar={campo.setNome} aoEnter={salvar} />
        {pastas.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-casca-texto">{t("Pasta")}</span>
            <SeletorDaCasca
              aparencia="filtro"
              aria-label={t("Pasta")}
              valor={pasta}
              aoMudar={(v) => setPasta(v || SEM_PASTA)}
              opcoes={[
                { valor: SEM_PASTA, rotulo: t("Sem pasta") },
                ...pastas.map((p) => ({ valor: p.id, rotulo: p.nome })),
              ]}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-casca-texto">{t("Como você quer montar?")}</span>
          <div className="grid grid-cols-2 gap-3">
            <CartaoDeForma
              escolhido={forma === "fluxo"}
              aoEscolher={() => setForma("fluxo")}
              icone={<Workflow size={18} aria-hidden />}
              titulo={t("No fluxo")}
              descricao={t("Monte com caixas ligadas, do gatilho às ações.")}
            />
            <CartaoDeForma
              escolhido={forma === "editor"}
              aoEscolher={() => setForma("editor")}
              icone={<ListChecks size={18} aria-hidden />}
              titulo={t("No editor")}
              descricao={t("Monte num formulário, passo a passo.")}
            />
          </div>
        </div>
      </div>
      <RodapeDaJanelaDeNome aoCancelar={aoFechar} aoSalvar={salvar} desabilitado={campo.vazio} />
    </>
  );
}

/** "Criar nova automação" (07-006, B15): nome, pasta e "Como você quer montar?". Não grava nada: abre a forma escolhida. */
export function JanelaCriarAutomacao({
  aberta,
  aoFechar,
  pastas,
  pastaInicial,
  aoCriar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  pastas: readonly PastaDeAutomacao[];
  pastaInicial: string | null;
  aoCriar: (e: NovaAutomacao) => void;
}) {
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(576px,calc(100vw-2rem))] gap-0 rounded-xl p-0">
      {aberta && <Conteudo pastas={pastas} pastaInicial={pastaInicial} aoFechar={aoFechar} aoCriar={aoCriar} />}
    </JanelaDaCasca>
  );
}
