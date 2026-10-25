"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  SeletorDoFiltro,
  type OpcaoDoFiltro,
} from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_PROGRESSO, textoDasEmpresas } from "@/lib/escale/prospeccao/apresentacao";
import { rotaDaConversa } from "@/lib/escale/prospeccao/rotas";
import {
  acaoDaSelecao,
  descartaveis,
  filtrarEmpresas,
  marcavel,
  podeSelecionar,
} from "@/lib/escale/prospeccao/selecao";
import {
  PROGRESSOS_DA_EMPRESA,
  type DetalheDaProspeccao,
  type ProgressoDaEmpresa,
} from "@/lib/escale/prospeccao/tipos";
import { safePublicLink } from "@/lib/prospecting/schema";
import { Search } from "@/lib/ui/icons-da-casca";

import { SeloDoProgresso } from "../SeloDaProspeccao";

const POR_PAGINA_DAS_EMPRESAS = [20, 50, 100] as const;
const BOTAO =
  "inline-flex h-7 items-center rounded-casca-gatilho border border-casca-borda px-2.5 text-[11px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-50";

/**
 * A ABA DETALHES DA PROSPECÇÃO (molde 012; D10): busca, filtro de Progresso,
 * contagem, a tabela por empresa com o link para a conversa e, em rascunho ou
 * pausada, a seleção e "Excluir desmarcadas" — com as regras do servidor do
 * original (`lib/escale/prospeccao/selecao.ts`).
 */
