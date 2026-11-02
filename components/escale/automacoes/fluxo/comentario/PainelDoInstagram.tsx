"use client";
import { useRef } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { useT } from "@/hooks/i18n/useT";
import { useDefaultPipeline } from "@/hooks/pipelines/useDefaultPipeline";
import type { DadosDaAcao, DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import {
  GATILHOS_DE_DIRECT,
  MAXIMO_DE_BOTOES,
  MAXIMO_DO_TEXTO,
  MAXIMO_DO_TEXTO_COM_BOTAO,
  MAXIMO_DO_TITULO_DO_BOTAO,
} from "@/lib/escale/comentarios/constantes";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { Paperclip, Plus, Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { PainelDoNo, ProblemasDoPainel } from "../painel/PainelDoNo";
import { useRascunho } from "../painel/useRascunho";

type Botao = { titulo: string; url: string };
type Anexo = { tipo: string; url: string; nome: string | null };
const TIPOS_DE_ANEXO = [
  { valor: "image", rotulo: "Imagem" },
  { valor: "video", rotulo: "Vídeo" },
  { valor: "audio", rotulo: "Áudio" },
  { valor: "file", rotulo: "Arquivo" },
] as const;

/**
 * O PAINEL DO PASSO INSTAGRAM (fork Escale, Fase 10B, D9; molde 07-027): a mensagem (até 1.000
 * caracteres, 640 com botão) e de 0 a 3 botões de link. Provisório: sem print da Clint.
 */
export function PainelDoInstagram({
  dados,
  evento,
  aoCancelar,
  aoSalvar,
  aoMudarRascunho,
}: {
  dados: DadosDaAcao;
  /** FORK ESCALE · Fase 10D: no gatilho de direct o passo manda mensagem comum, com anexo (D8). */
  evento?: string;
  aoCancelar: () => void;
  aoSalvar: (dados: DadosDaCaixa) => void;
  aoMudarRascunho?: (sujo: boolean) => void;
}) {
  const t = useT();
  const { rascunho, setRascunho, sujo } = useRascunho(dados.acao, aoMudarRascunho);
  const pipeline = useDefaultPipeline(true);
  const campos = camposDoFunil(pipeline.data?.pipeline.settings ?? null).map((f) => ({ chave: f.key, rotulo: f.label }));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const config = rascunho.config;
  const noDirect = (GATILHOS_DE_DIRECT as readonly string[]).includes(evento ?? "");
  const anexo = (config.anexo as Anexo | null | undefined) ?? null;
  const texto = typeof config.texto === "string" ? config.texto : "";
  const botoes: Botao[] = Array.isArray(config.botoes) ? (config.botoes as Botao[]) : [];
  const limite = botoes.length > 0 ? MAXIMO_DO_TEXTO_COM_BOTAO : MAXIMO_DO_TEXTO;
  const mudar = (patch: Record<string, unknown>) => setRascunho({ ...rascunho, config: { ...config, ...patch } });
  const mudarBotao = (indice: number, patch: Partial<Botao>) =>
    mudar({ botoes: botoes.map((b, i) => (i === indice ? { ...b, ...patch } : b)) });

  function inserir(token: string) {
    const el = textareaRef.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    mudar({ texto: texto.slice(0, inicio) + token + texto.slice(fim) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(inicio + token.length, inicio + token.length);
    });
  }

  const textoVazio = sujo && texto.trim() === "";
  return (
    <PainelDoNo
      tipo="instagram"
      titulo={t("Enviar mensagem no Instagram")}
      aoCancelar={aoCancelar}
      aoSalvar={() => aoSalvar({ kind: "acao", acao: rascunho })}
      salvarDesabilitado={!sujo}
    >
      <ProblemasDoPainel lista={dados.problemas} />
      <div className="flex flex-col gap-5">
        <p className="rounded-lg bg-casca-raia p-3 text-[12px] text-casca-texto-2">
          {noDirect
            ? t("Esta mensagem sai na conversa do contato. O Instagram aceita mensagens até 24 horas depois da última mensagem da pessoa.")
            : t("Esta mensagem sai como resposta privada ao comentário: uma por comentário, até 7 dias depois dele (regra do Instagram). Ela chega em Solicitações de mensagem, por isso o link vai em botão.")}
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-casca-texto">{t("Configure sua mensagem")}</p>
          <div className="flex flex-col gap-2 rounded-lg border border-casca-divisoria p-4">
            <SeletorDeVariaveis
              aoEscolher={inserir}
              adicionais={{ negocio: campos }}
              gatilho={
                <button type="button" className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-casca-marca hover:underline">
                  <Plus size={14} aria-hidden />
                  {t("Adicionar variáveis")}
                </button>
              }
            />
            <textarea
              ref={textareaRef}
              rows={5}
              aria-label={t("Mensagem")}
              value={texto}
              onChange={(e) => mudar({ texto: e.target.value })}
              placeholder={t("Oi [CONTACT.FIRST_NAME], aqui está o link que você pediu!")}
              className="w-full resize-y rounded-[4px] border-0 bg-casca-raia p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
            />
            <div className="flex items-center justify-between">
              <span role={textoVazio ? "alert" : undefined} className="text-[11px] text-casca-alerta">
                {textoVazio ? t("Escreva a mensagem.") : ""}
              </span>
              <span className={cn("text-[10px]", texto.length > limite ? "text-casca-alerta" : "text-casca-suave")}>
                {`${texto.length}/${limite}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
            {t("Botões")}
            <AjudaDaCasca texto={t("Até 3 botões de link. O título aceita até 20 caracteres.")} />
          </p>
          {botoes.map((b, i) => {
            const linkRuim = b.url !== "" && !b.url.startsWith("https://");
            return (
              <div key={i} className="flex flex-col gap-2 rounded-lg bg-casca-raia p-3" data-testid={`botao-${i}`}>
                <div className="flex items-center justify-between">
                  <label htmlFor={`titulo-${i}`} className="text-[12px] text-casca-texto">
                    {t("Título do botão")}
                  </label>
                  <span className={cn("text-[10px]", b.titulo.length > MAXIMO_DO_TITULO_DO_BOTAO ? "text-casca-alerta" : "text-casca-suave")}>
                    {`${b.titulo.length}/${MAXIMO_DO_TITULO_DO_BOTAO}`}
                  </span>
                </div>
                <CampoDeTexto id={`titulo-${i}`} value={b.titulo} onChange={(e) => mudarBotao(i, { titulo: e.target.value })} />
                <label htmlFor={`link-${i}`} className="text-[12px] text-casca-texto">
                  {t("Link")}
                </label>
                <CampoDeTexto id={`link-${i}`} value={b.url} placeholder="https://" onChange={(e) => mudarBotao(i, { url: e.target.value })} />
                {linkRuim ? (
                  <p role="alert" className="text-[11px] text-casca-alerta">
                    {t("O link do botão começa com https://.")}
                  </p>
                ) : null}
                <button
                  type="button"
                  aria-label={t("Remover botão")}
                  onClick={() => mudar({ botoes: botoes.filter((_, j) => j !== i) })}
                  className="grid size-6 place-items-center self-end rounded-casca-gatilho text-casca-suave hover:bg-surface"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            disabled={botoes.length >= MAXIMO_DE_BOTOES}
            onClick={() => mudar({ botoes: [...botoes, { titulo: "", url: "" }] })}
            className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-casca-marca-forte hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar botão")}
          </button>
          {botoes.length > 0 ? (
            <p className="rounded-md bg-warning-bg p-2 text-[12px] text-warning-fg">
              {t("Se a pessoa não segue a conta, o Instagram pode recusar a mensagem com botão, e a resposta daquele comentário se perde.")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2" data-testid="anexo-do-passo">
          <p className="text-[13px] font-semibold text-casca-texto">{t("Anexo")}</p>
          {!noDirect ? (
            <p className="text-[11px] text-casca-suave">{t("No comentário, a primeira mensagem aceita só texto e botões (regra do Instagram).")}</p>
          ) : anexo ? (
            <div className="flex flex-col gap-2 rounded-lg bg-casca-raia p-3">
              <div className="flex items-center gap-2">
                <Paperclip size={14} className="shrink-0 text-casca-suave" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12px] text-casca-texto">{anexo.nome ?? anexo.url}</span>
                <button
                  type="button"
                  aria-label={t("Remover anexo")}
                  onClick={() => mudar({ anexo: null })}
                  className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-surface"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
              <SeletorDaCasca
                aria-label={t("Tipo do anexo")}
                aparencia="janela"
                valor={anexo.tipo}
                aoMudar={(v) => v && mudar({ anexo: { ...anexo, tipo: v } })}
                opcoes={TIPOS_DE_ANEXO.map((o) => ({ valor: o.valor, rotulo: t(o.rotulo) }))}
              />
              <CampoDeTexto
                aria-label={t("Endereço do anexo")}
                value={anexo.url}
                placeholder="https://"
                onChange={(e) => mudar({ anexo: { ...anexo, url: e.target.value, nome: e.target.value.split("/").pop() || null } })}
              />
              {anexo.url !== "" && !anexo.url.startsWith("https://") ? (
                <p role="alert" className="text-[11px] text-casca-alerta">
                  {t("O anexo precisa de um endereço https://.")}
                </p>
              ) : null}
              <p className="text-[11px] text-casca-suave">{t("O anexo vai numa segunda mensagem, logo depois do texto.")}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => mudar({ anexo: { tipo: "image", url: "", nome: null } })}
              className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-casca-marca-forte hover:underline"
            >
              <Plus size={14} aria-hidden />
              {t("Adicionar anexo")}
            </button>
          )}
        </div>
      </div>
    </PainelDoNo>
  );
}
