"use client";
import { useState, type ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { LinhaCriarTag } from "@/components/escale/ui/LinhaCriarTag";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import type { DestinoDaImportacao } from "@/hooks/escale/useImportacoes";
import type { TipoDeImportacao } from "@/lib/escale/importacao/regras";
import type { Configuracao } from "@/lib/escale/importacao/tipos";
import { tagNovaDoTexto } from "@/lib/escale/tag-nova";
import { CheckCircle2, CircleMinus, CircleX, Plus, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, Titulo } from "./pecas";

export function podeContinuarConfiguracoes(tipo: TipoDeImportacao, config: Configuracao): boolean {
  return tipo === "contato" || (!!config.origemId && !!config.etapaId);
}

function Campo({ rotulo, obrigatorio, erro, children }: { rotulo: string; obrigatorio?: boolean; erro?: string | null; children: ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-[13px] leading-5 font-medium text-casca-texto">
        {rotulo}
        {obrigatorio ? (
          <span aria-hidden className="ml-1 text-casca-alerta">
            *
          </span>
        ) : null}
      </p>
      {children}
      {erro ? <p className="mt-1 text-[12px] text-casca-alerta">{erro}</p> : null}
    </div>
  );
}

function EscolhaDeTags({ escolhidas, aoMudar }: { escolhidas: readonly string[]; aoMudar: (tags: string[]) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null).data ?? [];
  const [busca, setBusca] = useState("");
  const nova = tagNovaDoTexto(busca, vocabulario, escolhidas);
  const lista = vocabulario.filter((tag) => tag.includes(busca.trim().toLowerCase()));
  const alternar = (tag: string, marcada: boolean) => aoMudar(marcada ? [...escolhidas, tag] : escolhidas.filter((x) => x !== tag));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#D9D8E0] px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar tag")}
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-64 p-2" sideOffset={6}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar tag")}
            aria-label={t("Buscar tag")}
            className="mb-2 h-8 w-full rounded-[6px] bg-casca-busca px-2 text-[12px] outline-hidden"
          />
          {nova ? (
            <LinhaCriarTag
              tag={nova}
              aoCriar={(tag) => {
                aoMudar([...escolhidas, tag]);
                setBusca("");
              }}
            />
          ) : null}
          <ul className="max-h-60 space-y-2 overflow-y-auto p-1">
            {lista.map((tag) => (
              <li key={tag}>
                <CaixaDaCasca marcada={escolhidas.includes(tag)} aoMudar={(m) => alternar(tag, m)} rotulo={tag} />
              </li>
            ))}
          </ul>
        </PainelSuspenso>
      </Popover>
      {escolhidas.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-casca-marca-suave pr-1 pl-2.5 text-[12px] font-medium text-casca-marca"
        >
          <span>{tag}</span>
          <button
            type="button"
            aria-label={`${t("Remover tag")} ${tag}`}
            onClick={() => alternar(tag, false)}
            className="grid size-4 place-items-center rounded-full hover:bg-white"
          >
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}

const STATUS_BASE = "flex h-10 items-center justify-center gap-2 rounded-[6px] border text-[13px] disabled:cursor-not-allowed disabled:opacity-60";

