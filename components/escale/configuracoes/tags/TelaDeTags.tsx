"use client";
import { useMemo, useState } from "react";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTagsDaCasca } from "@/hooks/escale/useTagsDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { dataBr, filtrarLinhas, paginar, type LinhaDaTela, type PeriodoDeCriacao } from "@/lib/escale/tags/tela";
import { EllipsisVertical, Pencil, Search, Trash2 } from "@/lib/ui/icons-da-casca";

import { BalaoEditarTag } from "./BalaoEditarTag";
import { BalaoNovaTag } from "./BalaoNovaTag";

const POR_PAGINA = [10, 20, 50] as const;
const CABECALHO = "px-3 text-left text-[10px] font-semibold tracking-[0.08em] text-casca-suave uppercase";

type Aberto = { tag: string; removendo: boolean } | null;

/** CONFIGURAÇÕES › TAGS da casca (prints docs/escale/prints/tags/01 a 04). */
export function TelaDeTags({ linhas }: { linhas: LinhaDaTela[] }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const { remover } = useTagsDaCasca();
  const { data: membros = [] } = useAssignableMembers(true);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoDeCriacao>("todos");
  const [criadaPor, setCriadaPor] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(10);
  const [aberto, setAberto] = useState<Aberto>(null);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const [confirmandoLote, setConfirmandoLote] = useState(false);

  const nomeDe = useMemo(
    () => new Map(membros.map((m) => [m.user_id, m.full_name?.trim() || t("Sem nome")])),
    [membros, t],
  );
  const filtradas = filtrarLinhas(linhas, { busca, periodo, criadaPor }, new Date());
  const visiveis = paginar(filtradas, pagina, porPagina);
  const marcadasDaPagina = visiveis.filter((l) => marcadas.has(l.tag)).length;
  const estadoDaPagina =
    visiveis.length > 0 && marcadasDaPagina === visiveis.length ? true : marcadasDaPagina > 0 ? "indeterminada" : false;

  const mudarFiltro = (aplicar: () => void) => {
    aplicar();
    setPagina(1);
  };
  const alternar = (tag: string, ligar: boolean) =>
    setMarcadas((atual) => {
      const proximo = new Set(atual);
      if (ligar) proximo.add(tag);
      else proximo.delete(tag);
      return proximo;
    });
  const marcarPagina = (ligar: boolean) =>
    setMarcadas((atual) => {
      const proximo = new Set(atual);
      for (const l of visiveis) {
        if (ligar) proximo.add(l.tag);
        else proximo.delete(l.tag);
      }
      return proximo;
    });

  async function removerMarcadas() {
    const falharam = new Set<string>();
    for (const tag of marcadas) {
      if (!(await remover(tag))) falharam.add(tag);
    }
    setMarcadas(falharam);
    setConfirmandoLote(false);
  }

  return (
    <div className="flex h-full flex-col px-8 py-6">
      <header className="border-b border-casca-borda pb-4">
        <h1 className="text-[15px] font-semibold text-casca-texto">{t("Tags")}</h1>
        <p className="text-[13px] text-casca-suave">{t("Tags cadastradas")}</p>
      </header>

      <div className="flex items-center justify-between py-5">
        <span className="relative w-[320px]">
          <input
            value={busca}
            placeholder={t("Buscar")}
            onChange={(e) => mudarFiltro(() => setBusca(e.target.value))}
            className="h-8 w-full rounded-[4px] bg-casca-busca pr-8 pl-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
        </span>
        <div className="flex items-center gap-3">
          <SeletorDaCasca
            className="h-8 w-auto bg-transparent"
            aria-label={t("Criada em")}
            valor={periodo === "todos" ? "" : periodo}
            vazio={t("Criada em")}
            opcoes={[
              { valor: "7", rotulo: t("Últimos 7 dias") },
              { valor: "30", rotulo: t("Últimos 30 dias") },
              { valor: "90", rotulo: t("Últimos 90 dias") },
            ]}
            aoMudar={(v) => mudarFiltro(() => setPeriodo((v || "todos") as PeriodoDeCriacao))}
          />
          <SeletorDaCasca
            className="h-8 w-auto bg-transparent"
            aria-label={t("Criada por")}
            valor={criadaPor}
            vazio={t("Criada por")}
            opcoes={membros.map((m) => ({ valor: m.user_id, rotulo: nomeDe.get(m.user_id) ?? "" }))}
            aoMudar={(v) => mudarFiltro(() => setCriadaPor(v))}
          />
          <span className="text-[13px] text-casca-suave">{`${filtradas.length} ${t("itens")}`}</span>
          <BalaoNovaTag
            existentes={linhas.map((l) => l.tag)}
            gatilho={
              <button type="button" className="h-8 rounded-[4px] bg-casca-marca px-4 text-[13px] font-semibold text-white">
                {t("Adicionar tag")}
              </button>
            }
          />
        </div>
      </div>

      {marcadas.size > 0 ? (
        <div className="mb-3 flex items-center gap-3 text-[13px] text-casca-texto">
          {confirmandoLote ? (
            <>
              <span role="alert">{t("Remover as tags selecionadas de todos os contatos?")}</span>
              <button type="button" onClick={() => setConfirmandoLote(false)} className="text-casca-suave">
                {t("Cancelar")}
              </button>
              <button
                type="button"
                onClick={() => void removerMarcadas()}
                className="h-7 rounded-[4px] bg-casca-alerta px-2.5 text-[12px] font-medium text-white"
              >
                {t("Remover")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoLote(true)}
              className="inline-flex items-center gap-1.5 text-casca-alerta"
            >
              <Trash2 size={14} aria-hidden />
              {`${t("Remover selecionadas")} (${marcadas.size})`}
            </button>
          )}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="h-12 border-b border-casca-borda">
              <th className="w-10 px-3">
                <CaixaDaCasca marcada={estadoDaPagina} aoMudar={marcarPagina} aria-label={t("Selecionar a página")} />
              </th>
              <th className={CABECALHO}>{t("Tags")}</th>
              <th className={CABECALHO}>{t("Descrição")}</th>
              <th className={`${CABECALHO} text-center`}>{t("Quantidade em uso")}</th>
              <th className={CABECALHO}>{t("Criada em")}</th>
              <th className={CABECALHO}>{t("Criada por")}</th>
              <th className={`${CABECALHO} text-right`}>{t("Ações")}</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={l.tag} className="group h-12 border-b border-casca-borda text-[13px] text-casca-texto">
                <td className="px-3">
                  <CaixaDaCasca
                    marcada={marcadas.has(l.tag)}
                    aoMudar={(v) => alternar(l.tag, v)}
                    aria-label={`${t("Selecionar")} ${l.tag}`}
                  />
                </td>
                <td className="px-3">
                  <BalaoEditarTag
                    key={`${l.tag}-${aberto?.tag === l.tag}-${aberto?.removendo ?? false}`}
                    linha={l}
                    aberto={aberto?.tag === l.tag}
                    comecaRemovendo={aberto?.tag === l.tag && aberto.removendo}
                    existentes={linhas.map((x) => x.tag).filter((x) => x !== l.tag)}
                    aoFechar={() => setAberto(null)}
                    ancora={
                      <span>
                        <ChipDaTag tag={l.tag} className="h-5 px-2 text-[12px]" />
                      </span>
                    }
                  />
                </td>
                <td className="px-3 text-casca-suave">
                  <span className="inline-flex items-center gap-2">
                    {l.descricao ?? "—"}
                    <button
                      type="button"
                      aria-label={t("Editar descrição")}
                      onClick={() => setAberto({ tag: l.tag, removendo: false })}
                      className="invisible group-hover:visible"
                    >
                      <Pencil size={13} aria-hidden />
                    </button>
                  </span>
                </td>
                <td className="px-3 text-center">{l.emUso}</td>
                <td className="px-3">{dataBr(l.criadaEm, idioma)}</td>
                <td className="px-3">{l.criadaPor ? (nomeDe.get(l.criadaPor) ?? "—") : "—"}</td>
                <td className="px-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={t("Ações")}
                      className="grid size-7 place-items-center rounded-[4px] hover:bg-casca-raia"
                    >
                      <EllipsisVertical size={16} aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setAberto({ tag: l.tag, removendo: false })}>
                        <Pencil size={14} aria-hidden />
                        {t("Editar")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-casca-alerta"
                        onSelect={() => setAberto({ tag: l.tag, removendo: true })}
                      >
                        <Trash2 size={14} aria-hidden />
                        {t("Remover")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginacaoDaCasca
        pagina={pagina}
        total={filtradas.length}
        porPagina={porPagina}
        opcoesPorPagina={POR_PAGINA}
        aoMudarPagina={setPagina}
        aoMudarPorPagina={(n) => mudarFiltro(() => setPorPagina(n))}
      />
    </div>
  );
}
