"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useArquivarOrigem,
  useAtualizarOrigem,
  useCriarOrigem,
  useExcluirOrigem,
  type MudancaDeOrigem,
} from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";

import type { PropsDaJanela } from "./JanelasDeOrigens";
import { Alerta } from "./JanelasDoGrupo";
import { textoDoErro } from "./texto-do-erro";

function OrigemSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Funil não encontrado.")}</DialogTitle>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" onClick={onFechar}>
          {t("Fechar")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function FormAdicionarOrigem({
  origens,
  onFechar,
  onOrigens,
  grupoId,
  onAbrirOrigem,
}: PropsDaJanela & { grupoId: string | null; onAbrirOrigem: (id: string) => void }) {
  const t = useT();
  const criar = useCriarOrigem();
  const ativos = origens.grupos.filter((g) => !g.is_archived);
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<string | null>(
    ativos.some((g) => g.id === grupoId) ? grupoId : (ativos[0]?.id ?? null),
  );
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !grupo) return;
    criar.mutate(
      { name: nome, groupId: grupo },
      {
        onSuccess: (r) => {
          onOrigens(r.origens);
          onAbrirOrigem(r.id);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Adicionar origem")}</DialogTitle>
        <DialogDescription>
          {ativos.length === 0
            ? t("Crie um grupo antes, pelo + ao lado da lupa.")
            : t("Toda origem fica num grupo. Ela nasce com as etapas padrão e já abre no quadro.")}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome da origem")}
        placeholder={t("Nome da origem")}
        maxLength={80}
      />
      <SearchableSelect
        options={ativos.map((g) => ({ value: g.id, label: g.name }))}
        value={grupo ?? undefined}
        onValueChange={setGrupo}
        aria-label={t("Grupo")}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={criar.isPending || !nome.trim() || !grupo}>
          {t("Criar origem")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormConfigOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarOrigem();
  const funil = origens.funis.find((f) => f.id === id);
  const ativos = origens.grupos.filter((g) => !g.is_archived || g.id === funil?.group_id);
  const [nome, setNome] = useState(funil?.name ?? "");
  const [grupo, setGrupo] = useState<string | null>(funil?.group_id ?? null);
  const [tornarPadrao, setTornarPadrao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const mudanca: MudancaDeOrigem = {};
    if (nome.trim() && nome.trim() !== funil!.name) mudanca.name = nome;
    if (grupo && grupo !== funil!.group_id) mudanca.groupId = grupo;
    if (tornarPadrao) mudanca.tornarPadrao = true;
    if (Object.keys(mudanca).length === 0) return onFechar();
    atualizar.mutate(
      { id, mudanca },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Configurações da origem")}</DialogTitle>
        <DialogDescription>{t("As etapas continuam sendo editadas no próprio quadro.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome da origem")}
        maxLength={80}
      />
      <SearchableSelect
        options={ativos.map((g) => ({ value: g.id, label: g.name }))}
        value={grupo ?? undefined}
        onValueChange={setGrupo}
        aria-label={t("Grupo")}
      />
      {funil.is_default ? (
        <p className="text-sm text-muted-foreground">{t("Esta é a origem padrão da organização.")}</p>
      ) : (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={tornarPadrao}
            onChange={(e) => setTornarPadrao(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {t("Tornar esta a origem padrão")}
            <span className="block text-xs text-muted-foreground">
              {t("Abre para quem ainda não abriu nenhuma origem.")}
            </span>
          </span>
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={atualizar.isPending}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormArquivarOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function confirmar() {
    arquivar.mutate(id, {
      onSuccess: (r) => {
        onOrigens(r);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Arquivar «{nome}»?").replace("{nome}", funil.name)}</DialogTitle>
        <DialogDescription>
          {t("A origem sai do painel e vai para Arquivados com os negócios dela. Desarquivar traz de volta.")}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" onClick={confirmar} disabled={arquivar.isPending}>
          {t("Arquivar")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FormExcluirOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirOrigem();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  const aoTerminar = {
    onSuccess: (r: Parameters<PropsDaJanela["onOrigens"]>[0]) => {
      onOrigens(r);
      onFechar();
    },
    onError: (err: unknown) => setErro(textoDoErro(err, t)),
  };

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Excluir «{nome}» de vez?").replace("{nome}", funil.name)}</DialogTitle>
        <DialogDescription>
          {t(
            "A origem e as etapas dela são apagadas, e isso não se desfaz. Origem com negócios não é excluída: aí o caminho é arquivar.",
          )}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        {erro && !funil.is_archived && (
          <Button type="button" onClick={() => arquivar.mutate(id, aoTerminar)} disabled={arquivar.isPending}>
            {t("Arquivar")}
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          onClick={() => excluir.mutate(id, aoTerminar)}
          disabled={excluir.isPending}
        >
          {t("Excluir de vez")}
        </Button>
      </DialogFooter>
    </div>
  );
}
