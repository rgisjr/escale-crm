"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { EmpresaDaProspeccao } from "@/lib/escale/prospeccao/tipos";

/**
 * AS EMPRESAS ENCONTRADAS (passo 2; molde 031): "Selecionar todas", a linha
 * com a caixa, o nome e a categoria, o telefone, o endereço e a nota. Marcar
 * vai ao `select` do original (só vale para as novas do rascunho).
 */
export function EmpresasEncontradas({
  empresas,
  ocupado,
  aoMarcar,
}: {
  empresas: EmpresaDaProspeccao[];
  ocupado: boolean;
  aoMarcar: (ids: string[], selecionada: boolean) => void;
}) {
  const t = useT();
  const novas = empresas.filter((e) => e.status === "new");
  const marcadas = novas.filter((e) => e.selecionada).length;
  const todas =
    novas.length > 0 && marcadas === novas.length ? true : marcadas === 0 ? false : "indeterminada";

  return (
    <div className="rounded-lg border border-casca-borda">
      <div className="flex items-center justify-between border-b border-casca-divisoria px-4 py-3">
        <CaixaDaCasca
          marcada={todas}
          aoMudar={(v) =>
            aoMarcar(
              novas.map((e) => e.id),
              v,
            )
          }
          rotulo={t("Selecionar todas")}
          desabilitada={ocupado || novas.length === 0}
        />
        <span className="text-[11px] text-casca-suave">
          {t("Empresas sem telefone ou que já são contatos do CRM ficam de fora ao iniciar.")}
        </span>
      </div>
      <ul className="max-h-[360px] divide-y divide-casca-divisoria overflow-y-auto">
        {novas.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-3 px-4 py-2.5 text-[12px] text-casca-texto hover:bg-casca-busca"
          >
            <CaixaDaCasca
              marcada={e.selecionada}
              aoMudar={(v) => aoMarcar([e.id], v)}
              aria-label={`${t("Marcar empresa para abordagem")}: ${e.dados.name}`}
              desabilitada={ocupado}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{e.dados.name}</p>
              <p className="truncate text-[11px] text-casca-meta">
                {[e.dados.category, e.dados.address].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="w-[140px] shrink-0 text-right">
              {e.dados.phone ?? t("Sem telefone")}
            </span>
            <span className="w-[120px] shrink-0 text-right text-[11px] text-casca-suave">
              {e.dados.rating === null ? "—" : e.dados.rating.toLocaleString("pt-BR")} ★ ·{" "}
              {(e.dados.reviews ?? 0).toLocaleString("pt-BR")} {t("avaliações")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