export function EmpresasDaProspeccao({ detalhe }: { detalhe: DetalheDaProspeccao }) {
  const t = useT();
  const acao = useAcaoDaProspeccao();
  const [busca, setBusca] = useState("");
  const [progressos, setProgressos] = useState<ProgressoDaEmpresa[]>([]);
  const [mostrarDesmarcadas, setMostrarDesmarcadas] = useState(false);
  const [paginaPedida, setPaginaPedida] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_DAS_EMPRESAS[0]);
  const [confirmando, setConfirmando] = useState(false);

  const pode = podeSelecionar(detalhe);
  const visiveis = filtrarEmpresas(detalhe.empresas, {
    busca,
    progressos,
    mostrarDesmarcadas,
    podeSelecionar: pode,
  });
  const elegiveis = pode ? detalhe.empresas.filter((e) => marcavel(e, detalhe)) : [];
  const todasMarcadas = elegiveis.length > 0 && elegiveis.every((e) => e.selecionada);
  const nenhumaMarcada = elegiveis.every((e) => !e.selecionada);
  const desmarcadas = detalhe.empresas.filter((e) => !e.selecionada);
  const apagaveis = descartaveis(detalhe.empresas);
  // A lista pode encolher (desmarcar, excluir, filtro, reconsulta): a página não passa da última.
  const pagina = Math.min(paginaPedida, Math.max(1, Math.ceil(visiveis.length / porPagina)));
  const fatia = visiveis.slice((pagina - 1) * porPagina, pagina * porPagina);
  const opcoesDeProgresso: OpcaoDoFiltro<ProgressoDaEmpresa>[] = PROGRESSOS_DA_EMPRESA.map((p) => ({
    valor: p,
    rotulo: t(ROTULO_DO_PROGRESSO[p]),
  }));

  async function executar(pedido: Parameters<typeof acao.mutateAsync>[0], sucesso: string) {
    try {
      await acao.mutateAsync(pedido);
      toast.success(sucesso);
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."),
      );
      return false;
    }
  }

  const marcar = (ids: string[], selected: boolean) =>
    void executar(
      { action: acaoDaSelecao(detalhe), id: detalhe.linha.id, candidate_ids: ids, selected },
      t("Seleção da fila atualizada."),
    );

  async function excluir() {
    if (
      await executar(
        { action: "discard_unselected", id: detalhe.linha.id },
        t("Empresas desmarcadas excluídas."),
      )
    )
      setConfirmando(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-[240px]">
          <span className="sr-only">{t("Buscar empresa")}</span>
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaPedida(1);
            }}
            placeholder={t("Buscar empresa")}
            className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:bg-surface focus:ring-1 focus:ring-casca-marca"
          />
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-2 right-2.5 text-casca-suave"
          />
        </label>
        <div className="w-[160px]">
          <SeletorDoFiltro
            aria-label={t("Progresso")}
            vazio={t("Progresso")}
            valores={progressos}
            opcoes={opcoesDeProgresso}
            aoMudar={(v) => {
              setProgressos(v);
              setPaginaPedida(1);
            }}
          />
        </div>
        <span className="ml-auto text-[12px] text-casca-suave">
          {textoDasEmpresas(visiveis.length, t)}
        </span>
      </div>

      {pode ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-casca-busca px-3 py-2">
          <span className="text-[11px] text-casca-suave">
            {detalhe.status === "draft"
              ? t("Somente as empresas marcadas entram na fila ao iniciar as abordagens.")
              : t(
                  "Com a campanha pausada, marque ou desmarque as empresas que ainda estão na fila. Quem já foi abordado não muda.",
                )}
          </span>
          <span className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className={BOTAO}
              disabled={acao.isPending || todasMarcadas}
              onClick={() =>
                marcar(
                  elegiveis.map((e) => e.id),
                  true,
                )
              }
            >
              {t("Marcar todas")}
            </button>
            <button
              type="button"
              className={BOTAO}
              disabled={acao.isPending || nenhumaMarcada}
              onClick={() =>
                marcar(
                  elegiveis.map((e) => e.id),
                  false,
                )
              }
            >
              {t("Desmarcar todas")}
            </button>
            {desmarcadas.length ? (
              <button
                type="button"
                className={BOTAO}
                onClick={() => setMostrarDesmarcadas((m) => !m)}
              >
                {mostrarDesmarcadas
                  ? t("Esconder desmarcadas")
                  : `${t("Mostrar desmarcadas")} (${desmarcadas.length})`}
              </button>
            ) : null}
            {apagaveis.length ? (
              <button type="button" className={BOTAO} onClick={() => setConfirmando(true)}>
                {`${t("Excluir desmarcadas")} (${apagaveis.length})`}
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="h-10 border-b border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] text-casca-texto uppercase">
            {pode ? <th className="w-10 pl-2" /> : null}
            <th className="w-[26%]">{t("Empresa")}</th>
            <th className="w-[16%]">{t("Telefone")}</th>
            <th>{t("Informações")}</th>
            <th className="w-[16%]">{t("Progresso")}</th>
            <th className="w-[12%]">{t("Conversa")}</th>
          </tr>
        </thead>
        <tbody>
          {fatia.length === 0 ? (
            <tr>
              <td colSpan={pode ? 6 : 5} className="py-8 text-center text-[12px] text-casca-suave">
                {t("Nenhuma empresa neste filtro.")}
              </td>
            </tr>
          ) : (
            fatia.map((e) => {
              const site = safePublicLink(e.dados.website);
              return (
                <tr
                  key={e.id}
                  className="border-b border-casca-divisoria align-top text-[12px] text-casca-texto"
                >
                  {pode ? (
                    <td className="py-3 pl-2">
                      {marcavel(e, detalhe) ? (
                        <CaixaDaCasca
                          marcada={e.selecionada}
                          aoMudar={(v) => marcar([e.id], v)}
                          aria-label={`${t("Marcar empresa para abordagem")}: ${e.dados.name}`}
                          desabilitada={acao.isPending}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="py-3">
                    <p className="font-medium">{e.dados.name}</p>
                    {e.dados.category ? (
                      <p className="text-[11px] text-casca-meta">{e.dados.category}</p>
                    ) : null}
                  </td>
                  <td className="py-3">{e.dados.phone ?? t("Sem telefone")}</td>
                  <td className="py-3 text-[11px] text-casca-suave">
                    {e.dados.address ? <p>{e.dados.address}</p> : null}
                    {site ? (
                      <a
                        href={site}
                        target="_blank"
                        rel="noreferrer"
                        className="text-casca-marca hover:underline"
                      >
                        {t("Site da empresa")}
                      </a>
                    ) : null}
                    <p>
                      {e.dados.rating === null ? "—" : e.dados.rating.toLocaleString("pt-BR")} ★ ·{" "}
                      {(e.dados.reviews ?? 0).toLocaleString("pt-BR")} {t("avaliações")}
                    </p>
                  </td>
                  <td className="py-3">
                    <SeloDoProgresso progresso={e.progresso} />
                    {e.erro ? <p className="mt-1 text-[11px] text-casca-suave">{e.erro}</p> : null}
                  </td>
                  <td className="py-3">
                    {e.conversaId ? (
                      <Link
                        href={rotaDaConversa(e.conversaId)}
                        className="text-casca-marca hover:underline"
                      >
                        {t("Abrir conversa")}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {visiveis.length > POR_PAGINA_DAS_EMPRESAS[0] ? (
        <PaginacaoDaCasca
          pagina={pagina}
          total={visiveis.length}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA_DAS_EMPRESAS}
          aoMudarPagina={setPaginaPedida}
          aoMudarPorPagina={(n) => {
            setPorPagina(n);
            setPaginaPedida(1);
          }}
        />
      ) : null}

      <JanelaDeConfirmacao
        aberta={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo={t("Excluir desmarcadas")}
        rotuloDoConfirmar={t("Excluir desmarcadas")}
        aoConfirmar={() => void excluir()}
        perigo
        ocupado={acao.isPending}
      >
        <p className="text-[13px] text-casca-texto">
          {t(
            "As empresas desmarcadas saem desta lista e podem aparecer de novo numa busca futura. Esta ação não pode ser desfeita.",
          )}
        </p>
      </JanelaDeConfirmacao>
    </div>
  );
}
