"use client";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { useT } from "@/hooks/i18n/useT";
import {
  ROTULO_DA_UNIDADE,
  ROTULO_DO_TIPO,
  type Achado,
  type EstadoDoItem,
  type GrupoDoCatalogo,
  type ItemDoCatalogo,
} from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const AMARELO_DA_BUSCA = "bg-[#FFF1A8]";

export type SelecaoDoCatalogo = { grupo: string; item: string | null } | null;

type Props = {
  grupos: readonly GrupoDoCatalogo[];
  /** Com busca: só os achados, com os grupos abertos. */
  achados: readonly Achado[] | null;
  termo: string;
  selecao: SelecaoDoCatalogo;
  estadoDe: (item: ItemDoCatalogo) => EstadoDoItem;
  dicaDe: (estado: EstadoDoItem) => string | null;
  aoSelecionar: (s: SelecaoDoCatalogo) => void;
  aoAdicionar: (item: ItemDoCatalogo) => void;
};

function Selos({ item }: { item: ItemDoCatalogo }) {
  const t = useT();
  const selo = "rounded-[4px] border border-casca-borda px-1.5 text-[11px] text-casca-suave";
  const rotulo = item.unidade ? ROTULO_DA_UNIDADE[item.unidade] : item.tipo ? ROTULO_DO_TIPO[item.tipo] : null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5">
      {rotulo ? <span className={selo}>{t(rotulo)}</span> : null}
    </span>
  );
}

function TrechoMarcado({ texto, de, ate }: { texto: string; de: number; ate: number }) {
  return (
    <>
      {texto.slice(0, de)}
      <mark className={cn(AMARELO_DA_BUSCA, "text-inherit")}>{texto.slice(de, ate)}</mark>
      {texto.slice(ate)}
    </>
  );
}

function LinhaDoItem({
  item,
  apelido,
  grupoId,
  selecao,
  estado,
  dica,
  aoSelecionar,
  aoAdicionar,
}: {
  item: ItemDoCatalogo;
  apelido?: { texto: string; de: number; ate: number };
  grupoId: string;
  selecao: SelecaoDoCatalogo;
  estado: EstadoDoItem;
  dica: string | null;
  aoSelecionar: Props["aoSelecionar"];
  aoAdicionar: Props["aoAdicionar"];
}) {
  const t = useT();
  const selecionado = selecao?.grupo === grupoId && selecao.item === item.id;
  const apagado = estado === "outro_assunto" || estado === "no_limite";
  const corpo = (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={() => aoSelecionar({ grupo: grupoId, item: item.id })}
      onDoubleClick={() => estado === "livre" && aoAdicionar(item)}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-casca-marca-suave",
        selecionado && "bg-casca-marca-suave",
        apagado && "opacity-50",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-casca-texto">{item.nome}</span>
        <Selos item={item} />
        {apelido ? (
          <span className="mt-1 block text-[12px] font-medium text-casca-marca">
            {t("também chamado de {apelido}").replace("{apelido}", "")}
            <TrechoMarcado texto={apelido.texto} de={apelido.de} ate={apelido.ate} />
          </span>
        ) : null}
      </span>
      {estado === "ja_adicionado" ? (
        <span className="shrink-0 rounded-[4px] bg-casca-raia px-1.5 text-[11px] text-casca-suave">{t("Já adicionado")}</span>
      ) : selecionado ? (
        <ChevronRight size={14} aria-hidden className="shrink-0 text-casca-marca" />
      ) : null}
    </button>
  );
  return dica && apagado ? <DicaAoPassar texto={dica} bloco>{corpo}</DicaAoPassar> : corpo;
}

/** A coluna do meio (10-014, 10-049, 10-059, 10-060): grupos fechados, grupo aberto com o item, e a busca. */
export function ListaDoCatalogo({ grupos, achados, termo, selecao, estadoDe, dicaDe, aoSelecionar, aoAdicionar }: Props) {
  const t = useT();
  if (achados && achados.length === 0) {
    return (
      <p className="grid flex-1 place-items-center px-4 text-[13px] text-casca-suave">
        {t('Nada encontrado para "{term}"').replace("{term}", termo)}
      </p>
    );
  }
  const itensVisiveis: ReadonlyArray<{ grupo: GrupoDoCatalogo; itens: Array<{ item: ItemDoCatalogo; apelido?: { texto: string; de: number; ate: number } }> }> =
    achados ?? grupos.map((grupo) => ({ grupo, itens: grupo.itens.map((item) => ({ item })) }));
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto border-x border-casca-divisoria">
      {itensVisiveis.map(({ grupo, itens }) => {
        const aberto = achados !== null || selecao?.grupo === grupo.id;
        return (
          <li key={grupo.id} className="border-b border-casca-divisoria">
            <button
              type="button"
              aria-expanded={aberto}
              onClick={() => aoSelecionar(aberto && achados === null ? null : { grupo: grupo.id, item: null })}
              className={cn(
                "relative flex min-h-11 w-full items-center px-3 text-left hover:bg-casca-raia",
                aberto && "bg-casca-raia",
              )}
            >
              {aberto ? <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-casca-marca" /> : null}
              <span className="text-[13px] font-semibold text-casca-texto">{grupo.nome}</span>
              {" "}
              <span className="ml-1 text-[12px] text-casca-meta">· {grupo.itens.length}</span>
            </button>
            {aberto ? (
              <div className="bg-casca-raia/40">
                {grupo.umaLinhaPor && achados === null ? (
                  <div className="px-3 pb-2">
                    <p className="text-[13px] text-casca-suave">{grupo.umaLinhaPor}</p>
                    {grupo.perguntas.length > 0 ? (
                      <>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-casca-meta">
                          {t("Responde perguntas como")}
                        </p>
                        {grupo.perguntas.map((p) => (
                          <p key={p} className="mt-1 text-[12px] font-medium text-casca-texto">
                            {p}
                          </p>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}
                {itens.map(({ item, apelido }) => (
                  <LinhaDoItem
                    key={item.id}
                    item={item}
                    {...(apelido ? { apelido } : {})}
                    grupoId={grupo.id}
                    selecao={selecao}
                    estado={estadoDe(item)}
                    dica={dicaDe(estadoDe(item))}
                    aoSelecionar={aoSelecionar}
                    aoAdicionar={aoAdicionar}
                  />
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
