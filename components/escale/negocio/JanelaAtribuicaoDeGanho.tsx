"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { membrosAtivosDaEquipe } from "@/components/escale/configuracoes/ListaDePessoas";
import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useAtribuicaoDeGanho, useCorrigirGanho } from "@/hooks/escale/useAtribuicaoDeGanho";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { frasesDasRegras } from "@/lib/escale/ganho/regras";

/**
 * A JANELA "ATRIBUIÇÃO DE GANHO" DO NEGÓCIO GANHO (fork Escale, Fase 1K, D14;
 * DealWonModal da Clint, sem print). Data e hora do ganho e a pessoa
 * creditada, desligadas para quem não é admin; quando o sistema aplicou
 * regras, as frases delas.
 */
export function JanelaAtribuicaoDeGanho({
  aberta,
  aoFechar,
  leadId,
}: {
  aberta: boolean;
  aoFechar: () => void;
  leadId: string;
}) {
  const t = useT();
  const admin = useActiveOrg()?.role === "admin";
  const consulta = useAtribuicaoDeGanho(leadId, aberta);
  const corrigir = useCorrigirGanho(leadId);
  const equipe = useTeamMembers({ enabled: aberta });
  const membros = useMemo(
    () => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")),
    [equipe.data, t],
  );
  const ganho = consulta.data ?? null;
  // O que a pessoa mexeu; sem mexida, vale o que o servidor devolveu (sem efeito para copiar).
  const [editadoQuando, setQuando] = useState<Date | null>(null);
  const [editadoQuem, setQuem] = useState<string | null>(null);
  const quando = editadoQuando ?? (ganho ? new Date(ganho.ganhoEm) : null);
  const quem = editadoQuem ?? ganho?.creditadoA ?? "";
  const dica = admin ? undefined : t("Só o administrador altera a atribuição do ganho.");
  const frases = ganho?.pelaRegra && ganho.regras ? frasesDasRegras(ganho.regras) : [];
  const ligacao = ganho?.regras?.operador === "ou" ? t("ou") : t("e");

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar}>
      <CabecaDaJanela titulo={t("Atribuição de ganho")} />
      {consulta.isPending ? (
        <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>
      ) : consulta.isError && !ganho ? (
        <ErroDaLista
          mensagem={t("Não foi possível carregar a atribuição do ganho.")}
          aoTentar={() => void consulta.refetch()}
        />
      ) : !ganho ? (
        <p className="text-[13px] text-casca-suave">{t("Negócio ganho não encontrado.")}</p>
      ) : (
        <div className="grid gap-4">
          {frases.length > 0 ? (
            <div className="grid gap-1 text-[13px] text-casca-texto">
              <p>{t("As seguintes regras foram aplicadas para a atribuição do ganho:")}</p>
              <ul className="grid gap-0.5 pl-4">
                {frases.map((f, i) => {
                  const texto = Object.entries(f.valores).reduce(
                    (acc, [k, v]) => acc.split(`{${k}}`).join(k === "tipo" ? t(v) : v),
                    t(f.modelo),
                  );
                  return <li key={i}>{i < frases.length - 1 ? `${texto} ${ligacao}` : texto}</li>;
                })}
              </ul>
            </div>
          ) : null}
          <Campo rotulo={t("Data")}>
            <div title={dica} className={admin ? undefined : "pointer-events-none opacity-60"}>
              {quando ? <SeletorDeDataEHora valor={quando} aoMudar={setQuando} /> : null}
            </div>
          </Campo>
          <Campo rotulo={t("Usuário")}>
            <SeletorDaCasca
              aparencia="janela"
              valor={quem}
              vazio={t("Atribuir ganho ao usuário")}
              opcoes={membros.map((m) => ({ valor: m.id, rotulo: m.nome }))}
              aoMudar={setQuem}
              aria-label={t("Atribuir ganho ao usuário")}
              desabilitado={!admin}
              dica={dica}
            />
          </Campo>
        </div>
      )}
      {admin && ganho ? (
        <RodapeDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={corrigir.isPending || !quando}
            title={!quando ? t("Data inválida.") : undefined}
            onClick={() =>
              quando &&
              corrigir.mutate(
                { creditado_a: quem || null, ganho_em: quando.toISOString() },
                {
                  onSuccess: () => {
                    toast.success(t("As alterações foram salvas com sucesso!"));
                    aoFechar();
                  },
                  onError: (e) => toast.error(textoDoErro(e, t)),
                },
              )
            }
          >
            {t("Salvar")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      ) : null}
    </JanelaDaCasca>
  );
}
