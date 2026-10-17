"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Alerta } from "@/components/escale/origens/JanelasDoGrupo";
import type { PropsDaJanela } from "@/components/escale/origens/JanelasDeOrigens";
import { BotaoDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import {
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  useConfiguracoesDaOrigem,
  useSalvarConfiguracoes,
} from "@/hooks/escale/useConfiguracoesDaOrigem";
import { useAtualizarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import {
  algoMudou,
  pedidoDoSalvar,
  rascunhoInicial,
  type RascunhoDaOrigem,
} from "@/lib/escale/configuracoes/rascunho";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  Clock,
  EyeOff,
  ReceiptText,
  Settings,
  Shuffle,
  Users,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AbaDeEtapas } from "./AbaDeEtapas";
import { EmBreve } from "./EmBreve";

export type SubabaDaOrigem =
  | "gerais"
  | "motivos"
  | "distribuicao"
  | "permissoes"
  | "atribuicao"
  | "campos_visiveis"
  | "campos"
  | "alerta"
  | "notificacoes";

/** O que cada subaba recebe: a origem como está, o rascunho e como mudá-lo. */
export interface PropsDaSecao {
  config: ConfiguracoesDaOrigem;
  rascunho: RascunhoDaOrigem;
  mudar: (f: (r: RascunhoDaOrigem) => RascunhoDaOrigem) => void;
}

/**
 * A JANELA DE CONFIGURAÇÕES DA ORIGEM (Fase 1F, D1; Clint 01-013 superior).
 * Guarda o rascunho das subabas e tem UM "Salvar": nome, grupo e padrão vão
 * pelas rotas da 1B; o resto, numa gravação só na rota de configurações. Salvou,
 * fecha. Sem X: fecha com Esc ou Cancelar.
 */
export function JanelaDaOrigem({
  id,
  origens,
  onFechar,
  onOrigens,
}: PropsDaJanela & { id: string }) {
  const t = useT();
  const consulta = useConfiguracoesDaOrigem(id);
  const salvar = useSalvarConfiguracoes(id);
  const atualizar = useAtualizarOrigem();
  const [aba, setAba] = useState<"geral" | "etapas">("geral");
  const [subaba, setSubaba] = useState<SubabaDaOrigem>("gerais");
  // O rascunho é o que a pessoa mexeu; enquanto não mexe, vale a origem como veio do servidor.
  const [editado, setEditado] = useState<RascunhoDaOrigem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const config = consulta.data;

  const inicial = useMemo(() => (config ? rascunhoInicial(config) : null), [config]);
  const rascunho = editado ?? inicial;

  const nome = config?.pipeline.name ?? origens.funis.find((f) => f.id === id)?.name ?? "";
  const mudar = (f: (r: RascunhoDaOrigem) => RascunhoDaOrigem) =>
    setEditado((e) => {
      const base = e ?? inicial;
      return base ? f(base) : e;
    });
  const ocupado = salvar.isPending || atualizar.isPending;
  const podeSalvar = !!config && !!rascunho && algoMudou(rascunho, config) && !ocupado;

  const menu: Array<{ id: SubabaDaOrigem; rotulo: string; icone: LucideIcon; emBreve?: string }> = [
    { id: "gerais", rotulo: t("Configurações Gerais"), icone: Settings },
    { id: "motivos", rotulo: t("Motivo de Perda"), icone: CircleSlash },
    {
      id: "distribuicao",
      rotulo: t("Distribuição de dono"),
      icone: Shuffle,
      emBreve: t("Chega na fase 1K, com a distribuição por percentual."),
    },
    {
      id: "permissoes",
      rotulo: t("Permissão de usuários"),
      icone: Users,
      emBreve: t("Chega na fase 1J, com o acesso por origem."),
    },
    {
      id: "atribuicao",
      rotulo: t("Atribuição de ganho"),
      icone: ReceiptText,
      emBreve: t("Chega na fase 1K."),
    },
    {
      id: "campos_visiveis",
      rotulo: t("Visualização de campos"),
      icone: EyeOff,
      emBreve: t("Chega com o módulo Contatos (Fase 2)."),
    },
    { id: "campos", rotulo: t("Campos obrigatórios"), icone: CheckCircle2 },
    { id: "alerta", rotulo: t("Alerta de tempo na etapa"), icone: Clock },
    {
      id: "notificacoes",
      rotulo: t("Notificações"),
      icone: Bell,
      emBreve: t("Chega na fase 1K, com os avisos dentro do app."),
    },
  ];
  const atual = menu.find((m) => m.id === subaba) ?? menu[0]!;

  async function aoSalvar() {
    if (!config || !rascunho) return;
    setErro(null);
    const pedido = pedidoDoSalvar(rascunho, config);
    if (!pedido.ok) {
      setErro(t(pedido.erro));
      setSubaba(pedido.secao);
      return;
    }
    try {
      if (Object.keys(pedido.mudancaDaOrigem).length > 0) {
        onOrigens(await atualizar.mutateAsync({ id, mudanca: pedido.mudancaDaOrigem }));
      }
      if (pedido.patch) await salvar.mutateAsync(pedido.patch);
      toast.success(t("Origem alterada com sucesso!"));
      onFechar();
    } catch (e) {
      setErro(`${t("Falha na edição da origem!")} ${textoDoErro(e, t)}`);
    }
  }

  function conteudo(props: PropsDaSecao) {
    if (atual.emBreve) return <EmBreve titulo={atual.rotulo} texto={atual.emBreve} />;
    switch (atual.id) {
      case "gerais":
        return <div>{/* SECAO_GERAIS */}</div>;
      case "motivos":
        return <div>{/* SECAO_MOTIVOS */}</div>;
      case "campos":
        return <div>{/* SECAO_CAMPOS */}</div>;
      case "alerta":
        return <div>{/* SECAO_ALERTA */}</div>;
      default:
        return null;
    }
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          data-escale-janela-da-origem=""
          className="ds-modal fixed inset-x-2 top-1/2 z-50 flex max-h-[calc(100dvh-100px)] -translate-y-1/2 flex-col overflow-hidden rounded-[12px] bg-surface text-casca-texto shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
        >
          <TooltipProvider delayDuration={150}>
            <div className="px-[26px] pt-[22px]">
              <DialogTitle className="text-[22px] leading-[30px] font-normal text-casca-texto">
                {nome}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("Configurações da origem")}
              </DialogDescription>
              <div className="mt-3">
                <AbasDaCasca
                  aria-label={t("Configurações da origem")}
                  valor={aba}
                  aoMudar={setAba}
                  abas={[
                    { valor: "geral", rotulo: t("Geral") },
                    { valor: "etapas", rotulo: t("Etapas e atividades") },
                  ]}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-[26px]">
              {consulta.isPending ? (
                <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>
              ) : consulta.isError || !config || !rascunho ? (
                <div role="alert" className="flex items-center gap-3 text-[13px] text-casca-alerta">
                  {t("Não consegui abrir as configurações desta origem.")}
                  <BotaoDaJanela variante="cancelar" onClick={() => void consulta.refetch()}>
                    {t("Tentar de novo")}
                  </BotaoDaJanela>
                </div>
              ) : aba === "etapas" ? (
                <AbaDeEtapas config={config} />
              ) : (
                <div className="flex gap-12">
                  <nav
                    aria-label={t("Configurações da origem")}
                    className="w-[364px] shrink-0 self-start rounded-[12px] bg-casca-marca-suave py-6"
                  >
                    {menu.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-current={m.id === subaba ? "page" : undefined}
                        onClick={() => setSubaba(m.id)}
                        className={cn(
                          "flex h-10 w-full items-center gap-3 px-5 text-left text-[13px] text-casca-texto",
                          m.id === subaba && "font-semibold",
                        )}
                      >
                        <span
                          aria-hidden
                          className="grid size-6 shrink-0 place-items-center text-casca-meta"
                        >
                          <m.icone size={14} />
                        </span>
                        {m.rotulo}
                      </button>
                    ))}
                  </nav>
                  <div className="max-w-[784px] min-w-0 flex-1 pb-6">
                    <Alerta texto={erro} />
                    {conteudo({ config, rascunho, mudar })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-8 pt-3 pb-[22px]">
              <BotaoDaJanela variante="cancelar" onClick={onFechar}>
                {t("Cancelar")}
              </BotaoDaJanela>
              {aba === "etapas" ? (
                <span className="inline-flex">
                  <BotaoDaJanela variante="salvar" disabled className="rounded-r-none">
                    {t("Salvar na origem")}
                  </BotaoDaJanela>
                  <BotaoDaJanela
                    variante="salvar"
                    disabled
                    aria-label={t("Mais opções de salvar")}
                    className="rounded-l-none border-l border-white/40 px-2"
                  >
                    <ChevronDown size={14} aria-hidden />
                  </BotaoDaJanela>
                </span>
              ) : (
                <BotaoDaJanela
                  variante="salvar"
                  disabled={!podeSalvar}
                  onClick={() => void aoSalvar()}
                >
                  {t("Salvar")}
                </BotaoDaJanela>
              )}
            </div>
          </TooltipProvider>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
