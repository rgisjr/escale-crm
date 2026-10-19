"use client";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useState } from "react";

import { CalendarioDePeriodo, type Periodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useMensagensAgendadas, useRemoverAgendada } from "@/hooks/escale/useMensagensAgendadas";
import { CabecaDaConfiguracao } from "@/components/escale/conversas/configuracoes/CabecaDaConfiguracao";
import { useT } from "@/hooks/i18n/useT";
import { AGENDADAS_POR_PAGINA } from "@/lib/escale/conversas/agendadas";
import { CalendarDays, ChevronDown, Search, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { TabelaDeAgendadas } from "./TabelaDeAgendadas";

const GATILHO =
  "inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda bg-white px-3 text-[12px] text-casca-texto hover:bg-casca-raia";

function FiltroDePeriodo({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: Periodo;
  aoMudar: (p: Periodo) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const texto =
    valor.de && valor.ate
      ? `${valor.de.split("-").reverse().join("/")} – ${valor.ate.split("-").reverse().join("/")}`
      : rotulo;
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(GATILHO, valor.de && "border-casca-marca text-casca-marca")}
          aria-label={rotulo}
        >
          <CalendarDays size={14} aria-hidden />
          <span>{rotulo}</span>
          {valor.de ? <span className="text-casca-suave">· {texto}</span> : null}
          <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
        </button>
      </Popover.Trigger>
      <PainelSuspenso className="p-3">
        <CalendarioDePeriodo valor={valor} aoMudar={aoMudar} semAbas />
        {valor.de ? (
          <button
            type="button"
            className="mt-2 text-[12px] text-casca-marca"
            onClick={() => aoMudar({ tipo: valor.tipo })}
          >
            {t("Limpar")}
          </button>
        ) : null}
      </PainelSuspenso>
    </Popover.Root>
  );
}

/**
 * "CONFIGURAÇÕES › MENSAGENS AGENDADAS" (c39; C9; N19): migalhas e X, a
 * busca de 260px, Criação e Envio (calendários), Dispositivo ou contato, a
 * tabela e a paginação da Clint.
 */
export function TelaMensagensAgendadas() {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [criacao, setCriacao] = useState<Periodo>({ tipo: "criacao" });
  const [envio, setEnvio] = useState<Periodo>({ tipo: "agendado" });
  const [dispositivo, setDispositivo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(AGENDADAS_POR_PAGINA[0]);
  const { data: dispositivos = [] } = useChannelSessions();
  const { data, isLoading } = useMensagensAgendadas({
    busca: busca.trim() || undefined,
    criacao_de: criacao.de,
    criacao_ate: criacao.ate,
    envio_de: envio.de,
    envio_ate: envio.ate,
    channel_session_id: dispositivo || undefined,
    pagina,
    por_pagina: porPagina,
  });
  const remover = useRemoverAgendada();
  const itens = data?.data ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-mensagens-agendadas">
      <CabecaDaConfiguracao
        migalhas={[
          { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
          { rotulo: t("Mensagens agendadas") },
        ]}
      />
      <div className="flex h-10 shrink-0 items-center gap-2 px-6 py-6">
        <div className="flex h-8 w-[260px] items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-casca-busca px-2">
          <Search size={14} aria-hidden className="text-casca-suave" />
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder={t("Buscar por nome, e-mail ou telefone")}
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta"
          />
        </div>
        <FiltroDePeriodo
          rotulo={t("Criação")}
          valor={criacao}
          aoMudar={(p) => {
            setCriacao(p);
            setPagina(1);
          }}
        />
        <FiltroDePeriodo
          rotulo={t("Envio")}
          valor={envio}
          aoMudar={(p) => {
            setEnvio(p);
            setPagina(1);
          }}
        />
        <SeletorDaCasca
          valor={dispositivo}
          vazio={t("Dispositivo ou conta")}
          opcoes={dispositivos.map((d) => ({ valor: d.id, rotulo: channelLabel(d, t) }))}
          aoMudar={(v) => {
            setDispositivo(v);
            setPagina(1);
          }}
          aria-label={t("Dispositivo ou conta")}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        {isLoading ? (
          <p className="py-10 text-center text-[12px] text-casca-suave">{t("Carregando…")}</p>
        ) : null}
        {!isLoading && itens.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-casca-suave">
            {t("Nenhuma mensagem agendada.")}
          </p>
        ) : null}
        {itens.length > 0 ? (
          <TabelaDeAgendadas itens={itens} aoRemover={(id) => remover.mutate(id)} />
        ) : null}
      </div>
      <div className="shrink-0 border-t border-casca-borda px-6">
        <PaginacaoDaCasca
          pagina={pagina}
          total={data?.meta.total ?? 0}
          porPagina={porPagina}
          opcoesPorPagina={AGENDADAS_POR_PAGINA}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={(n) => {
            setPorPagina(n);
            setPagina(1);
          }}
        />
      </div>
    </div>
  );
}
