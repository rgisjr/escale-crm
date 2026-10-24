"use client";
import { useState } from "react";

import { SeletorDoFiltro } from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_SITUACAO,
  SITUACOES_DO_FILTRO,
  type FiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { SEM_CODIGO, textoDoMotivo } from "@/lib/escale/campanhas/detalhe/motivos";
import type { MotivoDoErro, SituacaoDoDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { ChevronDown, ChevronUp } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * "FILTROS DA CAMPANHA" (013): o botão "Filtros" (borda da marca aberto), o
 * acordeão com STATUS (o seletor da casca, várias escolhas; nunca o nativo) e
 * MOTIVO DO ERRO (linhas com a contagem, várias escolhas), "Limpar filtros" e
 * "Aplicar" no azul da Clint (013).
 */
export function PainelDeFiltrosDosDestinatarios({
  filtros,
  motivos,
  aoAplicar,
}: {
  filtros: FiltrosDeDestinatarios;
  motivos: readonly MotivoDoErro[];
  aoAplicar: (f: FiltrosDeDestinatarios) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState(true);
  const [situacoes, setSituacoes] = useState<SituacaoDoDestinatario[]>(filtros.situacoes ?? []);
  const [codigos, setCodigos] = useState<string[]>(filtros.motivos ?? []);

  const abrir = (a: boolean) => {
    if (a) {
      setSituacoes(filtros.situacoes ?? []);
      setCodigos(filtros.motivos ?? []);
    }
    setAberto(a);
  };
  const aplicar = (f: FiltrosDeDestinatarios) => {
    aoAplicar(f);
    setAberto(false);
  };
  const alternarCodigo = (c: string) =>
    setCodigos((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border bg-surface px-2.5 text-[13px] text-casca-texto",
            aberto ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
          )}
        >
          {t("Filtros")}
          {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="flex max-h-[350px] w-[320px] flex-col p-0">
        <button
          type="button"
          aria-expanded={secaoAberta}
          onClick={() => setSecaoAberta((s) => !s)}
          className="flex items-center justify-between px-4 py-3 text-[13px] font-medium"
        >
          {t("Filtros da campanha")}
          {secaoAberta ? (
            <ChevronUp size={14} aria-hidden />
          ) : (
            <ChevronDown size={14} aria-hidden />
          )}
        </button>
        {secaoAberta ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-casca-raia px-4 py-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold tracking-[0.08em] uppercase">
                {t("Status")}
              </p>
              <SeletorDoFiltro<SituacaoDoDestinatario>
                valores={situacoes}
                opcoes={SITUACOES_DO_FILTRO.map((s) => ({
                  valor: s,
                  rotulo: t(ROTULO_DO_FILTRO_DE_SITUACAO[s]),
                }))}
                aoMudar={setSituacoes}
                vazio={t("Todos os status")}
                aria-label={t("Status")}
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] uppercase">
                {t("Motivo do erro")}
              </p>
              {motivos.length === 0 ? (
                <p className="py-1 text-[12px] text-casca-suave">
                  {t("Nenhuma falha nesta campanha.")}
                </p>
              ) : (
                <ul>
                  {motivos.map((m) => {
                    const codigo = m.codigo ?? SEM_CODIGO;
                    const marcado = codigos.includes(codigo);
                    const texto = textoDoMotivo(m.codigo, t);
                    return (
                      <li key={codigo}>
                        <button
                          type="button"
                          aria-pressed={marcado}
                          title={texto}
                          onClick={() => alternarCodigo(codigo)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-[4px] px-3 py-1.5 text-left text-[12px]",
                            marcado ? "bg-casca-marca-suave text-casca-marca" : "hover:bg-surface",
                          )}
                        >
                          <span className="truncate">{texto}</span>
                          <span className="shrink-0 text-[11px] text-casca-suave">
                            {numeroBr(m.quantidade)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-casca-divisoria px-4 py-3">
          <button
            type="button"
            onClick={() => aplicar(filtros.busca ? { busca: filtros.busca } : {})}
            className="text-[13px] font-semibold text-casca-texto"
          >
            {t("Limpar filtros")}
          </button>
          <BotaoDaCasca
            variante="novo"
            tamanho="sm"
            onClick={() =>
              aplicar({
                ...(filtros.busca ? { busca: filtros.busca } : {}),
                ...(situacoes.length ? { situacoes } : {}),
                ...(codigos.length ? { motivos: codigos } : {}),
              })
            }
          >
            {t("Aplicar")}
          </BotaoDaCasca>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
