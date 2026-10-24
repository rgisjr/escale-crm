"use client";
import { useMemo, useState } from "react";

import { CartaoDoHistorico } from "@/components/escale/negocio/abas/CartaoDoHistorico";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useHistoricoDoNegocio } from "@/hooks/escale/useHistoricoDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useNotasDoNegocio } from "@/hooks/escale/useNotasDoNegocio";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK } from "@/lib/auth/types";
import { GRUPOS_DO_HISTORICO, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import { secoesDoHistorico } from "@/lib/escale/negocio/regras";

import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

/** A seção Histórico (c54, c57): o seletor "Todos" e os cartões da 1H; sem negócio, só o aviso. */
export function SecaoHistorico({
  quadro,
  aoVoltar,
}: {
  quadro: QuadroDoNegocio | null;
  aoVoltar: () => void;
}) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const user = useUser();
  const org = useActiveOrg();
  const gerente = !!org && ROLE_RANK[org.role] >= ROLE_RANK.manager;
  const [grupo, setGrupo] = useState<ChaveDoGrupo>("todos");
  const leadId = quadro?.lead.id ?? "";
  const historico = useHistoricoDoNegocio(leadId, grupo);
  const notas = useNotasDoNegocio(leadId).data;
  const nomesDasEtapas = useMemo(
    () => Object.fromEntries((quadro?.stages ?? []).map((s) => [s.id, s.name])),
    [quadro?.stages],
  );
  const notaPorId = useMemo(() => new Map((notas ?? []).map((n) => [n.id, n])), [notas]);
  const secoes = useMemo(
    () => secoesDoHistorico(quadro ? historico.itens : [], new Date(), idioma),
    [quadro, historico.itens, idioma],
  );

  return (
    <SecaoAberta titulo={t("Histórico")} icone={ICONE_DA_SECAO.historico} aoVoltar={aoVoltar}>
      <SeletorDaCasca
        valor={grupo}
        opcoes={GRUPOS_DO_HISTORICO.map((g) => ({ valor: g.chave, rotulo: t(g.rotulo) }))}
        aria-label={t("Selecione um grupo")}
        buscaAPartirDe={99}
        className="h-8"
        aoMudar={(v) => setGrupo((v || "todos") as ChaveDoGrupo)}
      />
      {!quadro ? (
        <p className="text-[12px] text-casca-suave">
          {t("O histórico fica no negócio. Adicione um negócio para vê-lo aqui.")}
        </p>
      ) : historico.isLoading ? (
        <p className="text-[12px] text-casca-suave">{t("Carregando…")}</p>
      ) : historico.isError ? (
        <p className="text-[12px] text-casca-suave">{t("Não consegui carregar o histórico.")}</p>
      ) : secoes.length === 0 ? (
        <p className="text-[12px] text-casca-suave">{t("Os resultados não foram encontrados.")}</p>
      ) : (
        secoes.map((s) => (
          <section key={s.chave}>
            <h4 className="flex items-center gap-2 text-[11px] font-semibold text-casca-texto uppercase">
              <span>{t(s.rotulo)}</span>
              <span className="font-normal text-casca-meta normal-case">{s.data}</span>
              <span aria-hidden className="h-px flex-1 bg-casca-borda" />
            </h4>
            <ol className="mt-2 flex flex-col gap-2">
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
                    notaRemovida={item.type === "note" && notas !== undefined && !nota}
                    nomesDasEtapas={nomesDasEtapas}
                    alvo={{ tipo: "negocio", id: quadro.lead.id }}
                    podeEditarNota={!!nota && (gerente || nota.user_id === user.id)}
                  />
                );
              })}
            </ol>
          </section>
        ))
      )}
      {quadro && historico.temMais ? (
        <div className="flex justify-center">
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            onClick={historico.carregarMais}
            disabled={historico.carregandoMais}
          >
            {t("Carregar mais")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </SecaoAberta>
  );
}
