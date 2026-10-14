"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useCriarGrupo,
  useExcluirGrupo,
  useMoverFunil,
  useRenomearGrupo,
  type RespostaDeOrigens,
} from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { NOME_DE_GRUPO_MAX, montarOrigens, type Origens } from "@/lib/escale/origens/regras";

/** O valor da opção "Sem grupo" na caixa de cada funil (vira `group_id: null`). */
export const SEM_GRUPO = "sem-grupo";

function textoDoErro(e: unknown, t: (texto: string) => string): string {
  if (e instanceof ApiError) return t(e.message);
  if (e instanceof Error && e.message) return e.message;
  return t("Não consegui completar essa ação. Tente de novo.");
}

/**
 * ORGANIZAR ORIGENS (fork Escale, Fase 1A): criar, renomear e excluir grupo, e
 * escolher o grupo de cada funil. Só gerente+ chega aqui (o painel esconde o
 * botão, e as rotas cobram `requireRole("manager")`).
 *
 * Toda resposta traz as origens relidas do banco, e `onOrigens` as entrega ao
 * painel — a janela e o painel mostram a mesma coisa sem esperar o refresh.
 */
export function OrganizarOrigens({
  open,
  onOpenChange,
  origens,
  onOrigens,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  origens: Origens;
  onOrigens: (origens: Origens) => void;
}) {
  const t = useT();
  const criar = useCriarGrupo();
  const renomear = useRenomearGrupo();
  const excluir = useExcluirGrupo();
  const mover = useMoverFunil();

  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const ocupado = criar.isPending || renomear.isPending || excluir.isPending || mover.isPending;
  const { grupos } = montarOrigens(origens);
  const opcoes = [{ value: SEM_GRUPO, label: t("Sem grupo") }, ...grupos.map((g) => ({ value: g.id, label: g.name }))];

  function aplicar(r: RespostaDeOrigens) {
    setErro(null);
    onOrigens(r.data);
  }
  const falhar = (e: unknown) => setErro(textoDoErro(e, t));

  function criarGrupo(e: FormEvent) {
    e.preventDefault();
    const nome = novo.trim();
    if (!nome) return;
    criar.mutate(nome, {
      onSuccess: (r) => {
        aplicar(r);
        setNovo("");
      },
      onError: falhar,
    });
  }

  function salvarNome(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    renomear.mutate(
      { id: editando.id, name: editando.nome },
      {
        onSuccess: (r) => {
          aplicar(r);
          setEditando(null);
        },
        onError: falhar,
      },
    );
  }

  function excluirGrupo(id: string) {
    excluir.mutate(id, {
      onSuccess: (r) => {
        aplicar(r);
        setExcluindo(null);
      },
      onError: falhar,
    });
  }

  function moverFunil(funilId: string, valor: string) {
    mover.mutate({ funilId, groupId: valor === SEM_GRUPO ? null : valor }, { onSuccess: aplicar, onError: falhar });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Organizar origens")}</DialogTitle>
          <DialogDescription>
            {t("Agrupe os funis para achar cada um mais rápido. Funil sem grupo aparece em «Sem grupo».")}
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
            {erro}
          </p>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("Grupos")}</h3>
          <form onSubmit={criarGrupo} className="flex gap-2">
            <Input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder={t("Nome do novo grupo")}
              aria-label={t("Nome do novo grupo")}
              maxLength={NOME_DE_GRUPO_MAX}
            />
            <Button type="submit" disabled={ocupado || !novo.trim()} className="shrink-0">
              {t("Criar grupo")}
            </Button>
          </form>
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nenhum grupo ainda. Crie o primeiro acima.")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {grupos.map((g) => (
                <li key={g.id} className="flex items-center gap-2 px-3 py-2">
                  {editando?.id === g.id ? (
                    <form onSubmit={salvarNome} className="flex flex-1 gap-2">
                      <Input
                        autoFocus
                        value={editando.nome}
                        onChange={(e) => setEditando({ id: g.id, nome: e.target.value })}
                        aria-label={t("Nome do grupo")}
                        maxLength={NOME_DE_GRUPO_MAX}
                      />
                      <Button type="submit" size="sm" disabled={ocupado || !editando.nome.trim()}>
                        {t("Salvar")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(null)}>
                        {t("Cancelar")}
                      </Button>
                    </form>
                  ) : excluindo === g.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 text-sm">
                        {t("Ao excluir, os funis do grupo vão para «Sem grupo». Nenhum negócio é apagado.")}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={ocupado}
                        onClick={() => excluirGrupo(g.id)}
                      >
                        {t("Confirmar exclusão")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setExcluindo(null)}>
                        {t("Cancelar")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`${t("Renomear")} ${g.name}`}
                        onClick={() => setEditando({ id: g.id, nome: g.name })}
                      >
                        {t("Renomear")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`${t("Excluir")} ${g.name}`}
                        onClick={() => setExcluindo(g.id)}
                      >
                        {t("Excluir")}
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("Funis")}</h3>
          <ul className="divide-y rounded-md border">
            {origens.funis.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <SearchableSelect
                  className="w-56"
                  options={opcoes}
                  value={f.group_id ?? SEM_GRUPO}
                  onValueChange={(valor) => moverFunil(f.id, valor)}
                  aria-label={`${t("Grupo do funil")} ${f.name}`}
                  disabled={ocupado}
                />
              </li>
            ))}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}
