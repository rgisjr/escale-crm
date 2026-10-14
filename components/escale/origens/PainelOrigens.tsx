"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import {
  corDoGrupo,
  filtrarArvore,
  funilDoCaminho,
  iniciais,
  montarOrigens,
  type FunilDaOrigem,
  type Origens,
} from "@/lib/escale/origens/regras";
import { estiloDoChip } from "@/lib/tags/cor-da-etiqueta";
import { CaretDown, CaretRight, Gear, MagnifyingGlass } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { OrganizarOrigens } from "./OrganizarOrigens";

/**
 * O PAINEL ORIGENS (fork Escale, Fase 1A): a coluna da esquerda de Negócios na
 * casca nova, como na V1 da Clint — grupos que abrem os funis, busca pela lupa
 * e, para gerente, "Organizar origens". Só md+: no celular o quadro segue como
 * sempre (o seletor de funil do cabeçalho continua lá).
 *
 * As origens vêm do servidor (`ComOrigens`) e são trocadas pelo CORPO das
 * respostas de escrita; quando o servidor manda novidade (navegação, refresh),
 * o ajuste acontece durante o render — o padrão de `app/app/kanban/_client.tsx`.
 */
export function PainelOrigens({ origens: doServidor, podeGerenciar }: { origens: Origens; podeGerenciar: boolean }) {
  const t = useT();
  const ativo = funilDoCaminho(usePathname() ?? "");

  const [origens, setOrigens] = useState<Origens>(doServidor);
  const [ultimoDoServidor, setUltimoDoServidor] = useState<Origens>(doServidor);
  if (doServidor !== ultimoDoServidor) {
    setUltimoDoServidor(doServidor);
    setOrigens(doServidor);
  }

  // Começa aberto o grupo do funil que está no quadro, como na V1.
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => {
    const grupoDoAtivo = doServidor.funis.find((f) => f.id === ativo)?.group_id;
    return new Set(grupoDoAtivo ? [grupoDoAtivo] : []);
  });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [organizando, setOrganizando] = useState(false);

  const arvore = useMemo(() => montarOrigens(origens), [origens]);
  const buscando = busca.trim().length > 0;
  const visivel = buscando ? filtrarArvore(arvore, busca) : arvore;
  const nadaAchado = buscando && visivel.grupos.length === 0 && visivel.semGrupo.length === 0;

  function alternar(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  return (
    <aside
      aria-label={t("Origens")}
      className="sticky top-0 hidden max-h-[calc(100dvh-6.5rem)] w-60 shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border bg-card p-3 md:flex"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Origens")}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("Buscar grupo ou funil")}
            aria-pressed={buscaAberta}
            onClick={() => {
              setBuscaAberta((v) => !v);
              setBusca("");
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground"
          >
            <MagnifyingGlass size={16} aria-hidden />
          </button>
          {podeGerenciar && (
            <button
              type="button"
              aria-label={t("Organizar origens")}
              onClick={() => setOrganizando(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground"
            >
              <Gear size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {buscaAberta && (
        <Input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar grupo ou funil")}
          aria-label={t("Buscar grupo ou funil")}
          className="h-8"
        />
      )}

      <nav aria-label={t("Funis por grupo")}>
        <ul className="space-y-0.5">
          {visivel.grupos.map((g) => {
            const aberto = buscando || abertos.has(g.id);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  aria-expanded={aberto}
                  onClick={() => alternar(g.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent-soft"
                >
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
                    style={estiloDoChip(corDoGrupo(g.id))}
                  >
                    {iniciais(g.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  {aberto ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
                </button>
                {aberto &&
                  (g.funis.length > 0 ? (
                    <ListaDeFunis funis={g.funis} ativo={ativo} recuo />
                  ) : (
                    <p className="py-1 pl-10 text-xs text-muted-foreground">{t("Nenhum funil neste grupo.")}</p>
                  ))}
              </li>
            );
          })}
        </ul>
        {visivel.semGrupo.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Sem grupo")}
            </p>
            <ListaDeFunis funis={visivel.semGrupo} ativo={ativo} />
          </div>
        )}
      </nav>

      {nadaAchado && <p className="px-2 text-sm text-muted-foreground">{t("Nada encontrado.")}</p>}

      {podeGerenciar && (
        <OrganizarOrigens open={organizando} onOpenChange={setOrganizando} origens={origens} onOrigens={setOrigens} />
      )}
    </aside>
  );
}

function ListaDeFunis({
  funis,
  ativo,
  recuo = false,
}: {
  funis: FunilDaOrigem[];
  ativo: string | null;
  recuo?: boolean;
}) {
  return (
    <ul className={cn("space-y-0.5", recuo && "pl-8")}>
      {funis.map((f) => {
        const atual = f.id === ativo;
        return (
          <li key={f.id}>
            <Link
              href={`/app/pipelines/${f.id}`}
              aria-current={atual ? "page" : undefined}
              className={cn(
                "block truncate rounded-md px-2 py-1 text-sm transition-colors",
                atual
                  ? "bg-accent-soft font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
              )}
            >
              {f.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
