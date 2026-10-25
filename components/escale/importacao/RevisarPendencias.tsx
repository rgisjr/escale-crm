"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useImportacao, useLinhasDaImportacao, useResolverEmLote, useResolverLinha } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import type { Resolucao } from "@/lib/escale/importacao/classificar";
import { REGRAS, type Acao, type Motivo } from "@/lib/escale/importacao/regras";
import { ROTULO_DO_MOTIVO, rotuloDaAcao } from "@/lib/escale/importacao/textos";
import type { LinhaLida } from "@/lib/escale/importacao/tipos";
import { ArrowLeft, CheckCircle2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DetalheDaPendencia } from "./DetalheDaPendencia";

const ROTULO_FIXO: Record<string, string> = {
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  instagram: "Instagram",
  nascimento: "Data de nascimento",
  empresa: "Empresa",
  id: "ID",
};

const nomeDaLinha = (l: LinhaLida) => {
  const n = l.normalizado as { nome?: string; email?: string; telefone?: string; negocio?: { titulo?: string } };
  return n.nome || n.email || n.telefone || n.negocio?.titulo || `#${l.numero}`;
};

export function RevisarPendencias({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const importacao = useImportacao(id);
  const lidas = useLinhasDaImportacao(id, "revisar");
  const resolver = useResolverLinha(id);
  const emLote = useResolverEmLote(id);
  const catalogo = useCatalogoDeCampos("contato").catalogo;
  const [linhas, setLinhas] = useState<LinhaLida[]>([]);
  const [maior, setMaior] = useState(0);
  const [filtro, setFiltro] = useState<Motivo | null>(null);
  const [escolhida, setEscolhida] = useState<string | null>(null);

  useEffect(() => {
    if (!lidas.data) return;
    setLinhas(lidas.data);
    setMaior((m) => Math.max(m, lidas.data.length));
  }, [lidas.data]);

  const rotuloDoCampo = (campo: string) => {
    if (campo.startsWith("campo:")) {
      const chave = campo.slice(6);
      return catalogo?.campos.find((c) => c.chave === chave)?.definicao.label ?? chave;
    }
    return t(ROTULO_FIXO[campo] ?? campo);
  };

  const porMotivo = useMemo(() => {
    const m = new Map<Motivo, number>();
    for (const l of linhas) if (l.motivo) m.set(l.motivo, (m.get(l.motivo) ?? 0) + 1);
    return [...m.entries()];
  }, [linhas]);
  const visiveis = filtro ? linhas.filter((l) => l.motivo === filtro) : linhas;
  const atual = visiveis.find((l) => l.id === escolhida) ?? visiveis[0] ?? null;
  const resolvidas = Math.max(0, maior - linhas.length);

  // A revisão traz no máximo 500 linhas: esvaziou a lista local mas a importação ainda tem pendências, busca as próximas.
  const faltam = importacao.data?.revisar ?? 0;
  const [buscouComFaltando, setBuscouComFaltando] = useState(-1);
  const [buscandoMais, setBuscandoMais] = useState(false);
  const esvaziou = maior > 0 || lidas.data?.length === 0;
  const precisaBuscar = linhas.length === 0 && esvaziou && !!lidas.data && !lidas.isError && faltam > 0 && buscouComFaltando !== faltam;
  const { refetch: buscarDeNovo } = lidas;
  useEffect(() => {
    if (!precisaBuscar || lidas.isFetching) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marca que a busca saiu, para a tela esperar em vez de dizer "Tudo revisado!"
    setBuscouComFaltando(faltam);
    setBuscandoMais(true);
    void Promise.resolve(buscarDeNovo()).finally(() => setBuscandoMais(false));
  }, [precisaBuscar, lidas.isFetching, faltam, buscarDeNovo]);

  async function resolverAtual(acao: Acao, dados?: Resolucao["dados"]) {
    if (!atual) return;
    const i = visiveis.findIndex((l) => l.id === atual.id);
    const proxima = visiveis[i + 1] ?? visiveis[i - 1] ?? null;
    try {
      const r = await resolver.mutateAsync({ linhaId: atual.id, resolucao: dados ? { acao, dados } : { acao } });
      setEscolhida(proxima?.id ?? null);
      if (r.status === "revisar") await lidas.refetch();
      else setLinhas((ls) => ls.filter((l) => l.id !== atual.id));
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Não foi possível iniciar a importação."));
    }
  }

  async function aplicarATodas(acao: Acao) {
    if (!filtro) return;
    try {
      await emLote.mutateAsync({ motivo: filtro, acao });
      setLinhas((ls) => ls.filter((l) => l.motivo !== filtro));
      setFiltro(null);
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Não foi possível iniciar a importação."));
    }
  }

  const voltar = () => router.push("/app/imports");
  const opcoesDoLote = filtro
    ? REGRAS[filtro].opcoes.filter((a) => a !== "PICK_MANUALLY" && !(REGRAS[filtro].desligadas ?? []).includes(a))
    : [];

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 px-[30px]">
        <div className="flex items-center gap-2">
          <BotaoDaCasca type="button" variante="icone" aria-label={t("Voltar")} onClick={voltar}>
            <ArrowLeft aria-hidden />
          </BotaoDaCasca>
          <div>
            <h1 className="text-[20px] font-medium text-casca-texto">{t("Revisar pendências")}</h1>
            <p className="text-[12px] text-[#5A5964]">{t("{n} linhas para revisar").replace("{n}", String(linhas.length))}</p>
          </div>
        </div>
        {maior > 0 ? (
          <div className="flex min-w-[200px] flex-col items-end gap-1">
            <p className="text-[12px] text-[#5A5964]">
              {t("{resolved} de {total} resolvidas").replace("{resolved}", String(resolvidas)).replace("{total}", String(maior))}
            </p>
            <div className="h-1.5 w-[200px] overflow-hidden rounded-full bg-[#ECEBF1]">
              <div className="h-full rounded-full bg-casca-marca" style={{ width: `${Math.round((resolvidas / maior) * 100)}%` }} />
            </div>
          </div>
        ) : null}
      </header>

      {lidas.isLoading || precisaBuscar || buscandoMais || (linhas.length === 0 && esvaziou && lidas.isFetching) ? (
        <p className="p-10 text-center text-[13px] text-[#5A5964]">{t("Carregando…")}</p>
      ) : lidas.isError && linhas.length === 0 ? (
        <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-10">
          <p className="font-semibold text-casca-texto">{t("Não foi possível carregar as pendências.")}</p>
          <BotaoDaCasca type="button" variante="marca" onClick={() => void lidas.refetch()}>
            {t("Tentar de novo")}
          </BotaoDaCasca>
        </div>
      ) : linhas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10">
          <CheckCircle2 size={40} aria-hidden className="text-[#1F9D55]" />
          <p className="font-semibold text-casca-texto">{t("Tudo revisado!")}</p>
          <BotaoDaCasca type="button" variante="marca" onClick={voltar}>
            {t("Voltar para a lista")}
          </BotaoDaCasca>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
          <div role="tablist" className="inline-flex flex-wrap gap-0.5 self-start rounded-[8px] bg-[#F4F4F7] p-0.5">
            {([[null, t("Todas"), linhas.length], ...porMotivo.map(([m, c]) => [m, t(ROTULO_DO_MOTIVO[m].rotulo), c])] as Array<
              [Motivo | null, string, number]
            >).map(([m, rotulo, c]) => (
              <button
                key={m ?? "todas"}
                type="button"
                role="tab"
                aria-selected={filtro === m}
                onClick={() => {
                  setFiltro(m);
                  setEscolhida(null);
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium",
                  filtro === m ? "bg-white text-casca-texto shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-[#5A5964]",
                )}
              >
                {rotulo}
                <span className="rounded-full bg-casca-marca-suave px-1.5 text-[11px] text-casca-marca">{c}</span>
              </button>
            ))}
          </div>

          {filtro && opcoesDoLote.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-casca-borda bg-[#F8F8FA] p-3">
              <p className="text-[14px] text-[#5A5964]">{t("Aplicar a todas as {n} deste motivo:").replace("{n}", String(visiveis.length))}</p>
              {opcoesDoLote.map((acao) => (
                <button
                  key={acao}
                  type="button"
                  disabled={emLote.isPending}
                  onClick={() => void aplicarATodas(acao)}
                  className={cn(
                    "h-6 rounded-[6px] px-2.5 text-[12px] font-medium disabled:opacity-50",
                    acao === "SKIP_ROW" ? "border border-[#D9D8E0] text-casca-texto" : "bg-casca-marca text-accent-foreground",
                  )}
                >
                  {t(rotuloDaAcao(acao, filtro).curto)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex min-h-[420px] flex-1 gap-4">
            <div className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-[8px] border border-casca-borda bg-white">
              <p className="shrink-0 border-b border-[#F1F0F5] px-3 pt-3 pb-2 text-[12px] font-semibold tracking-[0.06em] text-[#86858F] uppercase">
                {t("Pendências")} <span className="font-normal">({visiveis.length})</span>
              </p>
              <div className="flex-1 overflow-y-auto">
                {visiveis.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setEscolhida(l.id)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 border-b border-l-[3px] border-b-[#F1F0F5] px-3 py-3 text-left",
                      atual?.id === l.id ? "border-l-casca-marca bg-[#F8F8FA]" : "border-l-transparent hover:bg-[#F8F8FA]",
                    )}
                  >
                    <span className="truncate text-[14px] font-semibold text-casca-texto">{nomeDaLinha(l)}</span>
                    {l.motivo ? (
                      <span className="max-w-full self-start truncate rounded-full bg-[#F4F4F7] px-2 py-0.5 text-[11px] text-[#5A5964]">
                        {t(ROTULO_DO_MOTIVO[l.motivo].rotulo)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto rounded-[8px] border border-casca-borda bg-white p-6">
              {atual ? (
                <DetalheDaPendencia
                  key={atual.id}
                  linha={atual}
                  ocupado={resolver.isPending}
                  rotuloDoCampo={rotuloDoCampo}
                  aoResolver={(acao, dados) => void resolverAtual(acao, dados)}
                />
              ) : (
                <p className="flex h-full items-center justify-center text-[#5A5964]">{t("Selecione uma linha.")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
