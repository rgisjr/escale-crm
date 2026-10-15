"use client";
import { useState } from "react";
import { toast } from "sonner";

import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExcluirFiltroSalvo, useFiltrosSalvos, useMudarFiltroSalvo } from "@/hooks/escale/useFiltrosSalvos";
import { useT } from "@/hooks/i18n/useT";
import {
  FILTROS_SALVOS_MAX,
  filtroAlterado,
  separarFiltrosSalvos,
  type AlvoDoFiltro,
  type FiltroSalvo,
} from "@/lib/escale/filtros/filtros-salvos";
import { enxugar, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { BookmarkSimple, CaretDown, Users } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { JanelaDoFiltroSalvo, type JanelaDoFiltro } from "./JanelaDoFiltroSalvo";

const emOrdem = <T extends string>(lista: readonly T[] | undefined) => (lista ? [...lista].sort() : undefined);

/**
 * Cópia com as listas de valores em ordem fixa: tags, canais, atendentes e
 * situação são conjuntos, a ordem em que se marcam não é critério. A `ordem` de
 * ordenação NÃO entra aqui: a sequência dos critérios muda o resultado.
 */
function comListasEmOrdem(f: FiltrosDoQuadro): FiltrosDoQuadro {
  const { conversa } = f;
  return {
    ...f,
    tags: emOrdem(f.tags),
    conversa: conversa
      ? { ...conversa, canais: emOrdem(conversa.canais), atendentes: emOrdem(conversa.atendentes), situacao: emOrdem(conversa.situacao) }
      : undefined,
  };
}

/** O filtro aplicado foi mexido? Compara pelo conteúdo, sem olhar a ordem dos itens das listas. */
const foiAlterado = (salvo: FiltroSalvo, atuais: FiltrosDoQuadro) =>
  filtroAlterado({ criterios: comListasEmOrdem(salvo.criterios) }, comListasEmOrdem(atuais));

/**
 * OS FILTROS SALVOS DO QUADRO (fork Escale, Fase 1D). O botão mostra o filtro
 * aplicado (e "alterado" quando ele foi mexido depois). O menu aplica os meus e
 * os compartilhados, salva o filtro atual (até 20 por pessoa em cada origem ou
 * visualização, como na Clint) e, para o MEU filtro aplicado, salva alterações,
 * renomeia ou compartilha, e exclui.
 */
export function MenuDeFiltrosSalvos({
  alvo,
  filtros,
  filtroSalvoId,
  onAplicar,
}: {
  alvo: AlvoDoFiltro;
  filtros: FiltrosDoQuadro;
  filtroSalvoId: string | null;
  onAplicar: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
}) {
  const t = useT();
  const { data: lista = [], isError } = useFiltrosSalvos(alvo);
  const mudar = useMudarFiltroSalvo(alvo);
  const excluir = useExcluirFiltroSalvo(alvo);
  const [janela, setJanela] = useState<JanelaDoFiltro | null>(null);
  const [apagar, setApagar] = useState<FiltroSalvo | null>(null);
  const { meus, compartilhados } = separarFiltrosSalvos(lista);
  const ativo = lista.find((f) => f.id === filtroSalvoId);
  const alterado = ativo ? foiAlterado(ativo, filtros) : false;

  function salvarNovo() {
    if (meus.length >= FILTROS_SALVOS_MAX) {
      toast.error(t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."));
      return;
    }
    setJanela({ modo: "novo" });
  }

  function salvarAlteracoes(filtro: FiltroSalvo) {
    mudar.mutate(
      { id: filtro.id, mudanca: { criterios: enxugar(filtros) } },
      { onSuccess: () => toast.success(t("Filtro atualizado.")), onError: (e) => toast.error(textoDoErro(e, t)) },
    );
  }

  function confirmarExclusao() {
    const filtro = apagar;
    setApagar(null);
    if (!filtro) return;
    excluir.mutate(filtro.id, {
      onSuccess: () => {
        if (filtro.id === filtroSalvoId) onAplicar(filtros, null);
        toast.success(t("Filtro excluído."));
      },
      onError: (e) => toast.error(textoDoErro(e, t)),
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[16rem] gap-1.5" data-testid="filtros-salvos">
            <BookmarkSimple size={16} aria-hidden />
            <span className="truncate">{ativo ? ativo.nome : t("Filtros salvos")}</span>
            {alterado ? <span className="text-xs text-muted-foreground">{`(${t("alterado")})`}</span> : null}
            <CaretDown size={14} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onSelect={salvarNovo}>{t("Salvar filtro atual…")}</DropdownMenuItem>
          {ativo?.meu && alterado ? (
            <DropdownMenuItem onSelect={() => salvarAlteracoes(ativo)}>{t("Salvar alterações neste filtro")}</DropdownMenuItem>
          ) : null}
          {ativo?.meu ? (
            <>
              <DropdownMenuItem onSelect={() => setJanela({ modo: "editar", filtro: ativo })}>
                {t("Renomear ou compartilhar…")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setApagar(ativo)} className="text-destructive">
                {t("Excluir filtro")}
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          {isError ? <DropdownMenuItem disabled>{t("Não consegui carregar os filtros salvos.")}</DropdownMenuItem> : null}
          {!isError && lista.length === 0 ? <DropdownMenuItem disabled>{t("Nenhum filtro salvo ainda.")}</DropdownMenuItem> : null}
          {meus.length > 0 ? (
            <>
              <DropdownMenuLabel>{t("Meus filtros")}</DropdownMenuLabel>
              {meus.map((f) => (
                <ItemDoFiltro key={f.id} filtro={f} ativo={f.id === filtroSalvoId} onAplicar={onAplicar} />
              ))}
            </>
          ) : null}
          {compartilhados.length > 0 ? (
            <>
              <DropdownMenuLabel>{t("Compartilhados com você")}</DropdownMenuLabel>
              {compartilhados.map((f) => (
                <ItemDoFiltro key={f.id} filtro={f} ativo={f.id === filtroSalvoId} onAplicar={onAplicar} />
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <JanelaDoFiltroSalvo
        alvo={alvo}
        janela={janela}
        filtros={filtros}
        meus={meus}
        onFechar={() => setJanela(null)}
        onSalvo={(id, criterios) => onAplicar(criterios, id)}
      />

      <AlertDialog
        open={apagar !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setApagar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir o filtro «{nome}»?").replace("{nome}", apagar?.nome ?? "")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Ele some para você e, se estiver compartilhado, para todo mundo. Nenhum negócio é tocado.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>{t("Excluir")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ItemDoFiltro({
  filtro,
  ativo,
  onAplicar,
}: {
  filtro: FiltroSalvo;
  ativo: boolean;
  onAplicar: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
}) {
  const t = useT();
  return (
    <DropdownMenuItem onSelect={() => onAplicar(filtro.criterios, filtro.id)} className={cn(ativo && "font-semibold")}>
      <span className="truncate">{filtro.nome}</span>
      {filtro.meu && filtro.compartilhado ? (
        <span className="ml-auto text-muted-foreground" title={t("Compartilhado")}>
          <Users size={14} aria-hidden />
        </span>
      ) : null}
    </DropdownMenuItem>
  );
}
