"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ItemDeColuna } from "@/lib/escale/contatos/regras";
import type { CampoDeColuna } from "@/lib/escale/contatos/regras";
import type { LinhaDeEmpresa } from "@/lib/escale/empresas/banco";
import { type ColunaNativaDeEmpresa, ROTULO_DA_COLUNA_DE_EMPRESA } from "@/lib/escale/empresas/regras";
import { Building2, Trash2 } from "@/lib/ui/icons-da-casca";

import { BotaoVer, CelulaCampoDaEmpresa, CelulaPrincipal, CelulaValor } from "./CelulasDaEmpresa";
import { Monograma } from "./Monograma";

export interface TabelaDeEmpresasProps {
  linhas: LinhaDeEmpresa[];
  colunas: ItemDeColuna[];
  camposDaEmpresa: CampoDeColuna[];
  moeda: string;
  carregando: boolean;
  erro: boolean;
  busca: string;
  podeExcluir: boolean;
  aoTentarDeNovo: () => void;
  aoLimparBusca: () => void;
  aoNovaEmpresa: () => void;
  aoExcluir: (linha: LinhaDeEmpresa) => Promise<void> | void;
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios).replace("{n}", String(n));

/** A tabela de empresas da Clint (04-001, `ga`/`Fe`). */
export function TabelaDeEmpresas(p: TabelaDeEmpresasProps) {
  const t = useT();
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<LinhaDeEmpresa | null>(null);
  const abrir = (id: string, aba?: "contatos" | "negocios") => router.push(`/app/companies/${id}${aba ? `?aba=${aba}` : ""}`);
  const rotulo = (c: ItemDeColuna) =>
    c.tipo === "nativa" ? t(ROTULO_DA_COLUNA_DE_EMPRESA[c.chave as ColunaNativaDeEmpresa]) : (p.camposDaEmpresa.find((x) => x.chave === c.chave)?.rotulo ?? c.chave);

  const celula = (c: ItemDeColuna, l: LinhaDeEmpresa) => {
    if (c.tipo === "campo") return <CelulaCampoDaEmpresa campo={p.camposDaEmpresa.find((x) => x.chave === c.chave)} linha={l} />;
    switch (c.chave as ColunaNativaDeEmpresa) {
      case "contato_principal":
        return <CelulaPrincipal linha={l} />;
      case "segmento":
        return <CelulaCampoDaEmpresa campo={{ chave: "segmento", rotulo: "Segmento", tipo: "text" }} linha={l} />;
      case "contatos":
        return <BotaoVer rotulo={plural(l.contatos, t("Ver {n} contato"), t("Ver {n} contatos"))} href={`/app/companies/${l.id}?aba=contatos`} />;
      case "valor_aberto":
        return <CelulaValor valor={l.valor_aberto} moeda={p.moeda} />;
      default:
        return l.negocios > 0
          ? <BotaoVer rotulo={plural(l.negocios, t("Ver {n} negócio"), t("Ver {n} negócios"))} href={`/app/companies/${l.id}?aba=negocios`} />
          : <span className="text-[12px] text-casca-meta">—</span>;
    }
  };

  const vazio = !p.carregando && !p.erro && p.linhas.length === 0;
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-casca-fundo">
          <tr className="h-[52px] border-b border-casca-borda">
            <th scope="col" className="px-6 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto">{t("Nome")}</th>
            {p.colunas.map((c) => (
              <th key={`${c.tipo}:${c.chave}`} scope="col" className="px-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto">{rotulo(c)}</th>
            ))}
            <th scope="col" aria-label={t("Ações")} className="w-14" />
          </tr>
        </thead>
        <tbody>
          {p.carregando &&
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="h-16 border-b border-casca-borda">
                <td className="px-6"><span className="block h-9 w-[220px] animate-pulse rounded-[6px] bg-casca-raia" /></td>
                {p.colunas.map((c) => <td key={`${c.tipo}:${c.chave}`} className="px-3"><span className="block h-3.5 w-24 animate-pulse rounded-md bg-casca-raia" /></td>)}
                <td />
              </tr>
            ))}
          {!p.carregando && p.erro && (
            <tr><td colSpan={p.colunas.length + 2} className="py-16 text-center">
              <p className="text-[14px] font-medium text-casca-texto">{t("Não foi possível carregar as empresas.")}</p>
              <button type="button" onClick={p.aoTentarDeNovo} className="mt-2 text-[13px] text-casca-marca">{t("Tentar de novo")}</button>
            </td></tr>
          )}
          {vazio && (
            <tr><td colSpan={p.colunas.length + 2} className="py-16">
              {p.busca.trim() ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[13px] text-casca-suave">{t('Nenhuma empresa encontrada para "{search}".').replace("{search}", p.busca.trim())}</p>
                  <button type="button" onClick={p.aoLimparBusca} className="text-[13px] font-medium text-casca-marca">{t("Limpar busca")}</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-casca-marca-suave text-casca-marca"><Building2 size={22} /></span>
                  <p className="text-[15px] font-medium text-casca-texto">{t("Organize seus contatos por empresa")}</p>
                  <p className="max-w-[420px] text-[13px] text-casca-suave">{t("Agrupe contatos em empresas e veja negócios e atividades de toda a conta em um só lugar.")}</p>
                  <BotaoDaCasca variante="marca" onClick={p.aoNovaEmpresa}>{t("Nova empresa")}</BotaoDaCasca>
                </div>
              )}
            </td></tr>
          )}
          {!p.carregando && !p.erro && p.linhas.map((l) => (
            <tr key={l.id} onClick={() => abrir(l.id)} className="group h-16 cursor-pointer border-b border-casca-borda hover:bg-casca-raia">
              <td className="px-6">
                <span className="flex items-center gap-3">
                  <Monograma nome={l.nome} />
                  <span title={l.nome} className="truncate text-[14px] font-semibold text-casca-texto">{l.nome || t("Sem nome")}</span>
                </span>
              </td>
              {p.colunas.map((c) => <td key={`${c.tipo}:${c.chave}`} className="px-3">{celula(c, l)}</td>)}
              <td className="pr-4 text-right">
                {p.podeExcluir && (
                  <button
                    type="button"
                    aria-label={t("Excluir empresa")}
                    title={t("Excluir empresa")}
                    onClick={(e) => { e.stopPropagation(); setExcluindo(l); }}
                    className="rounded-[6px] p-1 text-casca-meta hover:bg-casca-raia hover:text-casca-texto"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <JanelaDeConfirmacao
        aberta={Boolean(excluindo)}
        aoFechar={() => setExcluindo(null)}
        rotuloDoConfirmar={t("Excluir")}
        perigo
        aoConfirmar={async () => { if (excluindo) { await p.aoExcluir(excluindo); setExcluindo(null); } }}
      >
        <p className="text-[13px] text-casca-texto">
          {t('Tem certeza que deseja excluir "{name}"? Os contatos serão mantidos.').replace("{name}", excluindo?.nome ?? "")}
        </p>
      </JanelaDeConfirmacao>
    </div>
  );
}