export function PassoConfiguracoes({
  tipo,
  config,
  destinos,
  podeGanhar,
  aoMudar,
}: {
  tipo: TipoDeImportacao;
  config: Configuracao;
  destinos: readonly DestinoDaImportacao[];
  podeGanhar: boolean;
  aoMudar: (config: Configuracao) => void;
}) {
  const t = useT();
  const origem = destinos.find((d) => d.id === config.origemId) ?? null;
  const semGrupo = t("Sem grupo");
  const status: Array<{ valor: Configuracao["status"]; rotulo: string; icone: ReactNode; cor: string; desligado: boolean }> = [
    { valor: "open", rotulo: t("Aberto"), icone: <CircleMinus size={16} aria-hidden />, cor: "text-casca-marca", desligado: false },
    { valor: "won", rotulo: t("Ganho"), icone: <CheckCircle2 size={16} aria-hidden />, cor: "text-[#1F9D55]", desligado: !podeGanhar },
    { valor: "lost", rotulo: t("Perdido"), icone: <CircleX size={16} aria-hidden />, cor: "text-[#D1264F]", desligado: false },
  ];
  return (
    <>
      <Titulo
        titulo={t("Configurações da importação")}
        subtitulo={
          tipo === "negocio"
            ? t("Origem, etapa e status padrão dos negócios e a etiqueta aplicada aos contatos.")
            : t("Etiquete os contatos importados. Vale para todas as linhas do arquivo.")
        }
      />
      <ColunaCentral largura="max-w-[560px]">
        <div className="mt-5">
          <p className="text-[13px] leading-5 font-medium text-casca-texto">{t("Tags do contato")}</p>
          <p className="text-[12px] leading-5 text-[#5A5964]">{t("Opcional. Aplicada a todos os contatos criados ou atualizados nesta importação.")}</p>
          <EscolhaDeTags escolhidas={config.tags} aoMudar={(tags) => aoMudar({ ...config, tags })} />
        </div>
        {tipo === "negocio" ? (
          <>
            <Campo rotulo={t("Origem de destino")}>
              <SeletorDaCasca
                valor={config.origemId ?? ""}
                opcoes={destinos.map((d) => ({ valor: d.id, rotulo: d.nome, grupo: d.grupo ?? semGrupo }))}
                aoMudar={(v) => {
                  const nova = destinos.find((d) => d.id === v);
                  aoMudar({ ...config, origemId: nova?.id ?? null, etapaId: nova?.etapas[0]?.id ?? null, motivoDePerda: null });
                }}
                vazio={t("Selecione a origem")}
                vazioSoNoGatilho
                buscaAPartirDe={0}
                aria-label={t("Origem de destino")}
                className="h-8"
              />
            </Campo>
            <Campo
              rotulo={t("Etapa inicial padrão")}
              obrigatorio
              erro={config.origemId && !config.etapaId ? t("Selecione a etapa para continuar.") : null}
            >
              <SeletorDaCasca
                valor={config.etapaId ?? ""}
                opcoes={(origem?.etapas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }))}
                aoMudar={(v) => aoMudar({ ...config, etapaId: v || null })}
                vazio={t("Selecione a etapa")}
                vazioSoNoGatilho
                desabilitado={!origem}
                aria-label={t("Etapa inicial padrão")}
                className="h-8"
              />
            </Campo>
            <Campo rotulo={t("Status")}>
              <div className="grid grid-cols-3 gap-2">
                {status.map((s) => {
                  const botao = (
                    <button
                      key={s.valor}
                      type="button"
                      aria-pressed={config.status === s.valor}
                      disabled={s.desligado}
                      onClick={() => aoMudar({ ...config, status: s.valor, motivoDePerda: s.valor === "lost" ? config.motivoDePerda : null })}
                      className={cn(
                        STATUS_BASE,
                        s.cor,
                        config.status === s.valor ? "border-casca-marca bg-casca-marca-suave" : "border-[#E4E4E9]",
                      )}
                    >
                      {s.icone}
                      {s.rotulo}
                    </button>
                  );
                  return s.desligado ? (
                    <Tooltip key={s.valor}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex [&>button]:w-full">{botao}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{t("Só administrador importa negócio ganho.")}</TooltipContent>
                    </Tooltip>
                  ) : (
                    botao
                  );
                })}
              </div>
            </Campo>
            {config.status === "lost" ? (
              <Campo rotulo={t("Motivo de perda")}>
                <SeletorDaCasca
                  valor={config.motivoDePerda ?? ""}
                  opcoes={(origem?.motivos ?? []).map((m) => ({ valor: m.valor, rotulo: t(m.rotulo) }))}
                  aoMudar={(v) => aoMudar({ ...config, motivoDePerda: v || null })}
                  vazio={t("Não informar")}
                  aria-label={t("Motivo de perda")}
                  className="h-8"
                />
              </Campo>
            ) : null}
          </>
        ) : null}
      </ColunaCentral>
    </>
  );
}
