"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useModelosDaConta, useRessincronizarModelos } from "@/hooks/escale/useModelosDaConta";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast } from "@/lib/auth/types";
import {
  FILTROS_VAZIOS,
  categoriaDoModelo,
  filtrarModelos,
  quantasVariaveis,
  siglaDoIdioma,
  statusDoModelo,
  type FiltrosDosModelos,
  type ModeloDaConta,
  type TomDoStatus,
} from "@/lib/escale/conversas/modelos";
import { Plus, RotateCcw, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { JanelaDoModelo } from "./JanelaDoModelo";

const CABECA = "h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";
const POR_PAGINA = [10, 25, 50] as const;

const TOM: Record<TomDoStatus, string> = {
  ok: "bg-[color:var(--escale-status-ganho)]/12 text-[color:var(--escale-status-ganho)]",
  espera: "bg-casca-raia text-casca-suave",
  erro: "bg-casca-alerta/10 text-casca-alerta",
  neutro: "bg-casca-raia text-casca-suave",
};

/**
 * CONVERSAS › CONFIGURAÇÕES › MODELOS DE MENSAGEM (fork Escale, Frente V;
 * print v01 da Clint). A lista dos modelos da conta oficial, com a busca, os
 * filtros, o contador de variáveis e a janela que diz de onde vem cada valor.
 * Pastas, Desempenho, Envios (30d), Entrega e Dispositivo ficam para depois (D5).
 */
export function TelaModelosDeMensagem() {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = roleAtLeast(activeOrg?.role, "admin");
  const { data, isLoading, isError } = useModelosDaConta();
  const ressincronizar = useRessincronizarModelos();
  const [filtros, setFiltros] = useState<FiltrosDosModelos>(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA[0]);
  const [aberto, setAberto] = useState<ModeloDaConta | null>(null);

  const modelos = useMemo(() => data?.templates ?? [], [data]);
  const filtrados = useMemo(() => filtrarModelos(modelos, filtros), [modelos, filtros]);
  const pagina_ = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);
  const opcoes = (valores: string[]) => [...new Set(valores)].sort().map((v) => ({ valor: v, rotulo: v }));
  const filtrar = (campo: keyof FiltrosDosModelos, valor: string) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-modelos-de-mensagem">
      <CabecaDaConfiguracao
        migalhas={[
          { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
          { rotulo: t("Modelos de mensagem") },
        ]}
      />
      <div className="flex h-14 shrink-0 items-center gap-3 px-6">
        <span className="flex h-8 w-[240px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input
            aria-label={t("Buscar por modelo...")}
            value={filtros.busca}
            onChange={(e) => filtrar("busca", e.target.value)}
            placeholder={t("Buscar por modelo...")}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta"
          />
          <Search size={16} aria-hidden className="text-casca-suave" />
        </span>
        <SeletorDaCasca
          valor={filtros.status}
          opcoes={opcoes(modelos.map((m) => statusDoModelo(m.status).rotulo))}
          aoMudar={(v) => filtrar("status", v)}
          vazio={t("Status")}
          aria-label={t("Status")}
        />
        <SeletorDaCasca
          valor={filtros.categoria}
          opcoes={opcoes(modelos.map((m) => categoriaDoModelo(m.category)))}
          aoMudar={(v) => filtrar("categoria", v)}
          vazio={t("Categoria")}
          aria-label={t("Categoria")}
        />
        <SeletorDaCasca
          valor={filtros.idioma}
          opcoes={[...new Set(modelos.map((m) => siglaDoIdioma(m.language)))].sort().map((v) => ({ valor: v, rotulo: v }))}
          aoMudar={(v) => filtrar("idioma", v)}
          vazio={t("Idioma")}
          aria-label={t("Idioma")}
        />
        <span className="flex-1" />
        {ehAdmin ? (
          <button
            type="button"
            aria-label={t("Ressincronizar")}
            title={t("Ressincronizar modelos de mensagem com sua conta do Facebook Business")}
            disabled={ressincronizar.isPending}
            onClick={() =>
              ressincronizar.mutate(undefined, {
                onSuccess: () => toast.success(t("Os modelos de mensagem foram sincronizados com sucesso!")),
                onError: () => toast.error(t("Erro ao sincronizar os modelos de mensagem.")),
              })
            }
            className="grid size-8 place-items-center rounded-casca-gatilho border border-casca-borda text-casca-texto hover:bg-casca-raia disabled:opacity-50"
          >
            <RotateCcw size={16} aria-hidden className={cn(ressincronizar.isPending && "animate-spin")} />
          </button>
        ) : null}
        <a href="/app/settings/canal-oficial">
          <BotaoDaCasca variante="marca">
            <Plus size={16} aria-hidden />
            {t("Modelo")}
          </BotaoDaCasca>
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isError ? (
          <p className="py-16 text-center text-[13px] text-casca-alerta">
            {t("Não foi possível carregar os modelos de mensagem.")}
          </p>
        ) : !isLoading && modelos.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-casca-suave">
            {t("Seus modelos de mensagem ainda não foram sincronizados com o Facebook.")}
          </p>
        ) : !isLoading && filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-semibold text-casca-texto">{t("Nenhum modelo corresponde aos filtros.")}</p>
            <button
              type="button"
              className="mt-1 text-[13px] text-casca-marca hover:underline"
              onClick={() => setFiltros(FILTROS_VAZIOS)}
            >
              {t("Limpar filtros")}
            </button>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-casca-borda">
                <th className={CABECA}>{t("Conta/Modelo")}</th>
                <th className={`${CABECA} w-[140px] text-center`}>{t("Categoria")}</th>
                <th className={`${CABECA} w-[100px] text-center`}>{t("Idioma")}</th>
                <th className={`${CABECA} w-[140px] text-center`}>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {pagina_.map((m) => {
                const status = statusDoModelo(m.status);
                const n = quantasVariaveis(m);
                return (
                  <tr
                    key={`${m.name}:${m.language}`}
                    aria-label={m.name}
                    onClick={() => setAberto(m)}
                    className="cursor-pointer border-b border-casca-borda hover:bg-casca-raia/50"
                  >
                    <td className="px-4 py-3">
                      <span className="block truncate text-[13px] text-casca-texto">{m.name}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[11px] text-casca-suave">
                        {data?.waba ? <span>{t("Conta oficial")}</span> : null}
                        {n > 0 ? (
                          <span className="rounded-[4px] border border-casca-borda px-1 font-mono">
                            {"{ }"} {n === 1 ? t("1 variável") : `${n} ${t("variáveis")}`}
                          </span>
                        ) : null}
                        {m.mapeamento.desatualizado ? (
                          <span className="text-casca-alerta">{t("Variáveis desatualizadas")}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-[4px] bg-casca-marca-suave px-2 py-0.5 text-[12px] text-casca-marca">
                        {t(categoriaDoModelo(m.category))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] font-semibold text-casca-texto">
                      {siglaDoIdioma(m.language)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("rounded-full px-2 py-0.5 text-[12px]", TOM[status.tom])}>
                        {t(status.rotulo)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="shrink-0 border-t border-casca-borda px-6">
        <PaginacaoDaCasca
          pagina={pagina}
          total={filtrados.length}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={(n) => {
            setPorPagina(n);
            setPagina(1);
          }}
        />
      </div>
      {aberto ? <JanelaDoModelo modelo={aberto} aoFechar={() => setAberto(null)} somenteLeitura={!ehAdmin} /> : null}
    </div>
  );
}
