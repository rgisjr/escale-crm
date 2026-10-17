"use client";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { CardDaCasca } from "@/components/escale/quadro/CardDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSalvarPrefsDoCard } from "@/hooks/escale/usePrefsDoCard";
import { useT } from "@/hooks/i18n/useT";
import { negocioDeExemplo } from "@/lib/escale/capa/exemplo";
import {
  CAMPOS_MAX,
  CANAIS_MAX,
  alternarCampo,
  alternarCanal,
  alternarItem,
  canaisLigados,
  chaveDoCampo,
  limparCamposSemOrigem,
  ocupados,
  prefsIguais,
  type CampoDaCapa,
  type CanalDoRodape,
  type ItemFixo,
  type PrefsDoCard,
} from "@/lib/escale/capa/tipos";
import {
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Search,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

interface Linha {
  chave: string;
  rotulo: string;
  nome: string;
  Icone?: LucideIcon;
  ligado: boolean;
  bloqueio?: string;
  aoMudar: () => void;
}
interface Grupo {
  id: string;
  titulo: string;
  linhas: Linha[];
}

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * "PERSONALIZAR CARDS" (fork Escale, Fase 1E; 01-019 e o código `vf` da Clint).
 * À esquerda, a busca e os grupos com interruptores; à direita, o card de
 * verdade com um exemplo. Salvar só liga quando algo mudou. Vale em todas as
 * origens da pessoa. `catalogo` são os campos do CRM (`undefined` = ainda não sei,
 * e então nada é solto): o campo escolhido que foi apagado do CRM é solto ao abrir
 * e ao salvar.
 */
export function JanelaPersonalizarCards({
  prefs,
  campos,
  catalogo,
  onFechar,
}: {
  prefs: PrefsDoCard;
  campos: readonly CampoDaCapa[];
  catalogo?: readonly CampoDaCapa[];
  onFechar: () => void;
}) {
  const t = useT();
  const salvar = useSalvarPrefsDoCard();
  const [inicial] = useState(() => (catalogo ? limparCamposSemOrigem(prefs, catalogo) : prefs));
  const [rascunho, setRascunho] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set(["contato"]));
  const cheio = ocupados(rascunho) >= CAMPOS_MAX;
  const canaisCheios = canaisLigados(rascunho) >= CANAIS_MAX;
  const LIMITE = t("Limite de 10 campos atingido");

  const item = (i: ItemFixo, rotulo: string, Icone: LucideIcon, emBreve = false): Linha => ({
    chave: i,
    rotulo,
    nome: rotulo,
    Icone,
    ligado: rascunho.itens[i],
    bloqueio: emBreve ? t("Em breve") : !rascunho.itens[i] && cheio ? LIMITE : undefined,
    aoMudar: () => setRascunho((p) => alternarItem(p, i)),
  });
  const campo = (c: CampoDaCapa): Linha => {
    const ligado = rascunho.campos.some((x) => chaveDoCampo(x) === chaveDoCampo(c));
    const rotulo = c.deInterface ? t(c.rotulo) : c.rotulo;
    return {
      chave: chaveDoCampo(c),
      rotulo,
      nome: rotulo,
      ligado,
      bloqueio: !ligado && cheio ? LIMITE : undefined,
      aoMudar: () => setRascunho((p) => alternarCampo(p, c)),
    };
  };
  const canal = (c: CanalDoRodape, rotulo: string, Icone: LucideIcon, emBreve = false): Linha => ({
    chave: `canal:${c}`,
    rotulo,
    nome: `${t("Ícones de canal no rodapé")}: ${rotulo}`,
    Icone,
    ligado: rascunho.canais[c],
    bloqueio: emBreve
      ? t("Em breve")
      : !rascunho.canais[c] && canaisCheios
        ? t("Limite de 3 ícones no rodapé atingido")
        : undefined,
    aoMudar: () => setRascunho((p) => alternarCanal(p, c)),
  });

  const grupos: Grupo[] = [
    {
      id: "contato",
      titulo: t("Contato"),
      linhas: [
        item("ultimaMensagem", t("Prévia da última mensagem"), MessageSquare),
        ...campos.filter((c) => c.entidade === "contato").map((c) => campo(c)),
      ],
    },
    {
      id: "empresa",
      titulo: t("Empresa"),
      linhas: [item("empresa", t("Nome da empresa"), Building2, true)],
    },
    {
      id: "negocio",
      titulo: t("Negócio"),
      linhas: [
        item("valor", t("Valor do negócio"), DollarSign),
        item("idade", t("Idade do negócio"), Clock),
        item("dono", t("Dono do negócio"), Users),
        item("atividades", t("Atividades"), CheckCircle2),
        item("tags", t("Tags"), Tag),
        ...campos.filter((c) => c.entidade === "negocio").map((c) => campo(c)),
      ],
    },
    {
      id: "canais",
      titulo: t("Ícones de canal no rodapé"),
      linhas: [
        canal("telefone", t("Telefone"), Phone),
        canal("mensagem", t("Mensagem"), MessageCircle),
        canal("email", t("E-mail"), Mail),
        canal("lembrete", t("Lembrete"), Bell, true),
        canal("agendamento", t("Agendamento"), Calendar, true),
      ],
    },
  ];
  const termo = semAcento(busca.trim());
  const visiveis = grupos
    .map((g) => ({
      ...g,
      linhas: termo ? g.linhas.filter((l) => semAcento(l.rotulo).includes(termo)) : g.linhas,
    }))
    .filter((g) => g.linhas.length > 0);
  const exemplo = useMemo(() => negocioDeExemplo(t, campos), [t, campos]);
  const mudou = !prefsIguais(rascunho, prefs);
  const paraSalvar = catalogo ? limparCamposSemOrigem(rascunho, catalogo) : rascunho;

  return (
    <DialogPrimitive.Root open onOpenChange={(aberta) => !aberta && onFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[50%] left-[50%] z-50 flex max-h-[min(700px,calc(100dvh-4rem))] w-[min(820px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-[12px] bg-surface text-casca-texto shadow-casca-painel"
        >
          <div className="flex items-center justify-between border-b border-[#E4E4E9] px-5 py-3">
            <DialogTitle className="text-sm font-medium text-[#232229]">
              {t("Personalizar cards")}
            </DialogTitle>
            <DialogPrimitive.Close
              aria-label={t("Fechar")}
              className="grid size-6 place-items-center rounded-casca-gatilho text-[#86858F] hover:text-casca-texto"
            >
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[400px_1fr]">
            <TooltipProvider delayDuration={100}>
              <div className="min-h-0 overflow-y-auto px-5 py-3">
                <label className="flex h-8 items-center gap-2 rounded-[6px] bg-[#EFEFF2] px-2.5">
                  <Search size={13} aria-hidden className="text-[#5A5964]" />
                  <input
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder={t("Buscar por...")}
                    aria-label={t("Buscar por...")}
                    className="min-w-0 flex-1 bg-transparent text-xs outline-hidden placeholder:text-[#86858F] [&::-webkit-search-cancel-button]:hidden"
                  />
                </label>
                {visiveis.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-[#5A5964]">
                    {t("Nenhum campo encontrado.")}
                  </p>
                ) : null}
                {visiveis.map((g) => {
                  const aberto = termo !== "" || abertos.has(g.id);
                  const ativos = g.linhas.filter((l) => l.ligado).length;
                  return (
                    <section key={g.id} className="mt-2">
                      <button
                        type="button"
                        aria-expanded={aberto}
                        onClick={() =>
                          setAbertos((a) => {
                            const p = new Set(a);
                            if (p.has(g.id)) p.delete(g.id);
                            else p.add(g.id);
                            return p;
                          })
                        }
                        className="flex w-full items-center gap-1.5 px-2 py-2 text-[10px] font-medium tracking-[0.07em] text-[#5A5964] uppercase"
                      >
                        <ChevronDown
                          size={14}
                          aria-hidden
                          className={cn("transition-transform", !aberto && "-rotate-90")}
                        />
                        <span className="flex-1 text-left">{g.titulo}</span>
                        {ativos > 0 ? (
                          <span className="grid size-4 place-items-center rounded-full bg-casca-marca-suave text-[10px] font-medium text-casca-marca">
                            {ativos}
                          </span>
                        ) : null}
                      </button>
                      {aberto
                        ? g.linhas.map((l) => <LinhaDoGrupo key={l.chave} linha={l} />)
                        : null}
                    </section>
                  );
                })}
              </div>
            </TooltipProvider>
            <div className="flex min-h-0 flex-col px-6 py-4">
              <p className="text-[9px] font-medium tracking-[0.12em] text-casca-marca uppercase">
                {t("Pré-visualização")}
              </p>
              <div inert className="pointer-events-none flex flex-1 items-center justify-center">
                <div className="w-full max-w-80 rounded-[6px] border border-[#E1E1E6]">
                  <DragDropContext onDragEnd={() => {}}>
                    <Droppable droppableId="previa-do-card" isDropDisabled>
                      {(p) => (
                        <div ref={p.innerRef} {...p.droppableProps}>
                          <CardDaCasca
                            card={exemplo.card}
                            lead={exemplo.lead}
                            index={0}
                            pipelineId=""
                            nomes={exemplo.nomes}
                            prefs={rascunho}
                            camposDoCard={campos}
                          />
                          {p.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
              <p className="text-center text-[11px] text-[#5A5964]">
                {t("Este é um exemplo. Suas alterações aparecem no kanban depois de salvar.")}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-[#E4E4E9] px-5 py-3">
            <button
              type="button"
              onClick={onFechar}
              className="h-8 rounded-[6px] border border-[#E4E4E9] px-4 text-xs font-medium hover:bg-[#EFEFF2]"
            >
              {t("Cancelar")}
            </button>
            <button
              type="button"
              disabled={!mudou || salvar.isPending}
              onClick={() =>
                salvar.mutate(paraSalvar, {
                  onSuccess: () => {
                    toast.success(t("Preferências salvas"));
                    onFechar();
                  },
                  onError: (e) => {
                    toast.error(textoDoErro(e, t));
                  },
                })
              }
              className="flex h-8 items-center gap-1.5 rounded-[6px] bg-casca-marca px-4 text-xs font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={13} aria-hidden />
              {t("Salvar preferência")}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

/** A dica de limite é o balão lavanda da Clint (v2-13); o `title` fica no interruptor para a cerca `controle-decorativo`. */
function LinhaDoGrupo({ linha }: { linha: Linha }): ReactNode {
  const { Icone } = linha;
  const interruptor = (
    <InterruptorDaCasca
      ligado={linha.ligado}
      aoMudar={linha.aoMudar}
      aria-label={linha.nome}
      desabilitado={Boolean(linha.bloqueio)}
      title={linha.bloqueio}
    />
  );
  return (
    <div className="flex items-center gap-2 rounded-[6px] px-3.5 py-1.5 text-xs hover:bg-[#EFEFF2]">
      {Icone ? (
        <Icone
          size={16}
          aria-hidden
          className={linha.ligado ? "text-casca-marca" : "text-[#5A5964]"}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{linha.rotulo}</span>
      {linha.bloqueio ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{interruptor}</span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="rounded-[4px] bg-casca-marca-suave text-[11px] text-casca-marca"
          >
            {linha.bloqueio}
          </TooltipContent>
        </Tooltip>
      ) : (
        interruptor
      )}
    </div>
  );
}
