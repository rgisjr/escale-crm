"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useModelosDeMensagem, type ModeloAprovado } from "@/hooks/escale/useModelosDeMensagem";
import { useT } from "@/hooks/i18n/useT";
import { useSendMessage } from "@/hooks/inbox/useSendMessage";
import { renderTemplatePreview } from "@/lib/channels/meta/render-template";
import { lerConteudo } from "@/lib/channels/template-conteudo";
import type { TemplateContact } from "@/lib/inbox/template-vars";
import { Check, RotateCcw, Search, Settings, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * MODELOS DE MENSAGEM (c10, c63; C7; N11): a janela de 770px com a lista à
 * esquerda ("Usados recentemente" + "Todos os modelos") e a prévia à direita.
 * As definições vêm da mesma rota que a `JanelaFechadaAviso` do original lê;
 * o envio é o mesmo `useSendMessage` com `type: "template"`. "Com Flow",
 * "Todas as pastas" e ⚙ ficam "Em breve".
 */
export function JanelaModelosDeMensagem({
  aberta,
  aoFechar,
  conversationId,
  provider,
  contato,
}: {
  aberta: boolean;
  aoFechar: () => void;
  conversationId: string;
  provider: string | null | undefined;
  contato: TemplateContact;
}) {
  const t = useT();
  const { modelos, carregando, recarregar, recentes, marcarUsado } = useModelosDeMensagem(provider, aberta);
  const enviar = useSendMessage();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const categorias = useMemo(
    () => [...new Set(modelos.map((m) => m.category).filter((c): c is string => !!c))],
    [modelos],
  );
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return modelos.filter(
      (m) =>
        (!termo || m.name.toLowerCase().includes(termo)) &&
        (categoria === "todas" || m.category === categoria),
    );
  }, [modelos, busca, categoria]);
  const atual = modelos.find((m) => m.name === escolhido) ?? null;
  const slots = atual?.slots ?? [];
  const faltando = slots.filter((s) => !(valores[s.valueKey] ?? "").trim());
  const previa = atual
    ? renderTemplatePreview(atual.components ?? [], valores, {
        name: atual.name,
        language: atual.language,
      })
    : null;

  const escolher = (m: ModeloAprovado) => {
    setEscolhido(m.name);
    setValores({ ...(m.savedValues ?? {}) });
  };
  const enviarModelo = () => {
    if (!atual || faltando.length > 0) return;
    enviar.mutate(
      {
        conversation_id: conversationId,
        type: "template",
        body: lerConteudo(atual.components ?? []).body?.trim() || atual.name,
        template_name: atual.name,
        template_language: atual.language,
        template_values: valores,
      },
      {
        onSuccess: () => {
          marcarUsado(atual.name);
          toast.success(t("Modelo enviado."));
          aoFechar();
        },
      },
    );
  };
  const lista = (titulo: string, itens: ModeloAprovado[]) =>
    itens.length === 0 ? null : (
      <div>
        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
          {titulo}
        </div>
        {itens.map((m) => (
          <button
            key={m.name}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2 text-left text-[12px] text-casca-texto hover:bg-casca-raia",
              escolhido === m.name && "bg-casca-marca-suave",
            )}
            onClick={() => escolher(m)}
          >
            <span className="min-w-0 flex-1 truncate">{m.name}</span>
            <span className="text-[10px] text-casca-suave">{m.language}</span>
            {escolhido === m.name ? (
              <Check size={14} aria-hidden className="text-casca-marca" />
            ) : null}
          </button>
        ))}
      </div>
    );

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[770px] p-0">
      <div className="flex h-14 items-center gap-2 border-b border-casca-borda px-4">
        <span className="text-[13px] font-medium text-casca-texto">{t("Modelos de mensagem")}</span>
        <AjudaDaCasca
          texto={t(
            "Modelos aprovados pela Meta para iniciar ou retomar uma conversa fora da janela de 24h.",
          )}
        />
        <span className="flex-1" />
        <button
          type="button"
          disabled
          title={t("Em breve")}
          aria-label={t("Configurar modelos")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave disabled:opacity-40"
        >
          <Settings size={16} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("Recarregar modelos")}
          title={t("Recarregar")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          onClick={recarregar}
        >
          <RotateCcw size={16} aria-hidden />
        </button>
        <a href="/app/settings/canal-oficial" target="_blank" rel="noreferrer">
          <BotaoDaCasca variante="marca" tamanho="sm">
            + {t("Novo modelo")}
          </BotaoDaCasca>
        </a>
        <button
          type="button"
          aria-label={t("Fechar")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          onClick={aoFechar}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="flex h-[480px]">
        <div className="flex w-[300px] flex-col border-r border-casca-borda">
          <div className="flex flex-col gap-2 border-b border-casca-borda p-3">
            <div className="flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-2">
              <Search size={14} aria-hidden className="text-casca-suave" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Pesquisar por…")}
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta"
              />
            </div>
            <div className="flex gap-2">
              <SeletorDaCasca
                valor={categoria}
                opcoes={[
                  { valor: "todas", rotulo: t("Todas as categorias") },
                  ...categorias.map((c) => ({ valor: c, rotulo: c })),
                ]}
                aoMudar={setCategoria}
                aria-label={t("Categoria")}
              />
              <SeletorDaCasca
                valor="todas"
                opcoes={[{ valor: "todas", rotulo: t("Todas as pastas") }]}
                aoMudar={() => undefined}
                desabilitado
                dica={t("Em breve")}
                aria-label={t("Pasta")}
              />
            </div>
            <label
              className="flex items-center gap-2 text-[12px] text-casca-suave"
              title={t("Em breve")}
            >
              <input type="checkbox" disabled /> {t("Com Flow")}
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {carregando ? (
              <p className="px-4 py-6 text-center text-[12px] text-casca-suave">
                {t("Carregando…")}
              </p>
            ) : null}
            {lista(
              t("Usados recentemente"),
              filtrados.filter((m) => recentes.includes(m.name)),
            )}
            {lista(t("Todos os modelos"), filtrados)}
            {!carregando && filtrados.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-casca-suave">
                {t("Nenhum modelo encontrado")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col bg-casca-painel-chat">
          {!atual ? (
            <p className="m-auto max-w-[280px] text-center text-[12px] text-casca-suave">
              {t("Selecione um modelo de mensagem à sua esquerda para visualizar o conteúdo.")}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-casca-borda bg-white px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-casca-texto">
                  {atual.name}
                </span>
                <span className="rounded-full bg-casca-fixada px-2 py-0.5 text-[10px] font-medium text-casca-espiao-texto">
                  {t("Aprovado")}
                </span>
                <a
                  href="/app/settings/canal-oficial"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-medium text-casca-marca"
                >
                  {t("Editar modelo")}
                </a>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="max-w-[360px] rounded-lg rounded-tr-none border border-casca-borda-msg bg-casca-caixa-msg px-3 py-2 text-[13px] text-casca-texto">
                  {previa?.cabecalho ? (
                    <div className="mb-1 font-semibold">{previa.cabecalho}</div>
                  ) : null}
                  <p className="whitespace-pre-wrap">{previa?.corpo ?? ""}</p>
                  {previa?.rodape ? (
                    <div className="mt-1 text-[11px] text-casca-suave">{previa.rodape}</div>
                  ) : null}
                  {(previa?.botoes ?? []).map((b, i) => (
                    <div
                      key={i}
                      className="mt-1 border-t border-casca-borda-msg pt-1 text-center text-[12px] font-medium text-casca-marca"
                    >
                      {b.texto}
                    </div>
                  ))}
                </div>
                {slots.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="text-[11px] font-medium text-casca-suave">
                      {t("Preencha os campos do modelo")}
                    </div>
                    {slots.map((s) => (
                      <label
                        key={s.valueKey}
                        className="flex flex-col gap-1 text-[11px] text-casca-suave"
                      >
                        {`${s.onde} — {{${s.key}}}`}
                        <input
                          value={valores[s.valueKey] ?? ""}
                          onChange={(e) => setValores({ ...valores, [s.valueKey]: e.target.value })}
                          className="h-8 rounded-casca-gatilho border border-casca-borda bg-white px-2 text-[12px] text-casca-texto outline-hidden"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-casca-borda bg-white px-4 py-3">
                <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoFechar}>
                  {t("Cancelar")}
                </BotaoDaCasca>
                <BotaoDaCasca
                  variante="marca"
                  tamanho="sm"
                  disabled={faltando.length > 0 || enviar.isPending}
                  onClick={enviarModelo}
                >
                  {t("Enviar")}
                </BotaoDaCasca>
              </div>
            </>
          )}
        </div>
      </div>
    </JanelaDaCasca>
  );
}
