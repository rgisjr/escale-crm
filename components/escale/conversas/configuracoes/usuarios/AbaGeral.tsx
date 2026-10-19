"use client";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useGravarSetoresDoUsuario, useUsuariosDaCasca } from "@/hooks/escale/useUsuariosDaCasca";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import type { TeamMember } from "@/hooks/team/useTeamMembers";

const CAMPO =
  "h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto outline-hidden disabled:text-casca-meta";

function Rotulo({ texto, children, id }: { texto: string; children: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-[13px] font-semibold text-casca-texto">
      {texto}
      {children}
    </label>
  );
}

/** Aba Geral (c90, c91; N12): nome do `full_name`, e-mail só leitura, os campos que o original não guarda em breve, Setores salva. */
export function AbaGeral({ membro }: { membro: TeamMember }) {
  const t = useT();
  const extras = useUsuariosDaCasca();
  const { data: setores = [] } = useSetores();
  const gravar = useGravarSetoresDoUsuario();
  const atuais = extras[membro.user_id]?.setores ?? [];
  const [escolhidos, setEscolhidos] = useState<string[]>(atuais);
  useEffect(() => setEscolhidos(atuais), [membro.user_id, atuais.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const completo = membro.full_name?.trim() ?? "";
  const espaco = completo.indexOf(" ");
  const nome = espaco > 0 ? completo.slice(0, espaco) : completo;
  const sobrenome = espaco > 0 ? completo.slice(espaco + 1) : "";
  const mudou = [...escolhidos].sort().join(",") !== [...atuais].sort().join(",");
  const soNoPerfil = t("Só a própria pessoa muda o nome, no perfil.");

  return (
    <div className="flex h-full flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-4 gap-y-5 overflow-y-auto px-6 py-6">
        <Rotulo texto={t("Nome")} id="u-nome">
          <input id="u-nome" className={CAMPO} value={nome} disabled title={soNoPerfil} readOnly />
        </Rotulo>
        <Rotulo texto={t("Sobrenome")} id="u-sobrenome">
          <input
            id="u-sobrenome"
            className={CAMPO}
            value={sobrenome}
            disabled
            title={soNoPerfil}
            readOnly
          />
        </Rotulo>
        <Rotulo texto={t("E-mail")} id="u-email">
          <input id="u-email" className={CAMPO} value={membro.email ?? ""} disabled readOnly />
        </Rotulo>
        <Rotulo texto={t("Telefone")} id="u-telefone">
          <input
            id="u-telefone"
            className={CAMPO}
            placeholder="BR"
            disabled
            title={t("Em breve")}
          />
        </Rotulo>
        <div className="col-span-2 border-t border-casca-borda" />
        <Rotulo texto={t("Identificador de usuário")} id="u-identificador">
          <input id="u-identificador" className={CAMPO} disabled title={t("Em breve")} />
        </Rotulo>
        <Rotulo texto={t("Link de usuário")} id="u-link">
          <input id="u-link" className={CAMPO} disabled title={t("Em breve")} />
        </Rotulo>
        <Rotulo texto={t("WhatsApp")} id="u-whatsapp">
          <input id="u-whatsapp" className={CAMPO} disabled title={t("Em breve")} />
        </Rotulo>
        <div />
        <div className="col-span-2 border-t border-casca-borda" />
        <div className="flex flex-col gap-2 text-[13px] font-semibold text-casca-texto">
          {t("Setores")}
          <SeletorMultiploDaCasca
            valores={escolhidos}
            opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
            aoMudar={setEscolhidos}
            vazio={t("Selecionar setores")}
            aria-label={t("Setores")}
          />
        </div>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-end border-t border-casca-borda px-6">
        <button
          type="button"
          disabled={!mudou || gravar.isPending}
          onClick={async () => {
            await gravar.mutateAsync({ userId: membro.user_id, setorIds: escolhidos });
            toast.success(t("As permissões foram atualizadas com sucesso!"));
          }}
          className="h-9 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {t("Salvar alterações")}
        </button>
      </div>
    </div>
  );
}
