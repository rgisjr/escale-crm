"use client";
import { useMemo } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import type { NotificacoesDaOrigem, StatusAvisado } from "@/lib/escale/notificacoes/regras";
import { Bell } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";
import { membrosAtivosDaEquipe } from "./ListaDePessoas";

/**
 * NOTIFICAÇÕES DA ORIGEM (fork Escale, Fase 1K, D15; código `Ie` da Clint, sem print).
 * Os dois blocos da Clint, com o aviso dentro do app no lugar do e-mail (Q1).
 * O segundo seletor de usuários só aparece com algum status escolhido.
 */
export function SecaoNotificacoes({ rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const equipe = useTeamMembers();
  const membros = useMemo(
    () => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")),
    [equipe.data, t],
  );
  const opcoes = membros.map((m) => ({ valor: m.id, rotulo: m.nome }));
  const n = rascunho.notificacoes;
  const mudarN = (f: (x: NotificacoesDaOrigem) => NotificacoesDaOrigem) =>
    mudar((r) => ({ ...r, notificacoes: f(r.notificacoes) }));
  const usuarios = (q: number) =>
    q === 1 ? t("1 usuário selecionado") : `${q} ${t("usuários selecionados")}`;
  const status = (q: number) =>
    q === 1 ? t("1 status selecionado") : `${q} ${t("status selecionados")}`;
  const rotulo = "flex items-center gap-1.5 text-[13px] font-medium text-casca-texto";
  const subtexto = "text-[11px] text-casca-suave";

  return (
    <div className="grid max-w-[784px] gap-8">
      <CabecaDaSecao
        icone={Bell}
        titulo={t("Notificações")}
        descricao={t("Configure aqui as notificações relacionadas a sua origem de dados.")}
      />

      <section className="grid w-full gap-2 md:w-3/4">
        <span className={rotulo}>
          {t("Notificação de novo negócio")}
          <AjudaDaCasca
            texto={t(
              "Os usuários selecionados receberão um aviso no app com as informações de novos negócios vindos de integrações.",
            )}
          />
        </span>
        <p className={subtexto}>
          {n.novoNegocio.length === 0
            ? t("Selecione os usuários que receberão as notificações")
            : usuarios(n.novoNegocio.length)}
        </p>
        <SeletorMultiploDaCasca
          valores={n.novoNegocio}
          opcoes={opcoes}
          aoMudar={(v) => mudarN((x) => ({ ...x, novoNegocio: v }))}
          aria-label={t("Usuários do novo negócio")}
          vazio={t("Usuários")}
        />
      </section>

      <section className="grid w-full gap-2 md:w-3/4">
        <span className={rotulo}>
          {t("Notificação de mudança de status")}
          <AjudaDaCasca
            texto={t(
              "Quando seu negócio mudar para os status de ganho ou perdido, os usuários configurados receberão um aviso no app contendo as principais informações do negócio.",
            )}
          />
        </span>
        <p className={subtexto}>
          {n.mudancaDeStatus.status.length === 0 && n.mudancaDeStatus.pessoas.length === 0
            ? t(
                "Selecione os usuários que receberão as notificações e os status a serem notificados.",
              )
            : `${status(n.mudancaDeStatus.status.length)}. ${usuarios(n.mudancaDeStatus.pessoas.length)}.`}
        </p>
        <SeletorMultiploDaCasca<StatusAvisado>
          valores={n.mudancaDeStatus.status}
          opcoes={[
            { valor: "won", rotulo: t("Ganho") },
            { valor: "lost", rotulo: t("Perdido") },
          ]}
          aoMudar={(v) =>
            mudarN((x) => ({ ...x, mudancaDeStatus: { ...x.mudancaDeStatus, status: v } }))
          }
          aria-label={t("Status do negócio")}
          vazio={t("Status do negócio")}
        />
        {n.mudancaDeStatus.status.length > 0 ? (
          <SeletorMultiploDaCasca
            valores={n.mudancaDeStatus.pessoas}
            opcoes={opcoes}
            aoMudar={(v) =>
              mudarN((x) => ({ ...x, mudancaDeStatus: { ...x.mudancaDeStatus, pessoas: v } }))
            }
            aria-label={t("Usuários da mudança de status")}
            vazio={t("Usuários")}
          />
        ) : null}
      </section>
    </div>
  );
}
