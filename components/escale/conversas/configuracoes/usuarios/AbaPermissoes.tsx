"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import {
  useGravarPermissoes,
  usePermissoesDoUsuario,
  useResetarPermissoes,
} from "@/hooks/escale/usePermissoesDeAtendimento";
import { useT } from "@/hooks/i18n/useT";
import { useChangeRole } from "@/hooks/team/useChangeRole";
import type { TeamMember } from "@/hooks/team/useTeamMembers";
import {
  GRUPOS_DE_PERMISSAO,
  PERMISSOES_DE_CONVERSAS,
  SECOES_DE_PERMISSAO,
  desativarTodos,
  estadoDoToggle,
  excecaoAoMudar,
  grupoDoUsuario,
  type ChaveDePermissao,
  type Excecoes,
  type GrupoDePermissao,
  type Papel,
  type VisibilidadeDaOrganizacao,
} from "@/lib/escale/conversas/permissoes";
import { cn } from "@/lib/utils";

type Pendentes = Partial<Record<ChaveDePermissao, boolean | null>>;

/**
 * Aba Permissões (c92–c94; E4; N4–N6): o grupo (o papel do original ou
 * "Personalizado"), o menu de seções (só Conversas é desta fase), "Desativar
 * todos" e a grade das 19. As mudanças juntam e gravam no "Salvar alterações".
 */
export function AbaPermissoes({ membro }: { membro: TeamMember }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const visibilidade = (activeOrg?.visibility_mode ??
    "own_and_unassigned") as VisibilidadeDaOrganizacao;
  const papel = membro.role as Papel;
  const { data } = usePermissoesDoUsuario(membro.user_id);
  const gravar = useGravarPermissoes();
  const resetar = useResetarPermissoes();
  const mudarPapel = useChangeRole();
  const salvas: Excecoes = data?.excecoes ?? {};
  const [pendentes, setPendentes] = useState<Pendentes>({});
  const [grupo, setGrupo] = useState<GrupoDePermissao>(grupoDoUsuario(papel, salvas));
  useEffect(() => {
    setPendentes({});
    setGrupo(grupoDoUsuario(papel, data?.excecoes ?? {}));
  }, [membro.user_id, papel, data]);

  const efetivas: Excecoes = useMemo(() => {
    const e: Excecoes = { ...salvas };
    for (const [chave, v] of Object.entries(pendentes) as Array<
      [ChaveDePermissao, boolean | null]
    >) {
      if (v === null) delete e[chave];
      else e[chave] = v;
    }
    return e;
  }, [salvas, pendentes]);
  const grupoEhPapel = grupo !== "personalizado" && grupo !== papel;
  const mudou = grupoEhPapel || Object.keys(pendentes).length > 0;

  const mudar = (chave: ChaveDePermissao, ligado: boolean) => {
    const p = PERMISSOES_DE_CONVERSAS.find((x) => x.chave === chave)!;
    setPendentes((atual) => ({ ...atual, [chave]: excecaoAoMudar(p, papel, ligado) }));
    setGrupo("personalizado");
  };
  const desligarTodas = () => {
    const novas: Pendentes = {};
    for (const [chave] of Object.entries(desativarTodos(papel)) as Array<
      [ChaveDePermissao, boolean]
    >) {
      const p = PERMISSOES_DE_CONVERSAS.find((x) => x.chave === chave)!;
      novas[chave] = excecaoAoMudar(p, papel, false);
    }
    setPendentes(novas);
    setGrupo("personalizado");
  };
  const salvar = async () => {
    try {
      if (grupoEhPapel) {
        await mudarPapel.mutateAsync({ userId: membro.user_id, role: grupo as Papel });
        await resetar.mutateAsync(membro.user_id);
      } else if (Object.keys(pendentes).length > 0) {
        await gravar.mutateAsync({ user_id: membro.user_id, valores: pendentes });
      }
    } catch {
      // O aviso vem do hook. Os passos são idempotentes: salvar de novo refaz o que faltou.
      return;
    }
    setPendentes({});
    toast.success(t("As permissões foram atualizadas com sucesso!"));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-casca-borda px-6">
        <span className="text-[13px] text-casca-texto">{t("Grupo de permissão:")}</span>
        <SeletorDaCasca
          aparencia="janela"
          valor={grupo}
          opcoes={GRUPOS_DE_PERMISSAO.map((g) => ({ valor: g.valor, rotulo: t(g.rotulo) }))}
          aoMudar={(g) => {
            if (!g) return;
            setGrupo(g);
            setPendentes({});
          }}
          aria-label={t("Grupo de permissão:")}
          className="w-[190px]"
        />
        <span
          title={t("Em breve")}
          aria-disabled="true"
          className="text-[13px] font-medium text-casca-marca opacity-50"
        >
          {t("Salvar grupo personalizado")}
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t("Seções de permissão")}
          className="w-[200px] shrink-0 overflow-y-auto border-r border-casca-borda py-4 pl-6"
        >
          {SECOES_DE_PERMISSAO.map((s) => (
            <span
              key={s.chave}
              aria-current={s.ativa ? "page" : undefined}
              aria-disabled={!s.ativa}
              title={s.ativa ? undefined : t("Em breve")}
              className={cn(
                "flex h-[41px] items-center rounded-r-md px-3 text-[13px]",
                s.ativa
                  ? "border-l-[3px] border-casca-marca bg-casca-raia font-medium text-casca-texto"
                  : "text-casca-suave opacity-60",
              )}
            >
              {t(s.rotulo)}
            </span>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col px-6 py-4">
          <div className="flex items-start justify-between border-b border-casca-borda pb-3">
            <span>
              <span className="block text-[15px] font-medium text-casca-texto">
                {t("Conversas")}
              </span>
              <span className="block text-[13px] text-casca-suave">
                {t("Configure as permissões desta seção.")}
              </span>
            </span>
            <button
              type="button"
              onClick={desligarTodas}
              disabled={papel === "admin"}
              className="h-8 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-40"
            >
              {t("Desativar todos")}
            </button>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-x-4 overflow-y-auto lg:grid-cols-3">
            {PERMISSOES_DE_CONVERSAS.map((p) => {
              const e = estadoDoToggle(p, {
                papel: grupoEhPapel ? (grupo as Papel) : papel,
                visibilidade,
                excecoes: grupoEhPapel ? {} : efetivas,
              });
              return (
                <div
                  key={p.chave}
                  className="flex min-h-[86px] items-center gap-4 border-b border-casca-borda px-3 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-casca-texto">
                      {t(p.rotulo)}
                    </span>
                    <span className="block text-[13px] text-casca-suave">{t(p.descricao)}</span>
                  </span>
                  <InterruptorDaCasca
                    ligado={e.ligado}
                    desabilitado={e.travado}
                    title={e.dica ? t(e.dica) : undefined}
                    aoMudar={(v) => mudar(p.chave, v)}
                    aria-label={t(p.rotulo)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-end border-t border-casca-borda px-6">
        <button
          type="button"
          disabled={!mudou || gravar.isPending || mudarPapel.isPending}
          onClick={() => void salvar()}
          className="h-9 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {t("Salvar alterações")}
        </button>
      </div>
    </div>
  );
}
