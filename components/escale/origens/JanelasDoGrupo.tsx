"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAtualizarGrupo, useCriarGrupo, useExcluirGrupo } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import {
  ICONES_DE_GRUPO,
  NOME_DE_GRUPO_MAX,
  ROTULO_DO_ICONE,
  type IconeDeGrupo,
} from "@/lib/escale/origens/regras";
import { NOME_DO_TOM, PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import { cn } from "@/lib/utils";

import { IconeDoGrupo } from "./IconeDoGrupo";
import type { PropsDaJanela } from "./JanelasDeOrigens";
import { textoDoErro } from "./texto-do-erro";

export function Alerta({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
      {texto}
    </p>
  );
}

function GrupoSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Grupo não encontrado.")}</DialogTitle>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" onClick={onFechar}>
          {t("Fechar")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function FormAdicionarGrupo({ onFechar, onOrigens }: PropsDaJanela) {
  const t = useT();
  const criar = useCriarGrupo();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    criar.mutate(nome, {
      onSuccess: (origens) => {
        onOrigens(origens);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Adicionar grupo de origens")}</DialogTitle>
        <DialogDescription>{t("O grupo nasce vazio. Use o + dele para criar origens dentro.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome do novo grupo")}
        placeholder={t("Nome do novo grupo")}
        maxLength={NOME_DE_GRUPO_MAX}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={criar.isPending || !nome.trim()}>
          {t("Criar grupo")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormConfigGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [nome, setNome] = useState(grupo?.name ?? "");
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    atualizar.mutate(
      { id, mudanca: { name: nome } },
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
        <DialogTitle>{t("Configurações do grupo")}</DialogTitle>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome do grupo")}
        maxLength={NOME_DE_GRUPO_MAX}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={atualizar.isPending || !nome.trim()}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormCustomizarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [cor, setCor] = useState<string | null>(grupo?.color ?? null);
  const [icone, setIcone] = useState<IconeDeGrupo>(grupo?.icon ?? "iniciais");
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function salvar() {
    atualizar.mutate(
      { id, mudanca: { color: cor, icon: icone } },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  const quadrado = "size-8 rounded-md border-2 transition-colors";
  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {t("Customizar")} «{grupo.name}»
        </DialogTitle>
      </DialogHeader>
      <Alerta texto={erro} />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{t("Cor")}</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={cor === null}
            onClick={() => setCor(null)}
            className={cn(quadrado, "px-2 text-xs", cor === null ? "border-foreground" : "border-transparent bg-muted")}
          >
            {t("Cor automática")}
          </button>
          {PALETA_DE_ETIQUETAS.map((tom) => (
            <button
              key={tom}
              type="button"
              aria-label={t(NOME_DO_TOM[tom] ?? tom)}
              aria-pressed={cor === tom}
              onClick={() => setCor(tom)}
              className={cn(quadrado, cor === tom ? "border-foreground" : "border-transparent")}
              style={{ backgroundColor: tom }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{t("Ícone")}</legend>
        <div className="flex flex-wrap gap-2">
          {ICONES_DE_GRUPO.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={t(ROTULO_DO_ICONE[i] ?? i)}
              aria-pressed={icone === i}
              onClick={() => setIcone(i)}
              className={cn(
                "grid h-9 w-11 place-items-center rounded-md border",
                icone === i ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: i }} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t("Prévia")}</span>
        <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: icone }} />
        <span className="font-semibold">{grupo.name}</span>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" onClick={salvar} disabled={atualizar.isPending}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FormArquivarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id && !f.is_archived).length;

  function arquivar() {
    atualizar.mutate(
      { id, mudanca: { is_archived: true } },
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
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Arquivar «{nome}»?").replace("{nome}", grupo.name)}</DialogTitle>
        <DialogDescription>
          {t(
            "O grupo e as {n} origens dele saem do painel e vão para Arquivados. Nada é apagado, as origens continuam recebendo negócios e Desarquivar traz tudo de volta.",
          ).replace("{n}", String(n))}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" onClick={arquivar} disabled={atualizar.isPending}>
          {t("Arquivar")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FormExcluirGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirGrupo();
  const outros = origens.grupos.filter((g) => g.id !== id && !g.is_archived);
  const [destino, setDestino] = useState<string | null>(outros[0]?.id ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id).length;

  function enviar() {
    excluir.mutate(
      { id, destino: n > 0 ? destino : null },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  if (n > 0 && outros.length === 0) {
    return (
      <div className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{t("«{nome}» é o único grupo").replace("{nome}", grupo.name)}</DialogTitle>
          <DialogDescription>
            {t(
              "Toda origem precisa de um grupo. Crie outro grupo antes, pelo + ao lado da lupa, para as origens irem para lá.",
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onFechar}>
            {t("Entendi")}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Excluir «{nome}»?").replace("{nome}", grupo.name)}</DialogTitle>
        <DialogDescription>
          {n === 0
            ? t("O grupo está vazio. Nenhuma origem e nenhum negócio é apagado.")
            : t(
                "Toda origem precisa de um grupo. Escolha para onde vão as {n} origens deste grupo. Nenhum negócio é apagado.",
              ).replace("{n}", String(n))}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      {n > 0 && (
        <SearchableSelect
          options={outros.map((g) => ({ value: g.id, label: g.name }))}
          value={destino ?? undefined}
          onValueChange={setDestino}
          aria-label={t("Mover as origens para")}
        />
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={enviar}
          disabled={excluir.isPending || (n > 0 && !destino)}
        >
          {n === 0 ? t("Excluir grupo") : t("Mover e excluir grupo")}
        </Button>
      </DialogFooter>
    </div>
  );
}
