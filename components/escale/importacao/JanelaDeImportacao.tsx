"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useCriarImportacao, useDestinosDaImportacao } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast } from "@/lib/auth/types";
import { CATALOGO_VAZIO } from "@/lib/escale/campos/regras";
import { ARQUIVO_MAX_BYTES, lerCabecalho } from "@/lib/escale/importacao/linhas";
import { mapeamentoValido, opcoesDoMapeamento, sugerirMapeamento } from "@/lib/escale/importacao/mapeamento";
import { decisoesDoNivel, nivelDasDecisoes, type ColunaMapeada, type Decisoes, type TipoDeImportacao } from "@/lib/escale/importacao/regras";
import type { Configuracao } from "@/lib/escale/importacao/tipos";
import { ChevronRight, Upload } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_DA_MARCA, BOTAO_DE_CONTORNO, BotaoDoRodape } from "./pecas";
import { acompanharImportacao } from "./AcompanharImportacoes";
import { PassoArquivo } from "./PassoArquivo";
import { PassoConfiguracoes, podeContinuarConfiguracoes } from "./PassoConfiguracoes";
import { PassoDecisoes } from "./PassoDecisoes";
import { PassoMapeamento } from "./PassoMapeamento";
import { PassoPrevia } from "./PassoPrevia";
import { PassosDaImportacao } from "./PassosDaImportacao";

export interface JanelaDeImportacaoProps {
  aberta: boolean;
  aoFechar: () => void;
  tipoInicial: TipoDeImportacao;
  /** Vindo do quadro: a troca Contatos/Negócios fica presa em Negócios. */
  travarTipo?: boolean;
  /** Vindo do quadro: a origem do quadro já escolhida no passo 3. */
  origemInicial?: string | null;
  aoImportar?: (id: string) => void;
}

const CABECALHO_MAX_BYTES = 64 * 1024;

/**
 * "IMPORTAR" (fork Escale, Fase 2F; Clint "Import Studio" `go`, prints 2b-41 e
 * v2-06 a v2-11): o assistente de 5 passos para contatos e negócios. Sem X:
 * fecha por Cancelar, Esc ou clique fora. Só monta aberta, então cada uso começa
 * no passo 1.
 */
export function JanelaDeImportacao(props: JanelaDeImportacaoProps) {
  if (!props.aberta) return null;
  return <JanelaAberta {...props} />;
}

