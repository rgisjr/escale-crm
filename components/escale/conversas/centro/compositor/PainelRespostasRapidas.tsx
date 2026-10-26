"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { JanelaRespostaRapida } from "@/components/escale/conversas/configuracoes/respostas/JanelaRespostaRapida";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useRespostasDaConversa } from "@/hooks/escale/useRespostasRapidas";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { comBarra, type RespostaLida } from "@/lib/escale/conversas/respostas";
import { interpolateTemplate, type TemplateContact } from "@/lib/inbox/template-vars";
import { usaTokensDaClint } from "@/lib/variaveis/resolver";
import { Search, Settings, X } from "@/lib/ui/icons-da-casca";

/**
 * RESPOSTAS RÁPIDAS (c09; C6; N12): os `message_templates` do original em
 * "Gerais" (compartilhadas) e "Minhas". O painel abre acima do compositor,
 * 600×384; lê as respostas do canal e do setor da conversa (3C, N14);
 * "+ Nova resposta" abre a janela "Criar Resposta rápida".
 */
export function PainelRespostasRapidas({
  aberto,
  aoFechar,
  termoInicial,
  contato,
  aoEscolher,
  conversationId,
}: {
  conversationId: string;
  aberto: boolean;
  aoFechar: () => void;
  termoInicial: string;
  contato: TemplateContact;
  aoEscolher: (texto: string) => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const [setorEscolhido, setSetorEscolhido] = useState<string>("");
  const { data } = useRespostasDaConversa(conversationId, setorEscolhido || null, aberto);
  const { data: setores = [] } = useSetores(aberto);
  const respostas: RespostaLida[] = useMemo(() => data?.respostas ?? [], [data]);
  const [busca, setBusca] = useState(termoInicial);
  const [ordem, setOrdem] = useState<"az" | "za">("az");
  const [nova, setNova] = useState(false);
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const bate = (r: RespostaLida) =>
      !termo || r.atalho.toLowerCase().includes(termo) || r.corpo.toLowerCase().includes(termo);
    const ordenar = (a: RespostaLida, b: RespostaLida) =>
      (ordem === "az" ? 1 : -1) * a.atalho.localeCompare(b.atalho, "pt-BR");
    return {
      gerais: respostas.filter((r) => r.compartilhada && bate(r)).sort(ordenar),
      minhas: respostas.filter((r) => r.dono === user.id && bate(r)).sort(ordenar),
    };
  }, [respostas, busca, ordem, user.id]);
  /**
   * Frente V: a resposta com variável da Clint (`[DEAL.STAGE]`…) é resolvida
   * no servidor, que conhece o negócio e a empresa do contato. Se a chamada
   * falhar, o texto segue pelo caminho local (o nome do contato) e o resto
   * fica literal, como sempre: o compositor barra o envio.
   */
  const escolher = async (corpo: string) => {
    const local = interpolateTemplate(corpo, contato);
    if (!usaTokensDaClint(corpo)) return aoEscolher(local);
    try {
      const r = await fetch("/api/v1/variaveis/resolver", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: corpo, conversation_id: conversationId }),
      });
      const json = (await r.json().catch(() => null)) as { data?: { texto?: string } } | null;
      const texto = r.ok ? json?.data?.texto : undefined;
      aoEscolher(texto !== undefined ? interpolateTemplate(texto, contato) : local);
    } catch {
      aoEscolher(local);
    }
  };
  if (!aberto) return null;
  const grupo = (titulo: string, itens: RespostaLida[]) =>
    itens.length === 0 ? null : (
      <div>
        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
          {titulo}
        </div>
        {itens.map((r) => (
          <button
            key={r.id}
            type="button"
            className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-casca-raia"
            onClick={() => void escolher(r.corpo)}
          >
            <span className="shrink-0 rounded-casca-gatilho bg-casca-raia px-1.5 py-0.5 font-mono text-[12px] text-casca-suave">
              {comBarra(r.atalho)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] text-casca-texto">{r.corpo}</span>
            </span>
          </button>
        ))}
      </div>
    );
  return (
    <div
      className="absolute right-4 bottom-full left-4 z-20 mb-2 flex h-[384px] max-w-[600px] flex-col rounded-casca-gatilho border border-casca-borda bg-white shadow-casca-painel"
      data-testid="respostas-rapidas"
    >
      <div className="flex h-12 items-center gap-2 border-b border-casca-borda px-4">
        <span className="flex-1 text-[15px] font-medium text-casca-texto">
          {t("Respostas rápidas")}
        </span>
        <Link
          href="/app/inbox/configuracoes/respostas-rapidas"
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          aria-label={t("Configurar respostas rápidas")}
          title={t("Configurar respostas rápidas")}
        >
          <Settings size={14} aria-hidden />
        </Link>
        <BotaoDaCasca variante="texto" tamanho="sm" onClick={() => setNova(true)}>
          + {t("Nova resposta")}
        </BotaoDaCasca>
        <button
          type="button"
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          aria-label={t("Fechar")}
          onClick={aoFechar}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-2">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-2">
          <Search size={14} aria-hidden className="text-casca-suave" />
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar")}
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-hidden placeholder:text-casca-meta"
          />
        </div>
        <SeletorDaCasca
          valor={setorEscolhido}
          vazio={t("Setor da conversa")}
          opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
          aoMudar={setSetorEscolhido}
          desabilitado={!data?.podeOutrosSetores}
          dica={
            data?.podeOutrosSetores ? undefined : t("Consultar respostas rápidas de outros setores")
          }
          aria-label={t("Setor")}
        />
        <SeletorDaCasca
          valor={ordem}
          opcoes={[
            { valor: "az", rotulo: `${t("Ordenar por")}: A-Z` },
            { valor: "za", rotulo: `${t("Ordenar por")}: Z-A` },
          ]}
          aoMudar={(v) => setOrdem(v === "za" ? "za" : "az")}
          aria-label={t("Ordenar")}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {grupo(t("Gerais"), grupos.gerais)}
        {grupo(t("Minhas"), grupos.minhas)}
        {grupos.gerais.length + grupos.minhas.length === 0 ? (
          <p className="px-4 py-6 text-center text-[14px] text-casca-suave">
            {t("Nenhuma resposta encontrada")}
          </p>
        ) : null}
      </div>
      <JanelaRespostaRapida aberta={nova} aoFechar={() => setNova(false)} resposta={null} />
    </div>
  );
}
