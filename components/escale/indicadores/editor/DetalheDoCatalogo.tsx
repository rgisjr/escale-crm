"use client";
import { useOpcoesDaDimensao } from "@/hooks/escale/useOpcoesDaDimensao";
import { useT } from "@/hooks/i18n/useT";
import {
  ROTULO_DA_UNIDADE,
  type EstadoDoItem,
  type GrupoDoCatalogo,
  type ItemDoCatalogo,
} from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { CircleAlert } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import type { SelecaoDoCatalogo } from "./ListaDoCatalogo";

const CATEGORIA_NOME: Record<string, string> = {
  negocios: "Negócios",
  atividades: "Atividades",
  conversas: "Conversas",
  ligacoes: "Ligações",
  campanhas: "Campanhas",
};
const SELO_PEQUENO = "inline-flex h-6 items-center rounded-[4px] border border-casca-borda px-2 text-[11px] text-casca-texto";
const TITULO = "mt-4 text-[13px] font-semibold text-casca-texto";

function ExemplosDoItem({ item }: { item: ItemDoCatalogo }) {
  const t = useT();
  const q = useOpcoesDaDimensao(item.id, Boolean(item.opcoes) && item.opcoes !== "campo");
  const exemplos = (q.data ?? []).slice(0, 3);
  if (exemplos.length === 0) return null;
  return (
    <>
      <p className={TITULO}>{t("Exemplo de como aparece:")}</p>
      <ul className="mt-2 rounded-[6px] border border-casca-borda p-2">
        {exemplos.map((e, i) => (
          <li key={e.valor} className={cn("truncate text-[13px] text-casca-texto", i === 2 && "opacity-50")}>
            {e.rotulo}
          </li>
        ))}
      </ul>
    </>
  );
}

function DetalheDoItem({ item, grupo }: { item: ItemDoCatalogo; grupo: GrupoDoCatalogo }) {
  const t = useT();
  const categoria = grupo.categoria ? t(CATEGORIA_NOME[grupo.categoria] ?? "") : null;
  return (
    <>
      <p className="text-[11px] text-casca-meta">{categoria ? `${categoria} / ${grupo.nome}` : grupo.nome}</p>
      <h3 className="mt-1 text-[18px] font-semibold text-casca-texto">{item.nome}</h3>
      {item.unidade ? (
        <span className="mt-2 inline-flex w-fit rounded-[4px] bg-casca-marca-suave px-2 py-0.5 text-[10px] font-semibold uppercase text-casca-marca">
          {t(ROTULO_DA_UNIDADE[item.unidade])}
        </span>
      ) : null}
      {item.descricao || item.apelidos.length > 0 ? (
        <p className="mt-3 text-[13px] text-casca-suave">
          {item.descricao}
          {item.apelidos.length > 0 ? ` ${t("Também chamado de {lista}.").replace("{lista}", item.apelidos.join(", "))}` : ""}
        </p>
      ) : null}
      {item.perguntas.length > 0 ? (
        <>
          <p className={TITULO}>{t("Responde perguntas como")}</p>
          {item.perguntas.map((p) => (
            <p key={p} className="mt-1 text-[13px] text-casca-suave">
              {p}
            </p>
          ))}
        </>
      ) : null}
      <ExemplosDoItem item={item} />
      {item.antesDeUsar ? (
        <div className="mt-4 rounded-[6px] border border-casca-nota-borda bg-casca-nota p-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
            <CircleAlert size={14} aria-hidden className="text-casca-atencao" />
            {t("Antes de usar")}
          </p>
          <p className="mt-1 text-[13px] text-casca-texto">{item.antesDeUsar}</p>
        </div>
      ) : null}
      {item.colunas && item.colunas.length > 0 ? (
        <>
          <p className="mt-4 text-[10px] font-semibold uppercase text-casca-meta">{t("Ao clicar no número você vê")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.colunas.map((c) => (
              <span key={c} className={SELO_PEQUENO}>
                {c}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

/** A coluna da direita (10-014, 10-049 a 10-051, 10-060, 10-063): vazio, grupo ou item, e o "Adicionar" fixo no pé. */
export function DetalheDoCatalogo({
  grupos,
  selecao,
  estado,
  aoAdicionar,
}: {
  grupos: readonly GrupoDoCatalogo[];
  selecao: SelecaoDoCatalogo;
  estado: (item: ItemDoCatalogo) => EstadoDoItem;
  aoAdicionar: (item: ItemDoCatalogo) => void;
}) {
  const t = useT();
  const grupo = grupos.find((g) => g.id === selecao?.grupo);
  const item = grupo?.itens.find((i) => i.id === selecao?.item);
  return (
    <div className="flex w-[320px] shrink-0 flex-col px-4 py-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!grupo ? (
          <p className="mt-auto text-[12px] text-casca-meta">
            {t("Escolha um item da lista para ver o que ele conta e como o valor aparece.")}
          </p>
        ) : !item ? (
          <>
            <p className="text-[11px] text-casca-meta">{t("Grupo selecionado")}</p>
            <h3 className="mt-1 text-[18px] font-semibold text-casca-texto">{grupo.nome}</h3>
            {grupo.umaLinhaPor ? (
              <>
                <p className={TITULO}>{t("Uma linha representa")}</p>
                <p className="mt-1 text-[13px] text-casca-suave">{grupo.umaLinhaPor}</p>
              </>
            ) : null}
            {grupo.perguntas.length > 0 ? (
              <>
                <p className={TITULO}>{t("Responde perguntas como")}</p>
                {grupo.perguntas.map((p) => (
                  <p key={p} className="mt-1 text-[13px] text-casca-suave">
                    {p}
                  </p>
                ))}
              </>
            ) : null}
          </>
        ) : (
          <DetalheDoItem item={item} grupo={grupo} />
        )}
      </div>
      {item ? (
        <button
          type="button"
          disabled={estado(item) !== "livre"}
          onClick={() => aoAdicionar(item)}
          className="mt-3 h-8 w-full shrink-0 rounded-[6px] bg-casca-marca text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-casca-marca"
        >
          {t("Adicionar")}
        </button>
      ) : null}
    </div>
  );
}
