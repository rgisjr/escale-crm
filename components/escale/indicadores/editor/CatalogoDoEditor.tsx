"use client";
import { useMemo, useState, type ReactNode } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { useValorComAtraso } from "@/hooks/escale/useValorComAtraso";
import type { Categoria } from "@/lib/escale/indicadores/catalogo/tipos";
import {
  assuntoDoRascunho,
  buscarNaTela,
  estadoDoItem,
  filtrarPorCategoria,
  gruposDoAlvo,
  type AlvoDoCatalogo,
  type CatalogoDaTela,
  type EstadoDoItem,
  type ItemDoCatalogo,
} from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import type { RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import { limiteDoTipo, ROTULO_DO_TIPO_DO_GRAFICO } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import { Briefcase, ListChecks, ListFilter, Megaphone, MessageSquare, Phone, Search } from "@/lib/ui/icons-da-casca";
import type { LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DetalheDoCatalogo } from "./DetalheDoCatalogo";
import { ListaDoCatalogo, type SelecaoDoCatalogo } from "./ListaDoCatalogo";

const TITULO_DO_ALVO: Record<AlvoDoCatalogo, string> = {
  indicador: "Adicionar Indicador",
  variavel: "Adicionar Variável",
  tempo: "Adicionar Tempo",
  filtro: "Adicionar Filtro",
};
/** Sem "Meta" (decisão 2). */
const ROTULO_DA_CATEGORIA: Record<Categoria | "todos", string> = {
  todos: "Todos",
  negocios: "Negócios",
  atividades: "Atividades",
  conversas: "Conversas",
  ligacoes: "Ligações",
  campanhas: "Campanhas",
};
const CATEGORIAS: ReadonlyArray<{ valor: Categoria | "todos"; Icone: LucideIcon }> = [
  { valor: "todos", Icone: ListFilter },
  { valor: "negocios", Icone: Briefcase },
  { valor: "atividades", Icone: ListChecks },
  { valor: "conversas", Icone: MessageSquare },
  { valor: "ligacoes", Icone: Phone },
  { valor: "campanhas", Icone: Megaphone },
];
const ESPERA_DA_BUSCA_MS = 150;

type Props = {
  alvo: AlvoDoCatalogo;
  catalogo: CatalogoDaTela | undefined;
  rascunho: RascunhoDoGrafico;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  /** Chamado com o id do item. O popover fica aberto (S21); quem chama fecha, se couber. */
  aoAdicionar: (id: string) => void;
  children: ReactNode;
};

/** O popover "Adicionar Indicador / Variável / Tempo / Filtro" (10-014, 10-049 a 10-051, 10-053, 10-059 a 10-063, 10-065). */
export function CatalogoDoEditor({ alvo, catalogo, rascunho, aberto, aoMudarAberto, aoAdicionar, children }: Props) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const termo = useValorComAtraso(busca, ESPERA_DA_BUSCA_MS);
  const [categoria, setCategoria] = useState<Categoria | "todos">("todos");
  const [selecao, setSelecao] = useState<SelecaoDoCatalogo>(null);

  const todos = useMemo(() => (catalogo ? gruposDoAlvo(catalogo, alvo) : []), [catalogo, alvo]);
  const assuntoFixado = catalogo ? assuntoDoRascunho(rascunho) : null;
  const categoriaFixada = catalogo?.assuntos.find((a) => a.id === assuntoFixado)?.categoria ?? null;
  const grupos = useMemo(() => filtrarPorCategoria(todos, categoria, categoriaFixada), [todos, categoria, categoriaFixada]);
  const achados = useMemo(() => (termo.trim() ? buscarNaTela(grupos, termo) : null), [grupos, termo]);

  const estadoDe = (item: ItemDoCatalogo): EstadoDoItem => (catalogo ? estadoDoItem(item, rascunho, alvo, catalogo) : "livre");
  const nomeDoAssunto = catalogo?.assuntos.find((a) => a.id === assuntoFixado)?.nome ?? "";
  const dicaDe = (estado: EstadoDoItem): string | null => {
    if (estado === "outro_assunto") {
      return t("Este gráfico já usa {assunto}. Escolha itens do mesmo grupo.").replace("{assunto}", nomeDoAssunto);
    }
    if (estado === "no_limite" && alvo === "indicador") {
      return t("Gráfico do tipo {tipo} aceita apenas {limite} indicador(es).")
        .replace("{tipo}", t(ROTULO_DO_TIPO_DO_GRAFICO[rascunho.tipo]))
        .replace("{limite}", String(limiteDoTipo(rascunho.tipo)));
    }
    return null;
  };
  const adicionar = (item: ItemDoCatalogo) => {
    if (estadoDe(item) === "livre") aoAdicionar(item.id);
  };

  return (
    <Popover
      open={aberto}
      onOpenChange={(proximo) => {
        aoMudarAberto(proximo);
        if (!proximo) {
          setBusca("");
          setSelecao(null);
        }
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PainelSuspenso
        side="right"
        sideOffset={8}
        aria-label={t(TITULO_DO_ALVO[alvo])}
        className="flex h-[520px] w-[min(980px,calc(100vw-2rem))] flex-col p-0"
      >
        <div className="px-3 pt-3">
          <h2 className="text-[16px] font-medium text-casca-texto">{t(TITULO_DO_ALVO[alvo])}</h2>
          <label className="mt-2 flex h-8 items-center rounded-[4px] border border-casca-borda bg-surface px-3 focus-within:border-casca-marca">
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar por nome, apelido do indicador ou pergunta...")}
              aria-label={t("Buscar por nome, apelido do indicador ou pergunta...")}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-casca-texto outline-none placeholder:text-casca-meta"
            />
            <Search size={16} aria-hidden className="text-casca-suave" />
          </label>
        </div>
        {!catalogo ? (
          <p className="grid flex-1 place-items-center text-[13px] text-casca-suave">{t("Carregando indicadores...")}</p>
        ) : (
          <div className="mt-3 flex min-h-0 flex-1">
            <ul aria-label={t("Categorias")} className="w-[170px] shrink-0">
              {CATEGORIAS.map(({ valor, Icone }) => {
                const ativa = categoria === valor;
                return (
                  <li key={valor}>
                    <button
                      type="button"
                      aria-pressed={ativa}
                      onClick={() => setCategoria(valor)}
                      className={cn(
                        "relative flex h-9 w-full items-center gap-2 px-3 text-left text-[13px] text-casca-texto hover:bg-casca-raia",
                        ativa && "bg-casca-marca-suave text-casca-marca",
                      )}
                    >
                      {ativa ? <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-casca-marca" /> : null}
                      <Icone size={14} aria-hidden />
                      {t(ROTULO_DA_CATEGORIA[valor])}
                    </button>
                  </li>
                );
              })}
            </ul>
            <ListaDoCatalogo
              grupos={grupos}
              achados={achados}
              termo={termo.trim()}
              selecao={selecao}
              estadoDe={estadoDe}
              dicaDe={dicaDe}
              aoSelecionar={setSelecao}
              aoAdicionar={adicionar}
            />
            <DetalheDoCatalogo grupos={grupos} selecao={selecao} estado={estadoDe} aoAdicionar={adicionar} />
          </div>
        )}
      </PainelSuspenso>
    </Popover>
  );
}
