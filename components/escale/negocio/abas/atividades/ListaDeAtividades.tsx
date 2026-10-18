"use client";
import { useState } from "react";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import {
  podeExcluirAtividade,
  type AtividadeDoNegocio,
  type GrupoDaLista,
  type GrupoDoPlaybook,
} from "@/lib/escale/negocio/atividades";
import { horaDaTarefa } from "@/lib/escale/negocio/regras";
import { estaAtrasada } from "@/lib/tarefas/tipos";
import { Check, EllipsisVertical, EyeOff, Plus, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface AcoesDaAtividade {
  alternar: (a: AtividadeDoNegocio) => void;
  editarData: (a: AtividadeDoNegocio) => void;
  excluir: (a: AtividadeDoNegocio) => void;
}

const SELO_DO_GRUPO =
  "rounded-[5px] bg-casca-contador px-[7px] py-0.5 text-[9px] font-semibold text-casca-suave";

/**
 * A LISTA "PRÓXIMAS ATIVIDADES" (fork Escale, Fase 1I; prints G01, 003 e 017).
 * Grupos por dia (do mais cedo ao mais tarde); a linha com o ícone do tipo,
 * o título (riscado quando feita), a hora (vermelha quando atrasada), o olho da
 * não listada, a caixa de concluir (a dica diz quem concluiu) e o ⋮. Na etapa
 * futura, os grupos são o playbook por prazo relativo, sem caixa.
 */
export function ListaDeAtividades({
  titulo,
  dica,
  engrenagem,
  estado,
  grupos,
  previa,
  escolhidaId,
  aoEscolher,
  acoes,
  podeEditar,
  nomes,
  idioma,
  agora,
  aoNova,
  aoRecarregar,
}: {
  titulo: string;
  dica: string | null;
  engrenagem: { aoConfigurar?: () => void; dica: string };
  estado: "carregando" | "falhou" | "pronto";
  grupos: GrupoDaLista[];
  previa: GrupoDoPlaybook[] | null;
  escolhidaId: string | null;
  aoEscolher: (id: string) => void;
  acoes: AcoesDaAtividade;
  podeEditar: boolean;
  nomes: ReadonlyMap<string, string>;
  idioma: string;
  agora: Date;
  aoNova: () => void;
  aoRecarregar: () => void;
}) {
  const t = useT();
  const [excluindo, setExcluindo] = useState<AtividadeDoNegocio | null>(null);
  const vazio = previa ? previa.length === 0 : grupos.length === 0;

  return (
    <section
      aria-label={titulo}
      className="flex w-[450px] shrink-0 flex-col border-r border-casca-borda"
    >
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-casca-borda px-4">
        <span className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[15px] font-semibold text-casca-texto">{titulo}</h2>
          {dica ? <AjudaDaCasca texto={dica} /> : null}
        </span>
        <BotaoDaCasca
          variante="icone"
          aria-label={t("Configurar etapa")}
          disabled={!engrenagem.aoConfigurar}
          title={engrenagem.aoConfigurar ? t("Configurar etapa") : engrenagem.dica}
          onClick={engrenagem.aoConfigurar}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Settings aria-hidden />
        </BotaoDaCasca>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {estado === "carregando" ? (
          <div className="grid gap-2 p-4" aria-label={t("Carregando…")}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-10 animate-pulse rounded-[6px] bg-casca-raia" />
            ))}
          </div>
        ) : estado === "falhou" ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 px-4 py-6 text-xs text-casca-suave"
          >
            {t("Erro ao buscar atividades. Tente novamente.")}
            <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoRecarregar}>
              {t("Tentar de novo")}
            </BotaoDaCasca>
          </div>
        ) : vazio ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] font-semibold text-casca-texto">
              {previa ? t("Nenhuma atividade nessa etapa") : t("Sem atividades configuradas")}
            </p>
            {previa ? null : (
              <p className="mt-1 text-[12px] text-casca-suave">
                {t("Crie a primeira atividade para acompanhar este negócio.")}
              </p>
            )}
          </div>
        ) : previa ? (
          previa.map((g) => (
            <div key={g.chave}>
              <div className="flex items-center gap-2.5 px-4 pt-2 pb-1">
                <span className="text-[11.5px] font-semibold text-casca-texto">{g.rotulo}</span>
                <span className={SELO_DO_GRUPO}>{`${g.modelos.length} ${t("atividades")}`}</span>
              </div>
              <ul>
                {g.modelos.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      aria-pressed={m.id === escolhidaId}
                      onClick={() => aoEscolher(m.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-l-[3px] py-3 pr-4 pl-4 text-left",
                        m.id === escolhidaId
                          ? "border-casca-marca bg-casca-raia"
                          : "border-transparent hover:bg-casca-raia",
                      )}
                    >
                      <IconeDoTipo tipo={m.tipo} className="shrink-0 text-casca-marca" />
                      <span className="truncate text-[13px] text-casca-texto">{m.titulo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          grupos.map((g) => (
            <div key={g.chave}>
              <div className="flex items-center gap-2.5 px-4 pt-2 pb-1">
                <span className="text-[11.5px] font-semibold text-casca-texto">
                  {g.rotulo ?? t("Sem prazo")}
                </span>
                <span className={SELO_DO_GRUPO}>
                  {g.itens.length === 1 ? t("1 atividade") : `${g.itens.length} ${t("atividades")}`}
                </span>
              </div>
              <ul>
                {g.itens.map((a) => (
                  <LinhaDaAtividade
                    key={a.id}
                    atividade={a}
                    ativa={a.id === escolhidaId}
                    aoEscolher={() => aoEscolher(a.id)}
                    acoes={{ ...acoes, excluir: (x) => setExcluindo(x) }}
                    podeEditar={podeEditar}
                    nomes={nomes}
                    idioma={idioma}
                    agora={agora}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <footer className="flex h-12 shrink-0 items-center border-t border-casca-borda px-4">
        <BotaoDaCasca
          variante="texto"
          tamanho="sm"
          disabled={!podeEditar}
          title={podeEditar ? undefined : t("Sem permissão")}
          onClick={aoNova}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Plus aria-hidden />
          {t("Nova atividade")}
        </BotaoDaCasca>
      </footer>
      <AlertDialog open={excluindo !== null} onOpenChange={(sim) => !sim && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir atividade")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Tem certeza que deseja excluir esta atividade?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => excluindo && acoes.excluir(excluindo)}>
              {t("Excluir")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function LinhaDaAtividade({
  atividade,
  ativa,
  aoEscolher,
  acoes,
  podeEditar,
  nomes,
  idioma,
  agora,
}: {
  atividade: AtividadeDoNegocio;
  ativa: boolean;
  aoEscolher: () => void;
  acoes: AcoesDaAtividade;
  podeEditar: boolean;
  nomes: ReadonlyMap<string, string>;
  idioma: string;
  agora: Date;
}) {
  const t = useT();
  const feita = atividade.status === "done";
  const atrasada = estaAtrasada(atividade, agora);
  const quem = atividade.concluida_por ? nomes.get(atividade.concluida_por) : null;
  const dicaDaCaixa = !podeEditar
    ? t("Sem permissão")
    : feita
      ? [
          t("Concluída"),
          quem,
          atividade.concluida_em ? new Date(atividade.concluida_em).toLocaleString(idioma) : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : t("Marcar como concluída");

  return (
    <li
      className={cn(
        "flex items-center gap-2 border-l-[3px] pr-2",
        ativa ? "border-casca-marca bg-casca-raia" : "border-transparent hover:bg-casca-raia",
      )}
    >
      <button
        type="button"
        onClick={aoEscolher}
        aria-pressed={ativa}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left"
      >
        <IconeDoTipo tipo={atividade.tipo} className="shrink-0 text-casca-marca" />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[13px] text-casca-texto",
              feita && "text-casca-meta line-through",
            )}
          >
            {atividade.title}
          </span>
          {atividade.due_date ? (
            <span
              className={cn(
                "block text-[11px]",
                atrasada ? "font-semibold text-casca-alerta" : "text-casca-suave",
              )}
            >
              {horaDaTarefa(atividade.due_date, idioma)}
            </span>
          ) : null}
        </span>
      </button>
      {atividade.visibilidade === "nao_listada" ? (
        <DicaEscura texto={t("Essa atividade não será listada na visão de atividades")}>
          <span
            role="img"
            aria-label={t("Atividade não listada")}
            className="shrink-0 text-(--escale-nao-listada)"
          >
            <EyeOff size={14} aria-hidden />
          </span>
        </DicaEscura>
      ) : null}
      <button
        type="button"
        role="checkbox"
        aria-checked={feita}
        aria-label={atividade.title}
        disabled={!podeEditar}
        title={dicaDaCaixa}
        onClick={() => acoes.alternar(atividade)}
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-[4px] border disabled:cursor-not-allowed disabled:opacity-60",
          feita ? "border-casca-marca bg-casca-marca text-white" : "border-casca-borda bg-surface",
        )}
      >
        {feita ? <Check size={12} aria-hidden /> : null}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${t("Opções de")} ${atividade.title}`}
            disabled={!podeEditar}
            title={podeEditar ? undefined : t("Sem permissão")}
            className="grid size-6 shrink-0 place-items-center rounded-[4px] text-casca-suave hover:bg-casca-raia disabled:cursor-not-allowed"
          >
            <EllipsisVertical size={14} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CAIXA_DO_MENU}>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => acoes.alternar(atividade)}>
            {feita ? t("Reabrir atividade") : t("Marcar como concluída")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => acoes.editarData(atividade)}>
            {t("Editar data e hora")}
          </DropdownMenuItem>
          {podeExcluirAtividade(atividade) ? (
            <DropdownMenuItem
              className={cn(ITEM_DO_MENU, "text-casca-alerta")}
              onSelect={() => acoes.excluir(atividade)}
            >
              {t("Excluir atividade")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
