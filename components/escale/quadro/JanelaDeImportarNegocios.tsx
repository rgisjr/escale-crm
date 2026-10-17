"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  PassoArquivo,
  PassoConfiguracoes,
  PassoMapeamento,
  PassoPrevia,
  PassoPronto,
  type EtapaDaImportacao,
  type ResumoDaImportacao,
} from "@/components/escale/quadro/ConteudoDaImportacao";
import { PassosDaImportacao } from "@/components/escale/quadro/PassosDaImportacao";
import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { lerArquivoCsv } from "@/lib/escale/importar/ler-arquivo";
import {
  csvMapeado,
  podeContinuar,
  sugerirMapa,
  type ChaveDaImportacao,
  type MapaDaImportacao,
} from "@/lib/escale/importar/mapear";
import { ChevronRight, Upload } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Passo = 1 | 2 | 3 | 4 | "pronto";
interface ArquivoLido {
  nome: string;
  linhas: string[][];
}

export interface JanelaDeImportarNegociosProps {
  aberta: boolean;
  onFechar: () => void;
  pipelineId: string;
  nomeDaOrigem: string;
  /** Só as etapas abertas: a página já tirou ganho, perda e arquivadas. */
  etapas: readonly EtapaDaImportacao[];
  tagsDoQuadro: readonly string[];
  aoImportar: () => void;
}

const BOTAO_BASE =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] px-3.5 text-[13px] whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:ring-offset-2";
const BOTAO_DA_MARCA = `${BOTAO_BASE} bg-casca-marca font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:pointer-events-none disabled:opacity-45`;
const BOTAO_DE_CONTORNO = `${BOTAO_BASE} border border-[#D9D8E0] text-casca-texto hover:bg-casca-raia`;

/** O balão escuro da Clint explica um "Continuar" desligado; o botão desligado não recebe o mouse, então o gatilho é o que o envolve. */
function BotaoDoRodape({
  desabilitado,
  dica,
  aoClicar,
  children,
}: {
  desabilitado: boolean;
  dica?: string;
  aoClicar: () => void;
  children: ReactNode;
}) {
  const botao = (
    <button type="button" disabled={desabilitado} onClick={aoClicar} className={BOTAO_DA_MARCA}>
      {children}
    </button>
  );
  if (!desabilitado || !dica) return botao;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{botao}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{dica}</TooltipContent>
    </Tooltip>
  );
}

/**
 * "IMPORTAR NEGÓCIOS" (fork Escale, Fase 1E; Clint v2, v2-06 a v2-11): a janela
 * de 4 passos (Arquivo, Mapeamento, Configurações, Prévia e confirmação). O
 * passo "Decisões" da Clint não existe aqui (E10a). Sem X: fecha por Cancelar,
 * Esc ou clique fora. Só monta aberta, então cada uso começa no passo 1.
 */
export function JanelaDeImportarNegocios(props: JanelaDeImportarNegociosProps) {
  if (!props.aberta) return null;
  return <JanelaAberta {...props} />;
}

