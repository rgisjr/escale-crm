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
import { useSalvarDistribuicao } from "@/hooks/escale/useDistribuicao";
import { useAtualizarOrigem } from "@/hooks/escale/useOrigens";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePlaybookDaOrigem, useSalvarPlaybook } from "@/hooks/escale/usePlaybookDaOrigem";
import type { AbaDaOrigem } from "@/lib/escale/configuracoes/abrir";
import {
  doServidor,
  paraOServidor,
  playbookMudou,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";
import { useT } from "@/hooks/i18n/useT";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import { gravarNaOrdem, planoDeGravacao } from "@/lib/escale/configuracoes/ordem-de-gravacao";
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
import { membrosAtivosDaEquipe } from "./ListaDePessoas";
import { SecaoAlerta } from "./SecaoAlerta";
import { SecaoAtribuicao } from "./SecaoAtribuicao";
import { SecaoNotificacoes } from "./SecaoNotificacoes";
import { SecaoCampos } from "./SecaoCampos";
import { SecaoDistribuicao } from "./SecaoDistribuicao";
import { SecaoGerais } from "./SecaoGerais";
import { SecaoMotivos } from "./SecaoMotivos";
import { SecaoPermissoes } from "./SecaoPermissoes";

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
 * Guarda o rascunho das subabas (um "Salvar") e o do playbook (o "Salvar na origem", Fase 1I): nome, grupo e padrão vão
 * pelas rotas da 1B; o resto, numa gravação só na rota de configurações. Salvou,
 * fecha. Sem X: fecha com Esc ou Cancelar.
 *
 * Fase 1K: a subaba "Distribuição de dono" (só admin), com a rota própria no mesmo "Salvar" e o
 * "Resetar distribuição" logo abaixo da tabela (SecaoDistribuicao). Fase 1K: a subaba "Atribuição de ganho".
 * Fase 1K: a subaba "Notificações" (aviso dentro do app).
 */
export function JanelaDaOrigem({
  id,
  origens,
  onFechar,
  onOrigens,
  abaInicial = "geral",
}: PropsDaJanela & { id: string; abaInicial?: AbaDaOrigem }) {
  const t = useT();
  const consulta = useConfiguracoesDaOrigem(id);
  const salvar = useSalvarConfiguracoes(id);
  const atualizar = useAtualizarOrigem();
  const salvarDistribuicao = useSalvarDistribuicao(id);
  const equipe = useTeamMembers();
  const [aba, setAba] = useState<AbaDaOrigem>(abaInicial);
  const [subaba, setSubaba] = useState<SubabaDaOrigem>("gerais");
  // O rascunho é o que a pessoa mexeu; enquanto não mexe, vale a origem como veio do servidor.
  const [editado, setEditado] = useState<RascunhoDaOrigem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const config = consulta.data;

  const inicial = useMemo(() => (config ? rascunhoInicial(config) : null), [config]);
  const rascunho = editado ?? inicial;
  // O playbook (Fase 1I) tem rascunho próprio: "Salvar na origem" é separado do "Salvar" da aba Geral.
  const playbook = usePlaybookDaOrigem(id);
  const salvarPlaybook = useSalvarPlaybook(id);
  const playbookSalvo = useMemo(() => playbook.data?.map(doServidor) ?? null, [playbook.data]);
  const [playbookEditado, setPlaybookEditado] = useState<readonly AtividadeDoPlaybook[] | null>(
    null,
  );
  const [erroDoPlaybook, setErroDoPlaybook] = useState<string | null>(null);
  const [confirmarDesfazer, setConfirmarDesfazer] = useState(false);
  const rascunhoDoPlaybook = playbookEditado ?? playbookSalvo;
  const playbookMexido =
    !!playbookSalvo && !!playbookEditado && playbookMudou(playbookEditado, playbookSalvo);
  const mudarPlaybook = (
    f: (l: readonly AtividadeDoPlaybook[]) => readonly AtividadeDoPlaybook[],
  ) => setPlaybookEditado((e) => f(e ?? playbookSalvo ?? []));

  const nome = origens.funis.find((f) => f.id === id)?.name ?? config?.pipeline.name ?? "";
  const mudar = (f: (r: RascunhoDaOrigem) => RascunhoDaOrigem) =>
    setEditado((e) => {
      const base = e ?? inicial;
      return base ? f(base) : e;
    });
  const ocupado = salvar.isPending || atualizar.isPending || salvarDistribuicao.isPending;
  const podeSalvar = !!config && !!rascunho && algoMudou(rascunho, config) && !ocupado;

  const menu: Array<{ id: SubabaDaOrigem; rotulo: string; icone: LucideIcon; emBreve?: string }> = [
    { id: "gerais", rotulo: t("Configurações Gerais"), icone: Settings },
    { id: "motivos", rotulo: t("Motivo de Perda"), icone: CircleSlash },
    { id: "distribuicao", rotulo: t("Distribuição de dono"), icone: Shuffle },
    {
      id: "permissoes",
      rotulo: t("Permissão de usuários"),
      icone: Users,
    },
    {
      id: "atribuicao",
      rotulo: t("Atribuição de ganho"),
      icone: ReceiptText,
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
    },
  ];
  // Só o administrador vê a subaba "Distribuição de dono" (Clint).
  const menuVisivel = menu.filter(
    (m) => m.id !== "distribuicao" || config?.podeAdministrar === true,
  );
  const atual = menuVisivel.find((m) => m.id === subaba) ?? menuVisivel[0]!;

  async function aoSalvar() {
    if (!config || !rascunho) return;
    setErro(null);
    const pedido = pedidoDoSalvar(rascunho, config);
    if (!pedido.ok) {
      const etapa = config.etapas.find((e) => e.id === pedido.etapa)?.name;
      const membros = membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome"));
      const nomes = (pedido.usuarios ?? [])
        .map((u) => membros.find((m) => m.id === u)?.nome ?? u)
        .join(", ");
      const texto = t(pedido.erro).split("{usuarios}").join(nomes);
      setErro(etapa ? `${etapa}: ${texto}` : texto);
      setSubaba(pedido.secao);
      return;
    }
    try {
      if (Object.keys(pedido.mudancaDaOrigem).length > 0) {
        onOrigens(await atualizar.mutateAsync({ id, mudanca: pedido.mudancaDaOrigem }));
      }
      // A ordem das duas rotas depende da direção da mudança (Q9 da 1J): ver ordem-de-gravacao.ts.
      const plano = planoDeGravacao({
        patch: pedido.patch,
        distribuicao: pedido.distribuicao,
        distribuidosHoje: config.distribuicao.map((p) => p.userId),
      });
      const terminou = await gravarNaOrdem(plano.ordem, {
        configuracoes: async () => {
          if (plano.patch) await salvar.mutateAsync(plano.patch);
        },
        distribuicao: async () => {
          if (!pedido.distribuicao) return;
          try {
            await salvarDistribuicao.mutateAsync(pedido.distribuicao);
          } catch (e) {
            setErro(`${t("Erro ao salvar a distribuição de donos.")} ${textoDoErro(e, t)}`);
            setSubaba("distribuicao");
            return false;
          }
        },
      });
      if (!terminou) return;
      const soDistribuicao =
        !!pedido.distribuicao && !pedido.patch && Object.keys(pedido.mudancaDaOrigem).length === 0;
      toast.success(
        soDistribuicao
          ? t("As configurações de distribuição foram salvas com sucesso!")
          : t("Origem alterada com sucesso!"),
      );
      // O rascunho do playbook é independente: se há mudança dele por salvar, a janela fica aberta.
      setEditado(null);
      if (!playbookMexido) onFechar();
    } catch (e) {
      setErro(`${t("Falha na edição da origem!")} ${textoDoErro(e, t)}`);
    }
  }

  async function aoSalvarPlaybook() {
    if (!rascunhoDoPlaybook) return;
    setErroDoPlaybook(null);
    try {
      await salvarPlaybook.mutateAsync(rascunhoDoPlaybook.map(paraOServidor));
      setPlaybookEditado(null);
      toast.success(t("Origem alterada com sucesso!"));
      // E o das subabas: se há mudança dele por salvar, a janela fica aberta.
      if (!podeSalvar) onFechar();
    } catch (e) {
      setErroDoPlaybook(`${t("Falha na edição da origem!")} ${textoDoErro(e, t)}`);
    }
  }

  function conteudo(props: PropsDaSecao) {
    if (atual.emBreve) return <EmBreve titulo={atual.rotulo} texto={atual.emBreve} />;
    switch (atual.id) {
      case "gerais":
        return <SecaoGerais {...props} origens={origens} onOrigens={onOrigens} />;
      case "motivos":
        return <SecaoMotivos {...props} />;
      case "campos":
        return <SecaoCampos {...props} />;
      case "alerta":
        return <SecaoAlerta {...props} />;
      case "permissoes":
        return <SecaoPermissoes {...props} />;
      case "distribuicao":
        return <SecaoDistribuicao {...props} />;
      case "atribuicao":
        return <SecaoAtribuicao {...props} />;
      case "notificacoes":
        return <SecaoNotificacoes {...props} />;
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
          // Com alteração por salvar, clicar na cortina não fecha: o rascunho não se perde. Esc e Cancelar fecham.
          onPointerDownOutside={(e) => (podeSalvar || playbookMexido) && e.preventDefault()}
          onInteractOutside={(e) => (podeSalvar || playbookMexido) && e.preventDefault()}
          // A animação do `ds-modal` termina deslocada -50% na horizontal (feita para quem centraliza com
          // `left: 50%`). Esta janela ocupa a largura toda, então zera o deslocamento: senão meia janela some à esquerda.
          className="ds-modal fixed inset-x-2 top-1/2 z-50 flex max-h-[calc(100dvh-100px)] -translate-y-1/2 flex-col overflow-hidden rounded-[12px] bg-surface text-casca-texto shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] [--ds-modal-x:0px]"
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
                playbook.isPending ? (
                  <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>
                ) : playbook.isError || !rascunhoDoPlaybook ? (
                  <div
                    role="alert"
                    className="flex items-center gap-3 text-[13px] text-casca-alerta"
                  >
                    {t("Não consegui abrir as atividades desta origem.")}
                    <BotaoDaJanela variante="cancelar" onClick={() => void playbook.refetch()}>
                      {t("Tentar de novo")}
                    </BotaoDaJanela>
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <Alerta texto={erroDoPlaybook} />
                    <AbaDeEtapas
                      config={config}
                      atividades={rascunhoDoPlaybook}
                      temSalvas={(playbookSalvo?.length ?? 0) > 0}
                      mudar={mudarPlaybook}
                    />
                  </div>
                )
              ) : (
                <div className="flex gap-12">
                  <nav
                    aria-label={t("Configurações da origem")}
                    className="w-[364px] shrink-0 self-start rounded-[12px] bg-casca-marca-suave py-6"
                  >
                    {menuVisivel.map((m) => (
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

            <div className="flex items-center justify-between gap-2 px-8 pt-3 pb-[22px]">
              <span />
              <div className="flex gap-2">
                {aba === "etapas" && playbookMexido ? (
                  <BotaoDaJanela variante="cancelar" onClick={() => setConfirmarDesfazer(true)}>
                    {t("Desfazer")}
                  </BotaoDaJanela>
                ) : (
                  <BotaoDaJanela variante="cancelar" onClick={onFechar}>
                    {t("Cancelar")}
                  </BotaoDaJanela>
                )}
                {aba === "etapas" ? (
                  <span className="inline-flex">
                    <BotaoDaJanela
                      variante="salvar"
                      disabled={!playbookMexido || salvarPlaybook.isPending}
                      title={playbookMexido ? undefined : t("Nenhuma alteração para salvar")}
                      onClick={() => void aoSalvarPlaybook()}
                      className="rounded-r-none disabled:pointer-events-auto disabled:cursor-not-allowed"
                    >
                      {t("Salvar na origem")}
                    </BotaoDaJanela>
                    <BotaoDaJanela
                      variante="salvar"
                      disabled
                      aria-label={t("Mais opções de salvar")}
                      title={t("Em breve")}
                      className="rounded-l-none border-l border-white/40 px-2 disabled:pointer-events-auto disabled:cursor-not-allowed"
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
            </div>
            <AlertDialog open={confirmarDesfazer} onOpenChange={setConfirmarDesfazer}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Desfazer")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "Ao confirmar esta ação, todas as alterações realizadas serão desfeitas. Tem certeza de que deseja continuar?",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setPlaybookEditado(null);
                      setErroDoPlaybook(null);
                    }}
                  >
                    {t("Confirmar")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TooltipProvider>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
