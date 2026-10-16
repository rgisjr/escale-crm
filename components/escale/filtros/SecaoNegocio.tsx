"use client";
import { useMemo } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import { MOEDA_PADRAO, simboloDaMoeda } from "@/lib/money";
import { ROTULO_DO_MOTIVO_CANONICO } from "@/lib/schemas/leads";
import type { Lead } from "@/lib/types/leads";

import { CampoNumerico, RotuloDoGrupo } from "./controles";

const emReais = (centavos: number | undefined) =>
  centavos === undefined ? undefined : centavos / 100;
const emCentavos = (reais: number | undefined) =>
  reais === undefined ? undefined : Math.round(reais * 100);

/**
 * Negócio, dentro de "Mais filtros" (Casca V4): valor, atrasados e, com perdidos
 * no status, motivo e categoria de perda. Dono e Data viraram gatilhos próprios,
 * como na barra da Clint.
 */
export function SecaoNegocio({
  filtros,
  onMudar,
  leads,
  settings,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
  settings?: Record<string, unknown>;
}) {
  const t = useT();
  const org = useActiveOrg();
  const moeda = simboloDaMoeda(org?.currency ?? MOEDA_PADRAO);

  // As opções vêm do que ESTÁ no quadro (a regra do `FilterBar` do original).
  const motivos = useMemo(
    () =>
      [
        ...new Set(
          leads
            .filter((l) => l.status === "lost" && l.lost_reason)
            .map((l) => l.lost_reason as string),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [leads],
  );
  const categorias = useMemo(
    () =>
      [
        ...new Set(
          motivos.map((m) => categoriaDoMotivo(m, settings)).filter((c): c is string => !!c),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [motivos, settings],
  );
  // Só o motivo canônico é traduzido; o do funil é texto que o operador escreveu.
  const rotuloDoMotivo = (motivo: string) =>
    Object.prototype.hasOwnProperty.call(ROTULO_DO_MOTIVO_CANONICO, motivo)
      ? t(ROTULO_DO_MOTIVO_CANONICO[motivo as keyof typeof ROTULO_DO_MOTIVO_CANONICO])
      : motivo;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo
          ajuda={t("Só entram negócios na moeda da organização.")}
        >{`${t("Valor")} (${moeda})`}</RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <CampoNumerico
            key={`vmin:${filtros.valor?.min ?? ""}`}
            rotulo={t("Mínimo")}
            valor={emReais(filtros.valor?.min)}
            onMudar={(v) =>
              onMudar({ ...filtros, valor: { ...filtros.valor, min: emCentavos(v) } })
            }
          />
          <CampoNumerico
            key={`vmax:${filtros.valor?.max ?? ""}`}
            rotulo={t("Máximo")}
            valor={emReais(filtros.valor?.max)}
            onMudar={(v) =>
              onMudar({ ...filtros, valor: { ...filtros.valor, max: emCentavos(v) } })
            }
          />
        </div>
      </div>

      <CaixaDaCasca
        marcada={!!filtros.atrasados}
        aoMudar={(m) => onMudar({ ...filtros, atrasados: m || undefined })}
        rotulo={t("Apenas atrasados")}
      />

      {filtros.status.includes("lost") && motivos.length > 0 ? (
        <div className="space-y-2">
          <RotuloDoGrupo>{t("Motivo de perda")}</RotuloDoGrupo>
          <SeletorDaCasca
            aria-label={t("Motivo de perda")}
            valor={filtros.motivoDePerda ?? ""}
            opcoes={[
              { valor: "", rotulo: t("Todos") },
              ...motivos.map((m) => ({ valor: m, rotulo: rotuloDoMotivo(m) })),
            ]}
            aoMudar={(v) => onMudar({ ...filtros, motivoDePerda: v || undefined })}
          />
          {categorias.length > 0 ? (
            <SeletorDaCasca
              aria-label={t("Categoria de perda")}
              valor={filtros.categoriaDePerda ?? ""}
              opcoes={[
                { valor: "", rotulo: t("Todas") },
                ...categorias.map((c) => ({ valor: c, rotulo: c })),
              ]}
              aoMudar={(v) => onMudar({ ...filtros, categoriaDePerda: v || undefined })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
