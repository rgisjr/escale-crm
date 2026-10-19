"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { NegocioDaEmpresa } from "@/lib/escale/empresas/banco";
import { Search } from "@/lib/ui/icons-da-casca";

const TH = "h-[44px] px-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto";

const STATUS = {
  open: { rotulo: "Aberto", cor: "text-casca-marca" },
  won: { rotulo: "Ganho", cor: "text-(--escale-status-ganho)" },
  lost: { rotulo: "Perdido", cor: "text-(--escale-status-perdido)" },
} as const;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A aba Negócios da ficha da empresa: busca e as colunas Negócio, Origem, Etapa, Status e Valor. */
export function AbaNegociosDaEmpresa({ negocios, moeda }: { negocios: NegocioDaEmpresa[]; moeda: string }) {
  const t = useT();
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const termo = semAcento(busca.trim());
  const visiveis = termo
    ? negocios.filter((n) => semAcento(n.titulo).includes(termo) || semAcento(n.contato).includes(termo))
    : negocios;
  const dinheiro = (valor: number, m: string | null) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: m ?? moeda }).format(valor);

  return (
    <div className="px-6 py-4">
      <label className="mb-3 flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar negócios")}
          aria-label={t("Buscar negócios")}
          className="w-full bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
        />
        <Search size={15} aria-hidden className="shrink-0 text-casca-suave" />
      </label>
      {negocios.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-[14px] font-medium text-casca-texto">{t("Nenhum negócio nesta empresa")}</p>
          <p className="text-[13px] text-casca-suave">{t("Os negócios desta empresa aparecerão aqui.")}</p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-casca-borda">
              <th className={TH}>{t("Negócio")}</th>
              <th className={TH}>{t("Origem")}</th>
              <th className={TH}>{t("Etapa")}</th>
              <th className={TH}>{t("Status")}</th>
              <th className={TH}>{t("Valor")}</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((n) => (
              <tr
                key={n.id}
                onClick={() => router.push(`/app/negocios/${n.id}`)}
                className="h-16 cursor-pointer border-b border-casca-borda hover:bg-casca-raia"
              >
                <td className="px-3">
                  <span className="block truncate text-[14px] font-medium text-casca-texto">{n.titulo}</span>
                  <span className="block truncate text-[12px] text-casca-suave">{n.contato}</span>
                </td>
                <td className="px-3 text-[13px] text-casca-texto">{n.origem}</td>
                <td className="px-3 text-[13px] text-casca-texto">{n.etapa}</td>
                <td className={`px-3 text-[13px] font-medium ${STATUS[n.status]?.cor ?? ""}`}>
                  {t(STATUS[n.status]?.rotulo ?? "Aberto")}
                </td>
                <td className="px-3 text-[13px] text-casca-texto">
                  {n.valor === null ? "—" : dinheiro(n.valor, n.moeda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
