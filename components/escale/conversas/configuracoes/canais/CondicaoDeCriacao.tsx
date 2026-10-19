"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import type { OrigemDaCriacao } from "@/hooks/escale/useCriacaoDeNegocio";
import { useT } from "@/hooks/i18n/useT";
import {
  NOME_DA_CONDICAO_MAX,
  ROTULO_DO_TIPO_DE_MENSAGEM,
  TIPOS_DE_MENSAGEM,
  type RegraEmEdicao,
  type TipoDeMensagem,
} from "@/lib/escale/conversas/criacao-de-negocio";
import { ChevronDown, ChevronRight, Pencil, Trash2, X } from "@/lib/ui/icons-da-casca";

import { CampoDeMensagens } from "./CampoDeMensagens";
import { TagsDaCondicao } from "./TagsDaCondicao";

const ROTULO = "text-[13px] font-semibold text-casca-texto";

/** Uma condição (16/10-01, c105–c108): o acordeão, o nome editável, a lixeira com confirmação a partir da 2ª. */
export function CondicaoDeCriacao({
  regra,
  numero,
  aberta,
  aoAlternar,
  aoMudar,
  aoExcluir,
  origens,
  podeEditar,
}: {
  regra: RegraEmEdicao;
  numero: number;
  aberta: boolean;
  aoAlternar: () => void;
  aoMudar: (r: RegraEmEdicao) => void;
  aoExcluir?: () => void;
  origens: OrigemDaCriacao[];
  podeEditar: boolean;
}) {
  const t = useT();
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const etapas = origens.find((o) => o.id === regra.origem_id)?.etapas ?? [];
  const mudar = (parte: Partial<RegraEmEdicao>) => aoMudar({ ...regra, ...parte });

  return (
    <div className="rounded-lg border border-casca-borda bg-surface" data-numero={numero}>
      {editando !== null ? (
        <div className="flex items-center gap-2 p-2">
          <input
            autoFocus
            value={editando}
            maxLength={NOME_DA_CONDICAO_MAX}
            onChange={(e) => setEditando(e.target.value)}
            aria-label={t("Editar nome da condição")}
            className="h-9 flex-1 rounded-casca-gatilho bg-casca-busca px-3 text-[13px] outline-hidden"
          />
          <button
            type="button"
            disabled={!editando.trim()}
            onClick={() => {
              mudar({ nome: editando.trim() });
              setEditando(null);
            }}
            className="h-8 rounded-casca-gatilho bg-casca-marca px-3 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {t("Salvar")}
          </button>
          <button
            type="button"
            aria-label={t("Cancelar")}
            onClick={() => setEditando(null)}
            className="grid size-8 place-items-center rounded-casca-gatilho bg-casca-raia text-casca-suave"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : (
        <div className="group flex h-12 items-center gap-2 px-4">
          <button
            type="button"
            aria-expanded={aberta}
            onClick={aoAlternar}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] text-casca-texto"
          >
            {aberta ? (
              <ChevronDown size={14} aria-hidden />
            ) : (
              <ChevronRight size={14} aria-hidden />
            )}
            <span className="truncate">{regra.nome}</span>
          </button>
          {podeEditar ? (
            <>
              <button
                type="button"
                aria-label={`${t("Editar nome da condição")} ${regra.nome}`}
                onClick={() => setEditando(regra.nome)}
                className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave opacity-0 group-hover:opacity-100 hover:bg-casca-raia focus-visible:opacity-100"
              >
                <Pencil size={14} aria-hidden />
              </button>
              {aoExcluir ? (
                <Popover open={confirmando} onOpenChange={setConfirmando}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${t("Excluir condição")} ${regra.nome}`}
                      className="grid size-7 place-items-center rounded-casca-gatilho text-casca-alerta hover:bg-casca-raia"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </PopoverTrigger>
                  <PainelSuspenso align="end" className="w-[220px] p-3">
                    <p className="text-[12px] text-casca-texto">
                      {t("Tem certeza que deseja excluir essa condição?")}
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmando(false)}
                        className="h-6 rounded-casca-gatilho border border-casca-borda px-2 text-[11px]"
                      >
                        {t("Não")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmando(false);
                          aoExcluir();
                        }}
                        className="h-6 rounded-casca-gatilho bg-casca-marca px-2 text-[11px] font-semibold text-white"
                      >
                        {t("Sim")}
                      </button>
                    </div>
                  </PainelSuspenso>
                </Popover>
              ) : null}
            </>
          ) : null}
        </div>
      )}
      {aberta ? (
        <div className="flex flex-col gap-4 border-t border-casca-borda px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <span className={ROTULO}>{t("Quando receber uma mensagem que")}</span>
            <div className="flex flex-col gap-2 md:flex-row">
              <SeletorDaCasca
                aparencia="janela"
                valor={regra.tipo}
                opcoes={TIPOS_DE_MENSAGEM.map((x) => ({
                  valor: x,
                  rotulo: t(ROTULO_DO_TIPO_DE_MENSAGEM[x]),
                }))}
                aoMudar={(v) => mudar({ tipo: (v || "igual") as TipoDeMensagem })}
                vazioSoNoGatilho
                desabilitado={!podeEditar}
                aria-label={t("Quando receber uma mensagem que")}
                className="md:w-[180px]"
              />
              {regra.tipo !== "qualquer" ? (
                <CampoDeMensagens
                  valores={regra.mensagens}
                  aoMudar={(m) => mudar({ mensagens: m })}
                  desabilitado={!podeEditar}
                />
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={ROTULO}>{t("Criar negócio na origem")}</span>
              <SeletorDaCasca
                aparencia="janela"
                valor={regra.origem_id}
                opcoes={origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
                aoMudar={(v) => mudar({ origem_id: v, etapa_id: "" })}
                vazio={t("Selecione...")}
                vazioSoNoGatilho
                desabilitado={!podeEditar}
                aria-label={t("Criar negócio na origem")}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={ROTULO}>{t("Na etapa")}</span>
              <SeletorDaCasca
                aparencia="janela"
                valor={regra.etapa_id}
                opcoes={etapas.map((e) => ({ valor: e.id, rotulo: e.nome }))}
                aoMudar={(v) => mudar({ etapa_id: v })}
                vazio={t("Selecione...")}
                vazioSoNoGatilho
                desabilitado={!podeEditar || !regra.origem_id}
                aria-label={t("Na etapa")}
              />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={ROTULO}>{t("Adicionar tags ao contato")}</span>
            <TagsDaCondicao
              valores={regra.tags}
              aoMudar={(tags) => mudar({ tags })}
              desabilitado={!podeEditar}
            />
          </div>
          <div className="flex items-center gap-2">
            <CaixaDaCasca
              marcada={regra.manter_atendente}
              aoMudar={(v) => mudar({ manter_atendente: v })}
              desabilitada={!podeEditar}
              rotulo={t("Manter atendente de acordo com a distribuição de dono do negócio.")}
            />
            <AjudaDaCasca
              texto={t(
                "A origem escolhida pode ter a configuração de distribuição de dono automática quando chega um novo negócio. Se marcado, essa regra definirá o atendente igual ao dono do negócio que foi definido na origem.",
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
