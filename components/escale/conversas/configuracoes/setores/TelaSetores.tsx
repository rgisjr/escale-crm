"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useRemoverSetor, useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { filtrarSetores, ordenarSetores, type SetorLido } from "@/lib/escale/conversas/setores";
import { Building2, Pencil, Search, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { MenuDaLinhaDeConfiguracao } from "../MenuDaLinhaDeConfiguracao";
import { MonogramaDoSetor } from "../MonogramaDoSetor";
import { JanelaDoSetor } from "./JanelaDoSetor";

const CABECA =
  "h-10 px-4 text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";

/** "CONFIGURAÇÕES › SETORES" (c38, c87; E1). */
export function TelaSetores({ embutida = false }: { embutida?: boolean }) {
  const t = useT();
  const { data = [], isLoading } = useSetores();
  const remover = useRemoverSetor();
  const minhas = useMinhasPermissoes();
  const podeEditar = minhas.CHAT_EDIT_TEAMS === true;
  const [busca, setBusca] = useState("");
  const [janela, setJanela] = useState<{ setor: SetorLido | null } | null>(null);
  const lista = useMemo(() => ordenarSetores(filtrarSetores(data, busca)), [data, busca]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-setores">
      {!embutida ? (
        <CabecaDaConfiguracao
          migalhas={[
            { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
            { rotulo: t("Setores") },
          ]}
        />
      ) : null}
      <div className="flex h-14 shrink-0 items-center gap-3 px-6">
        <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por setor...")}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta"
          />
          <Search size={16} aria-hidden className="text-casca-suave" />
        </span>
        <span className="flex-1" />
        {podeEditar ? (
          <BotaoDaCasca variante="marca" onClick={() => setJanela({ setor: null })}>
            {t("Novo setor")}
          </BotaoDaCasca>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!isLoading && data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca">
              <Building2 size={24} aria-hidden />
            </span>
            <span className="text-[15px] font-semibold text-casca-texto">
              {t("Você ainda não tem nenhum setor cadastrado!")}
            </span>
            <span className="text-[13px] text-casca-suave">
              {t("Aqui você pode adicionar e editar os setores.")}
            </span>
          </div>
        ) : !isLoading && lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-[15px] font-semibold text-casca-texto">
              {t("Nenhum setor encontrado...")}
            </span>
            <span className="text-[13px] text-casca-suave">
              {t("Tente outro termo ou crie um setor para organizar o atendimento.")}
            </span>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-casca-borda">
                <th className={`${CABECA} text-left`}>{t("Setor")}</th>
                <th className={`${CABECA} w-[260px] text-center`}>{t("Conta/Dispositivo")}</th>
                <th className={`${CABECA} w-[260px] text-center`}>{t("Atendentes")}</th>
                <th className={`${CABECA} w-12`} aria-label={t("Ações")} />
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr
                  key={s.id}
                  aria-label={s.nome}
                  className="h-[45px] border-b border-casca-borda hover:bg-casca-raia/50"
                >
                  <td className="px-4">
                    <span className="flex items-center gap-3 text-[13px] text-casca-texto">
                      <MonogramaDoSetor setor={s} />
                      {s.nome}
                    </span>
                  </td>
                  <td className="px-4 text-center text-[13px] text-casca-texto tabular-nums">
                    {s.dispositivos}
                  </td>
                  <td className="px-4 text-center text-[13px] text-casca-texto tabular-nums">
                    {s.membros.length}
                  </td>
                  <td className="px-4 text-right">
                    {podeEditar ? (
                      <MenuDaLinhaDeConfiguracao
                        itens={[
                          {
                            rotulo: t("Editar setor"),
                            icone: <Pencil size={14} aria-hidden />,
                            aoEscolher: () => setJanela({ setor: s }),
                          },
                          {
                            rotulo: t("Remover setor"),
                            icone: <Trash2 size={14} aria-hidden />,
                            perigo: true,
                            confirmar: `${t("Remover o setor")} ${s.nome}?`,
                            aoEscolher: () =>
                              remover.mutate(s.id, {
                                onSuccess: () => toast.success(t("O setor foi removido.")),
                              }),
                          },
                        ]}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <JanelaDoSetor
        aberta={janela !== null}
        aoFechar={() => setJanela(null)}
        setor={janela?.setor ?? null}
      />
    </div>
  );
}