function JanelaAberta({
  onFechar,
  pipelineId,
  nomeDaOrigem,
  etapas,
  tagsDoQuadro,
  aoImportar,
}: JanelaDeImportarNegociosProps) {
  const t = useT();
  const [passo, setPasso] = useState<Passo>(1);
  const [arquivo, setArquivo] = useState<ArquivoLido | null>(null);
  const [erroDoArquivo, setErroDoArquivo] = useState<string | null>(null);
  const [mapa, setMapa] = useState<MapaDaImportacao>([]);
  const [etapa, setEtapa] = useState(etapas[0]?.id ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [resumo, setResumo] = useState<ResumoDaImportacao | null>(null);
  /** Qual escolha de arquivo é a mais nova: a leitura antiga que termina depois é ignorada. */
  const escolhaAtual = useRef(0);

  const rotulos = [t("Arquivo"), t("Mapeamento"), t("Configurações"), t("Prévia e confirmação")];
  const numero = passo === "pronto" ? rotulos.length + 1 : passo;

  async function escolherArquivo(escolhido: File) {
    const minhaEscolha = ++escolhaAtual.current;
    const lido = await lerArquivoCsv(escolhido, t);
    if (minhaEscolha !== escolhaAtual.current) return;
    if ("erro" in lido) {
      setArquivo(null);
      setErroDoArquivo(lido.erro);
      return;
    }
    setErroDoArquivo(null);
    setArquivo({ nome: escolhido.name, linhas: lido.linhas });
    setMapa(sugerirMapa(lido.linhas[0] ?? []));
  }

  function mudarMapa(indice: number, chave: ChaveDaImportacao | null) {
    setMapa((atual) => atual.map((c, i) => (i === indice ? chave : c)));
  }

  async function confirmar() {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const form = new FormData();
      form.append(
        "file",
        new File([csvMapeado(arquivo.linhas, mapa, tags)], arquivo.nome, { type: "text/csv" }),
      );
      form.append("pipeline_id", pipelineId);
      form.append("stage_id", etapa);
      const res = await fetch("/api/v1/leads/import", { method: "POST", body: form });
      // Um proxy (502, 413) responde HTML, não JSON: o corpo ilegível vira mensagem clara, não exceção.
      const json = await res
        .json()
        .then((corpo: unknown) => corpo as { data?: ResumoDaImportacao; error?: { message?: string } })
        .catch(() => null);
      if (!json) {
        toast.error(
          res.status === 413
            ? t("O arquivo CSV excede o limite máximo de 5 MB.")
            : t("Não consegui enviar o arquivo."),
        );
        return;
      }
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? t("Não consegui ler essa planilha."));
        return;
      }
      setResumo(json.data);
      setPasso("pronto");
      aoImportar();
    } catch {
      toast.error(t("Não consegui enviar o arquivo."));
    } finally {
      setEnviando(false);
    }
  }

  const nomeDaEtapa = etapas.find((e) => e.id === etapa)?.name ?? "";

  function corpo(): ReactNode {
    if (passo === "pronto" && resumo) return <PassoPronto resumo={resumo} />;
    if (passo === 1) {
      return (
        <PassoArquivo
          nomeDoArquivo={arquivo?.nome ?? null}
          erro={erroDoArquivo}
          aoEscolher={(f) => void escolherArquivo(f)}
        />
      );
    }
    if (!arquivo) return null;
    if (passo === 2)
      return (
        <PassoMapeamento cabecalho={arquivo.linhas[0] ?? []} mapa={mapa} aoMudar={mudarMapa} />
      );
    if (passo === 3) {
      return (
        <PassoConfiguracoes
          nomeDaOrigem={nomeDaOrigem}
          etapas={etapas}
          etapa={etapa}
          aoMudarEtapa={setEtapa}
          tagsDoQuadro={tagsDoQuadro}
          tags={tags}
          aoMudarTags={setTags}
        />
      );
    }
    return (
      <PassoPrevia
        nomeDoArquivo={arquivo.nome}
        camposMapeados={mapa.filter(Boolean).length}
        nomeDaEtapa={nomeDaEtapa}
        linhas={arquivo.linhas.length - 1}
      />
    );
  }

  function rodape(): ReactNode {
    const voltar = (para: 1 | 2 | 3) => (
      <button
        type="button"
        disabled={enviando}
        onClick={() => setPasso(para)}
        className={cn(BOTAO_DE_CONTORNO, "disabled:pointer-events-none disabled:opacity-45")}
      >
        {t("Voltar")}
      </button>
    );
    const continuar = (para: 2 | 3 | 4, desabilitado: boolean, dica?: string) => (
      <BotaoDoRodape desabilitado={desabilitado} dica={dica} aoClicar={() => setPasso(para)}>
        {t("Continuar")}
        <ChevronRight size={14} aria-hidden />
      </BotaoDoRodape>
    );
    if (passo === 1) {
      return (
        <>
          <button type="button" onClick={onFechar} className={BOTAO_DE_CONTORNO}>
            {t("Cancelar")}
          </button>
          {continuar(2, !arquivo)}
        </>
      );
    }
    if (passo === 2) {
      return (
        <>
          {voltar(1)}
          {continuar(
            3,
            !podeContinuar(mapa),
            t("Para continuar você precisa associar pelo menos o nome do negócio ou do contato."),
          )}
        </>
      );
    }
    if (passo === 3) {
      return (
        <>
          {voltar(2)}
          {continuar(4, !etapa)}
        </>
      );
    }
    if (passo === 4) {
      return (
        <>
          {voltar(3)}
          <button
            type="button"
            disabled={enviando}
            onClick={() => void confirmar()}
            className={BOTAO_DA_MARCA}
          >
            <Upload size={14} aria-hidden />
            {t("Confirmar e importar")}
          </button>
        </>
      );
    }
    return (
      <>
        <span />
        <button type="button" onClick={onFechar} className={BOTAO_DA_MARCA}>
          {t("Fechar")}
        </button>
      </>
    );
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(aberta) => {
        if (!aberta && !enviando) onFechar();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/48" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed top-[50%] left-[50%] z-50 flex h-[min(690px,calc(100dvh-2rem))] w-[min(1040px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-[12px] bg-surface text-casca-texto shadow-casca-painel",
          )}
        >
          <DialogTitle className="sr-only">{t("Importar negócios")}</DialogTitle>
          <TooltipProvider delayDuration={100}>
            <PassosDaImportacao atual={numero} rotulos={rotulos} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{corpo()}</div>
            <div className="flex h-16 shrink-0 items-center justify-between border-t border-[#F1F0F5] px-6">
              {rodape()}
            </div>
          </TooltipProvider>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
