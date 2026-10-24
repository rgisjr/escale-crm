"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useTextosSalvos } from "@/hooks/campanhas/useConfiguracao";
import { useModelosDeMensagem, type ModeloAprovado } from "@/hooks/escale/useModelosDeMensagem";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import {
  mensagemDoModelo,
  modeloEscolhivel,
  rotuloDaCategoria,
  siglaDoIdioma,
} from "@/lib/escale/campanhas/modelos-da-meta";
import { Check, HelpCircle, Pencil, Plus, RefreshCw, Search } from "@/lib/ui/icons-da-casca";
import { lerConteudo } from "@/lib/channels/template-conteudo";
import { cn } from "@/lib/utils";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "../molde/estilos";

const TODAS = "todas";

/**
 * "ESCOLHER MENSAGEM" (fork Escale, Fase 8B; 09-023, 09-024; N5). Modo
 * "modelos": os modelos aprovados do número (os "usados recentemente" no topo,
 * busca e categoria, prévia, "Aprovado", "Editar modelo"). Modo "textos": os
 * textos salvos da Configuração de campanhas, no mesmo molde.
 */
export function JanelaEscolherMensagem({
  aberta,
  aoFechar,
  modo,
  provider,
  podeSincronizar,
  aoEscolherModelo,
  aoEscolherTexto,
}: {
  aberta: boolean;
  aoFechar: () => void;
  modo: "modelos" | "textos";
  provider: string | null;
  podeSincronizar: boolean;
  aoEscolherModelo: (m: MensagemDeModelo) => void;
  aoEscolherTexto: (texto: string) => void;
}) {
  const t = useT();
  const { modelos, recarregar, recentes, marcarUsado } = useModelosDeMensagem(
    modo === "modelos" ? provider : null,
  );
  const textos = useTextosSalvos();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>(TODAS);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (modo === "textos") {
      return (textos.data ?? [])
        .filter((x) => !termo || x.name.toLowerCase().includes(termo))
        .map((x) => ({
          id: x.id,
          nome: x.name,
          corpo: x.body,
          modelo: null as ModeloAprovado | null,
        }));
    }
    return modelos
      .filter(
        (m) =>
          (!termo || m.name.toLowerCase().includes(termo)) &&
          (categoria === TODAS || (m.category ?? "").toUpperCase() === categoria),
      )
      .map((m) => ({
        id: `${m.name}|${m.language}`,
        nome: m.name,
        corpo: lerConteudo(m.components ?? []).body ?? "",
        modelo: m,
      }));
  }, [modo, textos.data, modelos, busca, categoria]);

  const atual = itens.find((i) => i.id === escolhido) ?? null;
  const podeEscolher = atual !== null && (atual.modelo === null || modeloEscolhivel(atual.modelo));
  const recentesDaLista = modo === "modelos" ? itens.filter((i) => recentes.includes(i.nome)) : [];
  const categorias = [
    ...new Set(modelos.map((m) => (m.category ?? "").toUpperCase()).filter(Boolean)),
  ];

  const selecionar = () => {
    if (!atual || !podeEscolher) return;
    if (atual.modelo) {
      marcarUsado(atual.modelo.name);
      aoEscolherModelo(mensagemDoModelo(atual.modelo));
    } else {
      aoEscolherTexto(atual.corpo);
    }
    aoFechar();
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      await apiClient.post("/api/v1/channels/templates", {});
      recarregar();
    } finally {
      setSincronizando(false);
    }
  };

  const linha = (i: (typeof itens)[number]) => (
    <button
      key={`${i.id}-${recentesDaLista.includes(i) ? "r" : "t"}`}
      type="button"
      role="option"
      aria-selected={i.id === escolhido}
      onClick={() => setEscolhido(i.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left hover:bg-casca-busca",
        i.id === escolhido && "bg-casca-busca",
      )}
    >
      <span
        className={cn(
          "truncate text-[13px] font-semibold",
          i.id === escolhido ? "text-casca-marca" : "text-casca-texto",
        )}
      >
        {i.nome}
      </span>
      {i.modelo && (
        <>
          <span className="text-[9px] font-semibold text-casca-suave">
            {siglaDoIdioma(i.modelo.language)}
          </span>
          {i.modelo.category && (
            <span className="rounded-[4px] bg-(--escale-categoria-fundo) px-1.5 py-0.5 text-[11px] text-(--escale-categoria-texto)">
              {t(rotuloDaCategoria(i.modelo.category))}
            </span>
          )}
        </>
      )}
      {i.id === escolhido && (
        <Check className="ml-auto size-3.5 text-(--escale-status-ganho)" aria-hidden />
      )}
    </button>
  );

  return (
    <JanelaDaCasca
      aberta={aberta}
      onFechar={aoFechar}
      className="w-[min(888px,calc(100vw-2rem))] max-w-none gap-0 p-0"
    >
      <div className="flex h-[60px] items-center gap-2 border-b border-casca-divisoria px-5 pr-14">
        <DialogTitle className="text-[15px] font-medium text-casca-texto">
          {modo === "modelos" ? t("Escolher mensagem") : t("Escolher texto salvo")}
        </DialogTitle>
        <HelpCircle className="size-3.5 text-casca-marca" aria-hidden />
        {modo === "modelos" && (
          <span className="ml-auto flex items-center gap-2">
            {podeSincronizar && (
              <button
                type="button"
                onClick={() => void sincronizar()}
                disabled={sincronizando}
                aria-label={t("Sincronizar modelos")}
                className="flex size-8 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca"
              >
                <RefreshCw className={cn("size-4", sincronizando && "animate-spin")} aria-hidden />
              </button>
            )}
            <Link href="/app/templates" className={BOTAO_DA_MARCA}>
              <Plus className="size-3.5" aria-hidden />
              {t("Novo modelo")}
            </Link>
          </span>
        )}
      </div>
      <div className="flex h-[300px]">
        <div className="flex w-[420px] shrink-0 flex-col border-r border-casca-divisoria p-4">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{t("Pesquisar por...")}</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Pesquisar por...")}
                className="h-8 w-full rounded-[6px] bg-casca-busca pr-8 pl-3 text-[13px] placeholder:text-casca-meta focus-visible:outline-casca-marca"
              />
              <Search className="absolute top-2 right-2 size-4 text-casca-suave" aria-hidden />
            </label>
            {modo === "modelos" && (
              <SeletorDaCasca
                valor={categoria}
                aoMudar={(v) => setCategoria(v || TODAS)}
                aria-label={t("Todas as categorias")}
                opcoes={[
                  { valor: TODAS, rotulo: t("Todas as categorias") },
                  ...categorias.map((c) => ({ valor: c, rotulo: t(rotuloDaCategoria(c)) })),
                ]}
              />
            )}
          </div>
          <div
            role="listbox"
            aria-label={modo === "modelos" ? t("Escolher mensagem") : t("Escolher texto salvo")}
            className="mt-3 min-h-0 flex-1 overflow-y-auto"
          >
            {recentesDaLista.length > 0 && (
              <>
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
                  {t("USADOS RECENTEMENTE")}
                </p>
                {recentesDaLista.map(linha)}
              </>
            )}
            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
              {modo === "modelos" ? t("TODOS OS MODELOS") : t("TEXTOS SALVOS")}
            </p>
            {itens.length === 0 ? (
              <p className="px-2 py-2 text-[13px] text-casca-suave">
                {modo === "modelos" ? t("Nenhum modelo aprovado") : t("Nenhum texto salvo")}
              </p>
            ) : (
              itens.map(linha)
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto p-4">
          {!atual ? (
            <p className="flex h-full items-center justify-center px-10 text-center text-[13px] text-casca-texto-2">
              {t("Selecione um modelo de mensagem à sua esquerda para enviar.")}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-casca-texto">{atual.nome}</span>
                {atual.modelo && (
                  <span
                    className={cn("rounded-[4px] px-1.5 py-0.5 text-[11px]", CLASSE_DO_TOM.verde)}
                  >
                    {t("Aprovado")}
                  </span>
                )}
                {atual.modelo && (
                  <Link
                    href="/app/templates"
                    className="ml-auto flex items-center gap-1 text-[12px] font-medium text-casca-marca"
                  >
                    <Pencil className="size-3" aria-hidden />
                    {t("Editar modelo")}
                  </Link>
                )}
              </div>
              {atual.modelo && (
                <p className="mt-3 text-[13px] text-casca-texto-2">
                  {t("As variáveis serão preenchidas com os dados de cada contato no envio.")}{" "}
                  <button
                    type="button"
                    onClick={selecionar}
                    disabled={!podeEscolher}
                    className="font-semibold text-casca-marca"
                  >
                    {t("Mapear variáveis")}
                  </button>
                </p>
              )}
              {atual.modelo && !modeloEscolhivel(atual.modelo) && (
                <p role="alert" className="mt-2 text-[12px] text-casca-alerta">
                  {t(
                    "Este modelo tem mídia sem link salvo ou variável fora do corpo. Ajuste em Modelos antes de usar na campanha.",
                  )}
                </p>
              )}
              <div className="mt-2 rounded-[8px] bg-(--escale-modelo-balao) p-3 text-[13px] whitespace-pre-wrap text-casca-texto">
                {atual.corpo}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex h-16 items-center justify-end gap-2 border-t border-casca-divisoria px-5">
        <button type="button" onClick={aoFechar} className={BOTAO_CONTORNADO}>
          {t("Cancelar")}
        </button>
        <button
          type="button"
          onClick={selecionar}
          disabled={!podeEscolher}
          className={BOTAO_DA_MARCA}
        >
          {t("Selecionar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
