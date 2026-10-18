"use client";
import { useMemo, useState } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { ConfirmacaoDaCasca } from "@/components/escale/ui/ConfirmacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import type { Role } from "@/lib/auth/types";
import { temAcessoAOrigem } from "@/lib/escale/acesso/regras";
import {
  DISTRIBUICAO_MAX,
  dividirIgual,
  tempoRelativo,
  type LinhaDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";
import { Clock, Shuffle, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import { HistoricoDeAlteracoes } from "./HistoricoDeAlteracoes";
import { HistoricoDeDistribuicoes } from "./HistoricoDeDistribuicoes";
import type { PropsDaSecao } from "./JanelaDaOrigem";
import { membrosAtivosDaEquipe } from "./ListaDePessoas";

const PAPEIS_QUE_RECEBEM = ["agent", "manager", "admin"];
const GRADE = "grid grid-cols-[1fr_16.666%_16.666%_8.333%] items-center";

/** "Ana Lima" → "AL"; "Ana" → "AN" (o avatar de iniciais da Clint). */
export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0]}${partes.at(-1)![0]}`.toUpperCase();
}

/**
 * DISTRIBUIÇÃO DE DONO (fork Escale, Fase 1K, D13; print 01-028 e código `Is` da Clint).
 * Só o admin vê (o menu esconde o item). Tudo vai para o rascunho; quem grava é
 * o "Salvar" único da janela, pela rota própria (N12). Entrar ou sair alguém
 * refaz todos com 100/n. Só são oferecidos membros ativos que podem receber
 * negócio e têm acesso à origem com a lista de pessoas do rascunho.
 */
export function SecaoDistribuicao({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const tag = useTagDeIdioma();
  const [agora] = useState(() => Date.now());
  const [relogio, setRelogio] = useState(false);
  const [contadorDe, setContadorDe] = useState<string | null>(null);
  const quando = config.distribuicaoAtualizada;
  const nomeDaOrigem = config.pipeline.name;
  const equipe = useTeamMembers();
  const membros = useMemo(
    () => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")),
    [equipe.data, t],
  );
  const papelDe = useMemo(
    () => new Map((equipe.data?.data ?? []).map((m) => [m.user_id.toLowerCase(), m.role])),
    [equipe.data],
  );
  const contadores = useMemo(
    () => new Map(config.distribuicao.map((p) => [p.userId, p.contador])),
    [config.distribuicao],
  );
  const linhas = rascunho.distribuicao.linhas;
  const mudarLinhas = (novas: LinhaDaDistribuicao[]) =>
    mudar((r) => ({ ...r, distribuicao: { ...r.distribuicao, linhas: novas } }));

  const opcoes = membros
    .filter((m) => !linhas.some((l) => l.userId === m.id))
    .filter((m) => {
      const papel = papelDe.get(m.id);
      return (
        !!papel &&
        PAPEIS_QUE_RECEBEM.includes(papel) &&
        temAcessoAOrigem({
          papel: papel as Role,
          userId: m.id,
          pessoas: rascunho.permissoes.pessoas,
          pessoasDoGrupo: config.pessoasDoGrupo,
        })
      );
    });

  return (
    <div className="grid max-w-[784px] gap-4">
      <CabecaDaSecao
        icone={Shuffle}
        titulo={t("Distribuição de dono")}
        descricao={t(
          "Defina os usuários e percentuais. Negócios criados por Integrações, Apps e Checkouts são distribuídos automaticamente entre eles.",
        )}
        acao={
          <button
            type="button"
            onClick={() => setRelogio(true)}
            aria-label={t("Histórico de alterações")}
            title={quando ? undefined : t("Histórico de alterações")}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border border-casca-borda px-2.5 text-[12px] text-casca-suave hover:bg-casca-raia"
          >
            <Clock size={13} aria-hidden />
            {quando ? `${t("Atualizado")} ${tempoRelativo(quando.em, agora, tag)}` : null}
          </button>
        }
      />

      <div role="table" aria-label={t("Distribuição de dono")}>
        <div role="row" className={`${GRADE} h-11 border-b border-casca-borda`}>
          <span
            role="columnheader"
            className="text-[10px] font-semibold tracking-wide text-casca-meta uppercase"
          >
            {t("Usuários")}
          </span>
          <span
            role="columnheader"
            className="text-center text-[10px] font-semibold tracking-wide text-casca-meta uppercase"
          >
            {t("Percentual %")}
          </span>
          <span
            role="columnheader"
            className="flex items-center justify-center gap-1 text-[10px] font-semibold tracking-wide text-casca-meta uppercase"
          >
            {t("Contador")}
            <AjudaDaCasca
              texto={t(
                "Clique no contador para ver as distribuições feitas para o usuário nesta origem.",
              )}
            />
          </span>
          <span role="columnheader" />
        </div>
        {linhas.map((l) => {
          const m = membros.find((x) => x.id === l.userId);
          const nome = m?.nome ?? l.userId;
          return (
            <div
              key={l.userId}
              role="row"
              aria-label={nome}
              className={`${GRADE} min-h-14 border-b border-casca-borda py-2`}
            >
              <div role="cell" className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-casca-marca text-[11px] font-semibold text-white"
                >
                  {iniciaisDoNome(nome)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-casca-texto">
                    {nome}
                  </span>
                  {m?.email ? (
                    <span className="block truncate text-[11px] text-casca-suave">{m.email}</span>
                  ) : null}
                </span>
              </div>
              <div role="cell" className="flex justify-center">
                <CampoDeTexto
                  aria-label={`${t("Percentual %")} ${nome}`}
                  inputMode="decimal"
                  value={l.percentual}
                  onChange={(e) =>
                    mudarLinhas(
                      linhas.map((x) =>
                        x.userId === l.userId ? { ...x, percentual: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-9 w-[72px] px-2 text-center"
                />
              </div>
              <div role="cell" className="flex justify-center">
                <button
                  type="button"
                  aria-label={t("Ver distribuições de {nome}")
                    .split("{nome}")
                    .join(nome.split(" ")[0] ?? nome)}
                  onClick={() => setContadorDe(l.userId)}
                  className="inline-flex items-center gap-1 rounded-full bg-casca-marca-suave px-3.5 py-1 text-[13px] font-semibold text-casca-marca hover:brightness-95"
                >
                  <Clock size={13} aria-hidden />
                  {contadores.get(l.userId) ?? 0}
                </button>
              </div>
              <div role="cell" className="flex justify-center">
                <ConfirmacaoDaCasca
                  texto={t(
                    "A distribuição vai ser refeita com porcentagens iguais entre os demais usuários. Tem certeza que deseja remover este usuário?",
                  )}
                  aoConfirmar={() =>
                    mudarLinhas(dividirIgual(linhas.filter((x) => x.userId !== l.userId)))
                  }
                >
                  <button
                    type="button"
                    aria-label={`${t("Remover")} ${nome}`}
                    className="rounded-[4px] p-1 text-casca-texto hover:text-casca-alerta"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </ConfirmacaoDaCasca>
              </div>
            </div>
          );
        })}
      </div>

      {opcoes.length > 0 && linhas.length < DISTRIBUICAO_MAX ? (
        <div className="w-[708px] max-w-full">
          <SeletorDaCasca
            aparencia="janela"
            valor=""
            vazio={t("Adicionar usuário")}
            vazioSoNoGatilho
            buscaAPartirDe={1}
            opcoes={opcoes.map((m) => ({ valor: m.id, rotulo: m.nome }))}
            aoMudar={(v) =>
              v &&
              mudarLinhas(
                dividirIgual([
                  ...linhas,
                  { userId: v, percentual: "", papel: papelDe.get(v) ?? null },
                ]),
              )
            }
            aria-label={t("Adicionar usuário")}
          />
        </div>
      ) : null}

      <HistoricoDeAlteracoes
        aberta={relogio}
        aoFechar={() => setRelogio(false)}
        pipelineId={config.pipeline.id}
        origem={nomeDaOrigem}
      />
      {/* Montada só aberta: cada abertura começa com os filtros limpos e a pessoa do contador clicado. */}
      {contadorDe !== null ? (
        <HistoricoDeDistribuicoes
          aberta
          aoFechar={() => setContadorDe(null)}
          pipelineId={config.pipeline.id}
          origem={nomeDaOrigem}
          usuarioInicial={contadorDe}
          naDistribuicao={config.distribuicao.map((p) => p.userId)}
        />
      ) : null}
    </div>
  );
}
