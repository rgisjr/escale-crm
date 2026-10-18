"use client";
import { useMemo, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useHistoricoDoNegocio } from "@/hooks/escale/useHistoricoDoNegocio";
import { useNotasDoNegocio } from "@/hooks/escale/useNotasDoNegocio";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK } from "@/lib/auth/types";
import {
  GRUPOS_DO_HISTORICO,
  casaComABusca,
  type ChaveDoGrupo,
} from "@/lib/escale/negocio/historico";
import { secoesDoHistorico } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Search } from "@/lib/ui/icons-da-casca";

import { CartaoDoHistorico } from "./CartaoDoHistorico";

/**
 * A ABA HISTÓRICO DA FICHA (fork Escale, Fases 1G e 1H; C18, N12; prints 07 e 12).
 * Busca na tela, filtro por grupo (os 16 da Clint; o `type` vai na rota),
 * 25 por página com "Carregar mais", seções Hoje/Ontem/Esta semana/data, e as
 * notas com "Ver nota", "Editar nota" e a lixeira.
 */
export function AbaHistorico({ lead, stages }: { lead: Lead; stages: readonly Stage[] }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const user = useUser();
  const org = useActiveOrg();
  const gerente = !!org && ROLE_RANK[org.role] >= ROLE_RANK.manager;
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<ChaveDoGrupo>("todos");
  const historico = useHistoricoDoNegocio(lead.id, grupo);
  const notasDoNegocio = useNotasDoNegocio(lead.id).data;
  const nomesDasEtapas = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, s.name])),
    [stages],
  );
  const notaPorId = useMemo(
    () => new Map((notasDoNegocio ?? []).map((n) => [n.id, n])),
    [notasDoNegocio],
  );

  const visiveis = useMemo(
    () => historico.itens.filter((i) => casaComABusca(i, busca, t, nomesDasEtapas)),
    [historico.itens, busca, t, nomesDasEtapas],
  );
  const secoes = useMemo(() => secoesDoHistorico(visiveis, new Date(), idioma), [visiveis, idioma]);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3">
        <span className="relative">
          <input
            type="search"
            aria-label={t("Buscar no histórico...")}
            placeholder={t("Buscar no histórico...")}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-[148px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
          />
          <Search
            size={14}
            aria-hidden
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
          />
        </span>
        <div className="w-[218px]">
          <SeletorDaCasca
            valor={grupo}
            opcoes={GRUPOS_DO_HISTORICO.map((g) => ({ valor: g.chave, rotulo: t(g.rotulo) }))}
            aria-label={t("Selecione um grupo")}
            buscaAPartirDe={99}
            className="h-8"
            aoMudar={(v) => setGrupo((v || "todos") as ChaveDoGrupo)}
          />
        </div>
      </div>
      {historico.isLoading ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Carregando…")}</p>
      ) : historico.isError ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Não consegui carregar o histórico.")}</p>
      ) : secoes.length === 0 ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Os resultados não foram encontrados.")}</p>
      ) : (
        secoes.map((s) => (
          <section key={s.chave} className="mt-6">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold text-casca-texto uppercase">
              <span>{t(s.rotulo)}</span>
              <span className="font-normal text-casca-meta normal-case">{s.data}</span>
              <span aria-hidden className="h-px flex-1 bg-casca-borda" />
            </h3>
            <ol className="mt-3 flex flex-col gap-2">
              {s.itens.map((item) => {
                const nota =
                  item.type === "note"
                    ? notaPorId.get(String(item.payload?.nota_id ?? ""))
                    : undefined;
                return (
                  <CartaoDoHistorico
                    key={item.id}
                    item={item}
                    nota={nota}
                    notaRemovida={item.type === "note" && notasDoNegocio !== undefined && !nota}
                    nomesDasEtapas={nomesDasEtapas}
                    leadId={lead.id}
                    podeEditarNota={!!nota && (gerente || nota.user_id === user.id)}
                  />
                );
              })}
            </ol>
          </section>
        ))
      )}
      {historico.temMais ? (
        <div className="mt-6 flex justify-center">
          <BotaoDaCasca
            variante="texto"
            tamanho="md"
            onClick={historico.carregarMais}
            disabled={historico.carregandoMais}
          >
            {t("Carregar mais")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </div>
  );
}