function JanelaAberta({ aoFechar, tipoInicial, travarTipo = false, origemInicial = null, aoImportar }: JanelaDeImportacaoProps) {
  const t = useT();
  const router = useRouter();
  const { activeOrg } = useAuth();
  const admin = roleAtLeast(activeOrg?.role, "admin");
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<TipoDeImportacao>(tipoInicial);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [cabecalho, setCabecalho] = useState<string[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erroDoArquivo, setErroDoArquivo] = useState<string | null>(null);
  const [mapa, setMapa] = useState<ColunaMapeada[]>([]);
  const [config, setConfig] = useState<Configuracao>({ tags: [], origemId: origemInicial, etapaId: null, status: "open", motivoDePerda: null });
  const [decisoes, setDecisoes] = useState<Decisoes>(() => decisoesDoNivel("conservador"));
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null);
  const escolhaAtual = useRef(0);
  const envioAtual = useRef<AbortController | null>(null);
  const criar = useCriarImportacao();

  const contato = useCatalogoDeCampos("contato").catalogo ?? CATALOGO_VAZIO;
  const empresa = useCatalogoDeCampos("empresa").catalogo ?? CATALOGO_VAZIO;
  const negocio = useCatalogoDeCampos("negocio", tipo === "negocio").catalogo ?? CATALOGO_VAZIO;
  const opcoes = useMemo(() => opcoesDoMapeamento(tipo, { contato, empresa, negocio }), [tipo, contato, empresa, negocio]);
  const destinos = useDestinosDaImportacao(tipo === "negocio").data ?? [];

  // A origem do quadro chega sem etapa: quando os destinos carregam, vale a primeira etapa aberta (Clint: a etapa de entrada).
  useEffect(() => {
    if (config.origemId && !config.etapaId) {
      const etapa = destinos.find((d) => d.id === config.origemId)?.etapas[0]?.id;
      if (etapa) setConfig((c) => ({ ...c, etapaId: etapa }));
    }
  }, [destinos, config.origemId, config.etapaId]);

  const rotulos = [t("Arquivo"), t("Mapeamento"), t("Configurações"), t("Decisões"), t("Prévia e confirmação")];

  async function escolherArquivo(escolhido: File) {
    const minha = ++escolhaAtual.current;
    if (!/\.csv$/i.test(escolhido.name)) {
      setErroDoArquivo(t("Selecione um arquivo .CSV válido."));
      return;
    }
    if (escolhido.size > ARQUIVO_MAX_BYTES) {
      setErroDoArquivo(t("O arquivo passa de 25 MB."));
      return;
    }
    setErroDoArquivo(null);
    setLendo(true);
    // Q0b (B5-1): se a leitura falhar, destrava a janela e mostra o erro (antes ficava em "Enviando arquivo…").
    let lido: string[] | null = null;
    try {
      lido = lerCabecalho(await escolhido.slice(0, CABECALHO_MAX_BYTES).arrayBuffer());
    } catch {
      lido = null;
    }
    if (minha !== escolhaAtual.current) return;
    setLendo(false);
    if (!lido || lido.length === 0) {
      setArquivo(null);
      setErroDoArquivo(t("Não foi possível ler o arquivo enviado. Envie a planilha novamente."));
      return;
    }
    setArquivo(escolhido);
    setCabecalho(lido);
    setMapa(sugerirMapeamento(lido, tipo, opcoes));
  }

  function mudarTipo(novo: TipoDeImportacao) {
    setTipo(novo);
    if (cabecalho) setMapa(sugerirMapeamento(cabecalho, novo, opcoesDoMapeamento(novo, { contato, empresa, negocio })));
  }

  /** Fecha a janela; se o arquivo ainda está subindo, desiste do envio em vez de prender a tela. */
  function fechar() {
    envioAtual.current?.abort();
    aoFechar();
  }

  async function confirmar() {
    if (!arquivo) return;
    setErroDoEnvio(null);
    const envio = new AbortController();
    envioAtual.current = envio;
    try {
      const criada = await criar.mutateAsync({
        signal: envio.signal,
        arquivo,
        pedido: { tipo, nivel: nivelDasDecisoes(decisoes, tipo, mapa), decisoes, mapeamento: mapa, configuracao: config },
      });
      acompanharImportacao(criada.id);
      toast.success(t("Importação iniciada"), {
        action: { label: t("Ver importações"), onClick: () => router.push("/app/imports") },
      });
      aoImportar?.(criada.id);
      aoFechar();
    } catch (e) {
      if (envio.signal.aborted) return;
      setErroDoEnvio(t(e instanceof Error ? e.message : "Não foi possível iniciar a importação."));
    }
  }

  const podeContinuar = [
    !!arquivo && !lendo,
    mapeamentoValido(mapa, tipo),
    podeContinuarConfiguracoes(tipo, config),
    true,
  ][passo];

  function corpo(): ReactNode {
    if (passo === 0) {
      return (
        <PassoArquivo
          tipo={tipo}
          aoMudarTipo={mudarTipo}
          travarTipo={travarTipo}
          nomeDoArquivo={arquivo?.name ?? null}
          lendo={lendo}
          erro={erroDoArquivo}
          aoEscolher={(f) => void escolherArquivo(f)}
        />
      );
    }
    if (passo === 1) {
      return (
        <PassoMapeamento
          tipo={tipo}
          mapa={mapa}
          opcoes={opcoes}
          podeCriarCampo={admin}
          aoMudar={(i, para) => setMapa((atual) => atual.map((c, j) => (j === i ? { ...c, para } : c)))}
        />
      );
    }
    if (passo === 2) return <PassoConfiguracoes tipo={tipo} config={config} destinos={destinos} podeGanhar={admin} aoMudar={setConfig} />;
    if (passo === 3) return <PassoDecisoes tipo={tipo} mapa={mapa} decisoes={decisoes} aoMudar={setDecisoes} />;
    return <PassoPrevia tipo={tipo} nomeDoArquivo={arquivo?.name ?? ""} mapa={mapa} decisoes={decisoes} />;
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(aberta) => {
        if (!aberta) fechar();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/48" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[50%] left-[50%] z-50 flex h-[min(690px,calc(100dvh-2rem))] w-[min(1040px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-[12px] bg-surface text-casca-texto shadow-casca-painel"
        >
          <DialogTitle className="sr-only">{tipo === "negocio" ? t("Importar negócios") : t("Importar contatos")}</DialogTitle>
          <TooltipProvider delayDuration={100}>
            <PassosDaImportacao atual={passo + 1} rotulos={rotulos} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{corpo()}</div>
            <div className="flex h-16 shrink-0 items-center justify-between border-t border-[#F1F0F5] px-6">
              <button
                type="button"
                onClick={() => (passo === 0 || criar.isPending ? fechar() : setPasso(passo - 1))}
                className={BOTAO_DE_CONTORNO}
              >
                {passo === 0 || criar.isPending ? t("Cancelar") : t("Voltar")}
              </button>
              <div className="flex items-center gap-3">
                {erroDoEnvio ? (
                  <p role="alert" className="text-[13px] text-casca-alerta">
                    {erroDoEnvio}
                  </p>
                ) : null}
                {passo === 4 ? (
                  <button type="button" disabled={criar.isPending} onClick={() => void confirmar()} className={cn(BOTAO_DA_MARCA)}>
                    <Upload size={14} aria-hidden />
                    {t("Confirmar e importar")}
                  </button>
                ) : (
                  <BotaoDoRodape
                    desabilitado={!podeContinuar}
                    dica={passo === 1 ? t("Para continuar, ligue ao menos uma coluna ao nome, e-mail ou telefone.") : undefined}
                    aoClicar={() => setPasso(passo + 1)}
                  >
                    {t("Continuar")}
                    <ChevronRight size={14} aria-hidden />
                  </BotaoDoRodape>
                )}
              </div>
            </div>
          </TooltipProvider>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
