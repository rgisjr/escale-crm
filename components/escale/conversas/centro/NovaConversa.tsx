"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { JanelaNovoContato } from "@/components/escale/contatos/JanelaNovoContato";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useChannelSessions, type ChannelSession } from "@/hooks/channels/useChannelSessions";
import { useContactList } from "@/hooks/contacts/useContactList";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import {
  candidatosParaConversaNova,
  elegiveisParaConversaNova,
} from "@/lib/channels/conversa-nova";
import { nomeDoCanal } from "@/lib/channels/estado";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import {
  ROTULO_DO_GRUPO,
  agruparDispositivos,
  bolinhaDoDispositivo,
} from "@/lib/escale/conversas/nova-conversa";
import type { Contact } from "@/lib/types/contacts";
import { ChevronDown, ContactRound, Mail, Phone, User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { VazioDaCasca } from "./VazioDaCasca";

const GATILHO =
  "flex h-8 w-[446px] max-w-full items-center justify-between rounded-casca-gatilho border px-3 text-[14px] text-casca-texto";

/**
 * "NOVA CONVERSA" (fork Escale, Fase 3A; A12; c21, c84–c86). Troca o centro
 * pela tela "Crie ou selecione um contato"; escolhido o contato, pede o
 * dispositivo; escolhido o dispositivo, abre a conversa pela rota do original
 * (`open-with-contact`) e a seleciona.
 */
export function NovaConversa({
  origens,
  aoAbrirConversa,
  aoCancelar: _aoCancelar,
}: {
  origens: OrigemParaCriar[];
  aoAbrirConversa: (id: string | null) => void;
  aoCancelar: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [termo, setTermo] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [contato, setContato] = useState<Contact | null>(null);
  const [criando, setCriando] = useState<string | null>(null);
  const [dispositivosAbertos, setDispositivosAbertos] = useState(false);
  const [abrindo, setAbrindo] = useState(false);

  const lista = useContactList({
    search: termo.trim().length >= 1 ? termo.trim() : undefined,
    limit: 20,
  });
  const contatos = useMemo(() => lista.data?.pages.flatMap((p) => p.data) ?? [], [lista.data]);
  const canais = useChannelSessions();
  const candidatos = useMemo(() => candidatosParaConversaNova(canais.data ?? []), [canais.data]);
  const elegiveis = useMemo(
    () => new Set(elegiveisParaConversaNova(candidatos).map((c) => c.id)),
    [candidatos],
  );
  const grupos = useMemo(() => agruparDispositivos(candidatos), [candidatos]);

  async function abrir(canal: ChannelSession) {
    if (!contato) return;
    setDispositivosAbertos(false);
    setAbrindo(true);
    try {
      const r = await apiClient.post<{ data: { conversation_id: string } }>(
        "/api/v1/conversations/open-with-contact",
        { contact_id: contato.id, channel_session_id: canal.id },
      );
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      aoAbrirConversa(r.data.conversation_id);
    } catch {
      toast.error(t("Não foi possível abrir a conversa."));
    } finally {
      setAbrindo(false);
    }
  }

  const nomeDoContato = contato ? rotuloDoContato(contato, t) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-casca-borda px-4">
        {contato ? (
          <FotoDaLinha id={contato.id} nome={nomeDoContato ?? ""} temFoto={false} />
        ) : (
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-full bg-casca-raia text-casca-meta"
          >
            <User size={18} />
          </span>
        )}
        {nomeDoContato ? (
          <h2 className="text-[15px] font-medium text-casca-texto">{nomeDoContato}</h2>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col items-center pt-24">
        <VazioDaCasca
          icone={ContactRound}
          titulo={t("Crie ou selecione um contato")}
          texto={
            <>
              {t("Pesquise pelo nome, e-mail,")}
              <br />
              {t("telefone ou Instagram do contato")}
            </>
          }
        />
        <span className="-mt-9 ml-[200px]">
          <AjudaDaCasca texto={t("Pesquise pelo nome, e-mail, telefone ou Instagram do contato")} />
        </span>
        <Popover open={buscaAberta} onOpenChange={setBuscaAberta}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={buscaAberta}
              aria-label={t("Pesquisar")}
              className={cn(
                GATILHO,
                "mt-6",
                buscaAberta ? "border-casca-marca" : "border-casca-borda",
              )}
            >
              <span className={cn(!nomeDoContato && "text-casca-meta")}>
                {nomeDoContato ?? t("Pesquisar")}
              </span>
              <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" className="w-[446px] p-0">
            <div className="p-2">
              <input
                type="search"
                role="searchbox"
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder={t("Pesquisar")}
                aria-label={t("Pesquisar")}
                className="h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[14px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
              />
            </div>
            <ul
              role="listbox"
              aria-label={t("Contatos")}
              className="max-h-[360px] overflow-y-auto px-2 pb-2"
            >
              {termo.trim() ? (
                <li role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      setBuscaAberta(false);
                      setCriando(termo.trim());
                    }}
                    className="mb-1 h-8 w-full rounded-casca-gatilho bg-casca-marca text-[14px] font-medium text-white hover:bg-casca-marca-forte"
                  >
                    {`${t("Criar")} "${termo.trim()}"`}
                  </button>
                </li>
              ) : null}
              {lista.isLoading ? (
                <li className="px-3 py-2 text-[14px] text-casca-suave">{t("Carregando…")}</li>
              ) : contatos.length === 0 ? (
                <li className="px-3 py-2 text-[14px] text-casca-suave">
                  {t("Nenhum contato encontrado.")}
                </li>
              ) : (
                contatos.map((c) => {
                  const nome = rotuloDoContato(c, t);
                  return (
                    <li key={c.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={contato?.id === c.id}
                        onClick={() => {
                          setContato(c);
                          setBuscaAberta(false);
                        }}
                        className="flex h-12 w-full items-center gap-3 rounded-casca-gatilho px-2 text-left hover:bg-casca-raia"
                      >
                        <FotoDaLinha id={c.id} nome={nome} temFoto={false} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[14px] font-medium text-casca-texto">
                            {nome}
                          </span>
                          <span className="flex items-center gap-3 text-[12px] text-casca-suave">
                            {c.phone_number ? (
                              <span className="flex items-center gap-1">
                                <Phone size={12} aria-hidden />
                                {formatarTelefone(c.phone_number)}
                              </span>
                            ) : null}
                            {c.email ? (
                              <span className="flex items-center gap-1">
                                <Mail size={12} aria-hidden />
                                {c.email}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </PainelSuspenso>
        </Popover>

        {contato ? (
          <div className="mt-6 flex w-[446px] max-w-full flex-col gap-2">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-casca-texto">
              {t("Selecione um dispositivo ou conta")}
              <AjudaDaCasca texto={t("A conversa sai por este dispositivo ou conta.")} />
            </p>
            <Popover open={dispositivosAbertos} onOpenChange={setDispositivosAbertos}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={dispositivosAbertos}
                  aria-label={t("Selecionar dispositivo ou conta")}
                  disabled={abrindo}
                  title={abrindo ? t("Abrindo…") : undefined}
                  className={cn(
                    GATILHO,
                    dispositivosAbertos ? "border-casca-marca" : "border-casca-borda",
                  )}
                >
                  <span className="text-casca-meta">
                    {abrindo ? t("Abrindo…") : t("Selecionar dispositivo ou conta")}
                  </span>
                  <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
                </button>
              </PopoverTrigger>
              <PainelSuspenso align="start" className="w-[446px] p-2">
                <ul
                  role="listbox"
                  aria-label={t("Dispositivos")}
                  className="max-h-[360px] overflow-y-auto"
                >
                  {grupos.length === 0 ? (
                    <li className="px-3 py-2 text-[14px] text-casca-suave">
                      {t(
                        "Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa.",
                      )}
                    </li>
                  ) : null}
                  {grupos.map((g) => (
                    <li key={g.grupo}>
                      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-casca-meta uppercase">
                        {t(ROTULO_DO_GRUPO[g.grupo])}
                      </p>
                      <ul>
                        {g.canais.map((c) => {
                          const elegivel = elegiveis.has(c.id);
                          return (
                            <li key={c.id} role="presentation">
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                aria-disabled={!elegivel}
                                title={elegivel ? undefined : t("Desconectado")}
                                onClick={() => {
                                  if (elegivel) void abrir(c);
                                }}
                                className="flex h-[42px] w-full items-center justify-between rounded-casca-gatilho px-3 text-left hover:bg-casca-raia aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
                              >
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate text-[14px] text-casca-texto">
                                    {nomeDoCanal(c, t)}
                                  </span>
                                  <span className="text-[12px] text-casca-suave">
                                    {formatarTelefone(c.phone_number)}
                                  </span>
                                </span>
                                <span
                                  aria-hidden
                                  className={cn(
                                    "size-2 shrink-0 rounded-full",
                                    bolinhaDoDispositivo(c.status) === "verde"
                                      ? "bg-(--escale-status-ganho)"
                                      : "bg-casca-alerta",
                                  )}
                                />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </PainelSuspenso>
            </Popover>
          </div>
        ) : null}
      </div>
      <JanelaNovoContato
        aberta={criando !== null}
        aoFechar={() => setCriando(null)}
        origens={origens}
        nomeInicial={criando ?? undefined}
        aoCriar={(novo) => {
          setContato({
            id: novo.id,
            name: novo.nome,
            display_name: null,
            phone_number: null,
            email: null,
            tags: [],
          } as unknown as Contact);
          setCriando(null);
        }}
      />
    </div>
  );
}
