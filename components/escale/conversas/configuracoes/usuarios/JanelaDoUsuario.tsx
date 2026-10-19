"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { TeamMember } from "@/hooks/team/useTeamMembers";
import { BadgeCheck, Trash2 } from "@/lib/ui/icons-da-casca";

import { FotoDaPessoa } from "../FotoDaPessoa";
import { AbaContasEDispositivos } from "./AbaContasEDispositivos";
import { AbaGeral } from "./AbaGeral";
import { AbaPermissoes } from "./AbaPermissoes";

type Aba = "geral" | "permissoes" | "contas";

/** A janela do usuário (c90–c95; E4): Geral, Permissões, Contas e dispositivos. */
export function JanelaDoUsuario({
  aberta,
  aoFechar,
  membro,
}: {
  aberta: boolean;
  aoFechar: () => void;
  membro: TeamMember | null;
}) {
  const t = useT();
  const [aba, setAba] = useState<Aba>("geral");
  useEffect(() => {
    if (aberta) setAba("geral");
  }, [aberta, membro?.user_id]);
  if (!membro) return null;
  const nome = membro.full_name?.trim() || membro.email || "";
  return (
    <JanelaDaCasca
      aberta={aberta}
      onFechar={aoFechar}
      className="flex h-[575px] w-[min(1440px,94vw)] max-w-none flex-col p-0"
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-casca-borda px-5">
        <FotoDaPessoa id={membro.user_id} nome={nome} tamanho={32} />
        <span className="text-[16px] text-casca-texto">{nome}</span>
        {membro.accepted_at ? (
          <BadgeCheck size={16} aria-label={t("Verificado")} className="text-casca-suave" />
        ) : null}
        <Link
          href="/app/team"
          aria-label={t("Remover usuário")}
          title={t("Remover usuário")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <Trash2 size={16} aria-hidden />
        </Link>
      </div>
      <div className="px-5">
        <AbasDaCasca
          aria-label={t("Seções do usuário")}
          valor={aba}
          aoMudar={setAba}
          abas={[
            { valor: "geral", rotulo: t("Geral") },
            { valor: "permissoes", rotulo: t("Permissões") },
            { valor: "contas", rotulo: t("Contas e dispositivos") },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1">
        {aba === "geral" ? (
          <AbaGeral membro={membro} />
        ) : aba === "permissoes" ? (
          <AbaPermissoes membro={membro} />
        ) : (
          <AbaContasEDispositivos membro={membro} aoFechar={aoFechar} />
        )}
      </div>
    </JanelaDaCasca>
  );
}
