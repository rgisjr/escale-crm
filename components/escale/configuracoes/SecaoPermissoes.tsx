"use client";
import { useMemo } from "react";

import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { Users } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";
import { ContadorDePessoas, ListaDePessoas, membrosAtivosDaEquipe } from "./ListaDePessoas";

/**
 * PERMISSÃO DE USUÁRIOS DA ORIGEM (fork Escale, Fase 1J, D12; código `Ps` da Clint, sem print).
 * A descrição muda quando o grupo tem lista (a origem sem lista segue o grupo, Q6).
 * Tudo vai para o rascunho; quem grava é o "Salvar" único da janela (F13).
 */
export function SecaoPermissoes({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const equipe = useTeamMembers();
  const membros = useMemo(
    () => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")),
    [equipe.data, t],
  );
  const pessoas = rascunho.permissoes.pessoas;
  const segueOGrupo = config.pessoasDoGrupo.length > 0;

  return (
    <div className="grid max-w-[784px] gap-5">
      <CabecaDaSecao
        icone={Users}
        titulo={t("Permissão de usuários")}
        descricao={
          segueOGrupo
            ? t(
                "Somente os usuários selecionados poderão ver a origem. Sem nenhum usuário selecionado, a origem segue as permissões do grupo.",
              )
            : t(
                "Somente os usuários selecionados poderão ver a origem. Caso nenhum usuário seja selecionado, a visualização não terá restrição.",
              )
        }
      />
      <p className="-mt-3 text-[11px] text-casca-suave">
        {t("Administradores sempre veem os negócios desta origem.")}
      </p>
      <ContadorDePessoas total={pessoas.length} />
      <ListaDePessoas
        pessoas={pessoas}
        membros={membros}
        aoMudar={(lista) => mudar((r) => ({ ...r, permissoes: { pessoas: lista } }))}
        placeholder={t("Adicione um usuário...")}
      />
    </div>
  );
}
