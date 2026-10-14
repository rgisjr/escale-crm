"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { filtrarArvore, funilDoCaminho, montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import { CaretDown, CaretLeft, CaretRight, CaretUp, MagnifyingGlass, Plus } from "@/lib/ui/icons";

import { ArquivadosDoPainel } from "./ArquivadosDoPainel";
import { JanelasDeOrigens, type Janela } from "./JanelasDeOrigens";
import { BOTAO_DE_ICONE, LinhaDaOrigem, LinhaDoGrupo, type AcaoDaOrigem, type AcaoDoGrupo } from "./LinhasDoPainel";

const JANELA_DO_GRUPO: Record<Exclude<AcaoDoGrupo, "ocultar">, "config-grupo" | "customizar" | "arquivar-grupo" | "excluir-grupo"> = {
  configurar: "config-grupo",
  customizar: "customizar",
  arquivar: "arquivar-grupo",
  excluir: "excluir-grupo",
};
const JANELA_DA_ORIGEM: Record<AcaoDaOrigem, "config-origem" | "arquivar-origem" | "excluir-origem"> = {
  configurar: "config-origem",
  arquivar: "arquivar-origem",
  excluir: "excluir-origem",
};

/**
 * O PAINEL ORIGENS (fork Escale, Fases 1A e 1B): a coluna da esquerda de
 * Negócios na casca nova, como na Clint. `<` recolhe o painel, `^` recolhe a
 * lista, a seta abre o grupo, o `+` de cima adiciona origem ou grupo, o `+` do
 * grupo cria uma origem dentro dele, e os ⋮ levam às janelas
 * (`JanelasDeOrigens`). Só md+: no celular o quadro segue como sempre.
 *
 * As origens vêm do servidor (`ComOrigens`) e são trocadas pelo que cada
 * mutação devolve; quando o servidor manda novidade, o ajuste acontece durante
 * o render (padrão de `app/app/kanban/_client.tsx`). As preferências (painel,
 * lista, ocultos) também vêm do servidor, de cookie, e cada mudança é gravada
 * pela Server Action — nenhum `useState` lê o navegador.
 */
