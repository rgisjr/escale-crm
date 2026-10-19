"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useExcluirResposta, useRespostasRapidas } from "@/hooks/escale/useRespostasRapidas";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast } from "@/lib/auth/types";
import {
  FILTRO_PESSOAIS,
  FILTRO_TODOS,
  comBarra,
  type RespostaLida,
} from "@/lib/escale/conversas/respostas";
import { InstagramLogo } from "@/lib/ui/icons";
import { MessageCircle, Pencil, Search, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { MenuDaLinhaDeConfiguracao } from "../MenuDaLinhaDeConfiguracao";
import { JanelaRespostaRapida } from "./JanelaRespostaRapida";

const CABECA =
  "h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";
const POR_PAGINA = [10, 25, 50] as const;

/** "CONFIGURAÇÕES › RESPOSTAS RÁPIDAS" (c41, c97; E6). */
export function TelaRespostasRapidas() {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const minhas = useMinhasPermissoes();
  const ehGerente = roleAtLeast(activeOrg?.role, "manager");
  const { data: setores = [] } = useSetores();
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState<string>(FILTRO_TODOS);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA[0]);
  const [janela, setJanela] = useState<{ resposta: RespostaLida | null } | null>(null);
  const { data, isLoading } = useRespostasRapidas({ busca, setor, pagina, por_pagina: porPagina });
  const excluir = useExcluirResposta();
  const itens = data?.data ?? [];
  const nomeDoSetor = (id: string) => setores.find((s) => s.id === id)?.nome ?? "";
  const podeMexer = (r: RespostaLida) =>
    r.dono === user.id ||
    (r.compartilhada && ehGerente) ||
    minhas.CHAT_EDIT_QUICK_RESPONSE === true;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-respostas-rapidas">
      <CabecaDaConfiguracao
        migalhas={[
          { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
          { rotulo: t("Respostas rápidas") },
        ]}
      />
      <div className="flex h-14 shrink-0 items-center gap-3 px-6">
        <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder={t("Buscar")}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta"
          />
          <Search size={16} aria-hidden className="text-casca-suave" />
        </span>
        <SeletorDaCasca
          valor={setor}
          opcoes={[
            { valor: FILTRO_TODOS, rotulo: t("Todos os setores") },
            { valor: FILTRO_PESSOAIS, rotulo: t("Pessoais") },
            ...setores.map((s) => ({ valor: s.id, rotulo: s.nome })),
          ]}
          aoMudar={(v) => {
            setSetor(v);
            setPagina(1);
          }}
          vazio={t("Setor")}
          aria-label={t("Setor")}
        />
        <span className="flex-1" />
        <AjudaDaCasca
          texto={t("Crie atalhos de mensagens para responder mais rápido no atendimento.")}
        />
        <BotaoDaCasca variante="marca" onClick={() => setJanela({ resposta: null })}>
          {t("Adicionar")}
        </BotaoDaCasca>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!isLoading && itens.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-semibold text-casca-texto">
              {t("Você ainda não cadastrou respostas rápidas.")}
            </p>
            <p className="text-[13px] text-casca-suave">
              {t("Crie atalhos de mensagens para responder mais rápido no atendimento.")}
            </p>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-casca-borda">
                <th className={`${CABECA} w-[224px]`}>{t("Atalho")}</th>
                <th className={CABECA}>{t("Conteúdo")}</th>
                <th className={`${CABECA} w-[160px]`}>{t("Setores")}</th>
                <th className={`${CABECA} w-[120px] text-center`}>{t("Canais")}</th>
                <th className={`${CABECA} w-12`} aria-label={t("Ações")} />
              </tr>
            </thead>
            <tbody>
              {itens.map((r) => (
                <tr
                  key={r.id}
                  aria-label={r.atalho}
                  className="border-b border-casca-borda hover:bg-casca-raia/50"
                >
                  <td className="px-4 py-3 text-[13px] text-casca-marca">
                    <span className="block truncate">{comBarra(r.atalho)}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-casca-texto">
                    <span className="line-clamp-2">{r.corpo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {r.todos_os_setores ? (
                        <span className="rounded bg-casca-raia px-1.5 py-0.5 text-[11px] text-casca-texto">
                          {t("Todos")}
                        </span>
                      ) : (
                        r.setores.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-casca-raia px-1.5 py-0.5 text-[11px] text-casca-texto"
                          >
                            {nomeDoSetor(s)}
                          </span>
                        ))
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-center gap-2">
                      {r.canais.includes("whatsapp") ? (
                        <MessageCircle
                          size={14}
                          aria-label="WhatsApp"
                          className="text-[color:var(--escale-status-ganho)]"
                        />
                      ) : null}
                      {r.canais.includes("instagram") ? (
                        <InstagramLogo
                          size={14}
                          aria-label="Instagram"
                          className="text-casca-alerta"
                        />
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {podeMexer(r) ? (
                      <MenuDaLinhaDeConfiguracao
                        itens={[
                          {
                            rotulo: t("Editar"),
                            icone: <Pencil size={14} aria-hidden />,
                            aoEscolher: () => setJanela({ resposta: r }),
                          },
                          {
                            rotulo: t("Excluir"),
                            icone: <Trash2 size={14} aria-hidden />,
                            perigo: true,
                            confirmar: `${t("Excluir a resposta")} ${comBarra(r.atalho)}?`,
                            aoEscolher: () => excluir.mutate(r.id),
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
      <div className="shrink-0 border-t border-casca-borda px-6">
        <PaginacaoDaCasca
          pagina={pagina}
          total={data?.meta.total ?? 0}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={(n) => {
            setPorPagina(n);
            setPagina(1);
          }}
        />
      </div>
      <JanelaRespostaRapida
        aberta={janela !== null}
        aoFechar={() => setJanela(null)}
        resposta={janela?.resposta ?? null}
      />
    </div>
  );
}