export function PainelOrigens({
  origens: doServidor,
  podeGerenciar,
  preferencias,
}: {
  origens: Origens;
  podeGerenciar: boolean;
  preferencias: PreferenciasDoPainel;
}) {
  const t = useT();
  const router = useRouter();
  const ativo = funilDoCaminho(usePathname() ?? "");

  const [origens, setOrigens] = useState<Origens>(doServidor);
  const [ultimoDoServidor, setUltimoDoServidor] = useState<Origens>(doServidor);
  if (doServidor !== ultimoDoServidor) {
    setUltimoDoServidor(doServidor);
    setOrigens(doServidor);
  }

  const [painelAberto, setPainelAberto] = useState(preferencias.painelAberto);
  const [listaAberta, setListaAberta] = useState(preferencias.listaAberta);
  const [ocultos, setOcultos] = useState<string[]>(preferencias.ocultos);
  const [verOcultos, setVerOcultos] = useState(false);
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => {
    const grupoDoAtivo = doServidor.funis.find((f) => f.id === ativo)?.group_id;
    return new Set(grupoDoAtivo ? [grupoDoAtivo] : []);
  });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [janela, setJanela] = useState<Janela | null>(null);

  // O "Negócios" do menu do topo abre o último funil aberto (`/app/escale/negocios`).
  useEffect(() => {
    if (ativo) void guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: ativo });
  }, [ativo]);

  const arvore = useMemo(() => montarOrigens(origens), [origens]);
  const buscando = busca.trim().length > 0;
  const filtrada = buscando ? filtrarArvore(arvore, busca) : arvore;
  const visiveis = verOcultos ? filtrada.grupos : filtrada.grupos.filter((g) => !ocultos.includes(g.id));
  const quantosOcultos = arvore.grupos.filter((g) => ocultos.includes(g.id)).length;
  const nadaAchado = buscando && visiveis.length === 0 && filtrada.semGrupo.length === 0;

  function alternarPainel() {
    const proximo = !painelAberto;
    setPainelAberto(proximo);
    void guardarPreferenciaDeOrigens({ nome: "painel", valor: proximo ? "aberto" : "fechado" });
  }

  function alternarLista() {
    const proximo = !listaAberta;
    setListaAberta(proximo);
    void guardarPreferenciaDeOrigens({ nome: "lista", valor: proximo ? "aberta" : "fechada" });
  }

  function alternarGrupo(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function acaoDoGrupo(id: string, acao: AcaoDoGrupo) {
    if (acao === "ocultar") {
      const proximo = ocultos.includes(id) ? ocultos.filter((o) => o !== id) : [...ocultos, id];
      setOcultos(proximo);
      void guardarPreferenciaDeOrigens({ nome: "ocultos", valor: proximo });
      return;
    }
    setJanela({ tipo: JANELA_DO_GRUPO[acao], id });
  }

  function abrirOrigem(id: string) {
    router.push(`/app/pipelines/${id}`);
  }

  if (!painelAberto) {
    return (
      <div className="relative hidden w-0 shrink-0 md:block">
        <button
          type="button"
          aria-label={t("Abrir o painel de origens")}
          onClick={alternarPainel}
          className="absolute left-0 top-1 z-10 grid size-6 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
        >
          <CaretRight size={12} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label={t("Origens")}
      className="sticky top-0 hidden max-h-[calc(100dvh-6.5rem)] w-64 shrink-0 flex-col rounded-lg border bg-card md:flex"
    >
      <button
        type="button"
        aria-label={t("Recolher o painel de origens")}
        onClick={alternarPainel}
        className="absolute -right-3 top-2 z-10 grid size-6 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
      >
        <CaretLeft size={12} aria-hidden />
      </button>

      <div className="flex items-center gap-1 border-b px-3 py-2">
        <h2 className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Origens")}</h2>
        {podeGerenciar && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={t("Adicionar")} className={BOTAO_DE_ICONE}>
                <Plus size={15} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setJanela({ tipo: "adicionar-origem", grupoId: null })}>
                {t("Adicionar origem")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setJanela({ tipo: "adicionar-grupo" })}>
                {t("Adicionar grupo de origens")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          aria-label={t("Buscar grupo ou funil")}
          aria-pressed={buscaAberta}
          onClick={() => {
            setBuscaAberta((v) => !v);
            setBusca("");
          }}
          className={BOTAO_DE_ICONE}
        >
          <MagnifyingGlass size={15} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={listaAberta ? t("Recolher a lista de origens") : t("Abrir a lista de origens")}
          aria-expanded={listaAberta}
          onClick={alternarLista}
          className={BOTAO_DE_ICONE}
        >
          {listaAberta ? <CaretUp size={14} aria-hidden /> : <CaretDown size={14} aria-hidden />}
        </button>
      </div>

      {buscaAberta && (
        <div className="px-3 pt-2">
          <Input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar grupo ou funil")}
            aria-label={t("Buscar grupo ou funil")}
            className="h-8"
          />
        </div>
      )}

      {listaAberta && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <nav aria-label={t("Funis por grupo")}>
            <ul className="space-y-0.5">
              {visiveis.map((g) => (
                <LinhaDoGrupo
                  key={g.id}
                  grupo={g}
                  aberto={buscando || abertos.has(g.id) || novoEm === g.id}
                  oculto={ocultos.includes(g.id)}
                  ativo={ativo}
                  podeGerenciar={podeGerenciar}
                  criandoAqui={novoEm === g.id}
                  onAlternar={() => alternarGrupo(g.id)}
                  onNovaOrigem={() => setNovoEm(g.id)}
                  onAcao={(a) => acaoDoGrupo(g.id, a)}
                  onAcaoDaOrigem={(funilId, a) => setJanela({ tipo: JANELA_DA_ORIGEM[a], id: funilId })}
                  onCriada={(novas, id) => {
                    setOrigens(novas);
                    setNovoEm(null);
                    abrirOrigem(id);
                  }}
                  onCancelarCriacao={() => setNovoEm(null)}
                />
              ))}
            </ul>
            {filtrada.semGrupo.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("Sem grupo")}
                </p>
                <ul className="space-y-0.5">
                  {filtrada.semGrupo.map((f) => (
                    <LinhaDaOrigem
                      key={f.id}
                      funil={f}
                      ativo={ativo}
                      podeGerenciar={podeGerenciar}
                      recuo={false}
                      onAcao={(a) => setJanela({ tipo: JANELA_DA_ORIGEM[a], id: f.id })}
                    />
                  ))}
                </ul>
              </div>
            )}
          </nav>

          {nadaAchado && <p className="px-2 py-1 text-sm text-muted-foreground">{t("Nada encontrado.")}</p>}

          {quantosOcultos > 0 && (
            <div className="mt-3 flex items-center justify-between px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>
                {(quantosOcultos === 1 ? t("{n} grupo oculto") : t("{n} grupos ocultos")).replace(
                  "{n}",
                  String(quantosOcultos),
                )}
              </span>
              <button type="button" onClick={() => setVerOcultos((v) => !v)} className="font-semibold hover:text-foreground">
                {verOcultos ? t("Esconder") : t("Mostrar")}
              </button>
            </div>
          )}

          {podeGerenciar && <ArquivadosDoPainel arvore={arvore} onOrigens={setOrigens} />}
        </div>
      )}

      {podeGerenciar && (
        <JanelasDeOrigens
          janela={janela}
          origens={origens}
          onFechar={() => setJanela(null)}
          onOrigens={setOrigens}
          onAbrirOrigem={abrirOrigem}
        />
      )}
    </aside>
  );
}
