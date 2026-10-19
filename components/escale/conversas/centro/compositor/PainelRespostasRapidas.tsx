"use client";
import { useMemo, useState } from "react";

import { TemplateFormDialog } from "@/app/app/templates/_components/TemplateFormDialog";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useMessageTemplates, type MessageTemplate } from "@/hooks/inbox/useMessageTemplates";
import { interpolateTemplate, type TemplateContact } from "@/lib/inbox/template-vars";
import { Search, Settings, X } from "@/lib/ui/icons-da-casca";

/**
 * RESPOSTAS RÁPIDAS (c09; C6; N12): os `message_templates` do original em
 * "Gerais" (compartilhadas) e "Minhas". O painel abre acima do compositor,
 * 600×384; "+ Nova resposta" é o `TemplateFormDialog` do original. O filtro
 * por setor fica "Em breve" (3C).
 */
export function PainelRespostasRapidas({
  aberto,
  aoFechar,
  termoInicial,
  contato,
  aoEscolher,
}: {
  aberto: boolean;
  aoFechar: () => void;
  termoInicial: string;
  contato: TemplateContact;
  aoEscolher: (texto: string) => void;
}) {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const { data: respostas = [] } = useMessageTemplates();
  const [busca, setBusca] = useState(termoInicial);
  const [ordem, setOrdem] = useState<"az" | "za">("az");
  const [nova, setNova] = useState(false);
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const bate = (r: MessageTemplate) =>
      !termo ||
      r.title.toLowerCase().includes(termo) ||
      r.body.toLowerCase().includes(termo) ||
      (r.shortcut ?? "").toLowerCase().includes(termo);
    const ordenar = (a: MessageTemplate, b: MessageTemplate) =>
      (ordem === "az" ? 1 : -1) * a.title.localeCompare(b.title, "pt-BR");
    return {
      gerais: respostas.filter((r) => r.owner_user_id === null && bate(r)).sort(ordenar),
      minhas: respostas.filter((r) => r.owner_user_id === user.id && bate(r)).sort(ordenar),
    };
  }, [respostas, busca, ordem, user.id]);
  if (!aberto) return null;
  const grupo = (titulo: string, itens: MessageTemplate[]) =>
    itens.length === 0 ? null : (
      <div>
        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
          {titulo}
        </div>
        {itens.map((r) => (
          <button
            key={r.id}
            type="button"
            className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-casca-raia"
            onClick={() => aoEscolher(interpolateTemplate(r.body, contato))}
          >
            <span className="shrink-0 rounded-casca-gatilho bg-casca-raia px-1.5 py-0.5 font-mono text-[11px] text-casca-suave">
              /{r.shortcut ?? "—"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-casca-texto">{r.title}</span>
              <span className="block truncate text-[11px] text-casca-suave">{r.body}</span>
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
        <span className="flex-1 text-[13px] font-medium text-casca-texto">
          {t("Respostas rápidas")}
        </span>
        <a
          href="/app/templates"
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          aria-label={t("Configurar respostas rápidas")}
          title={t("Configurar respostas rápidas")}
        >
          <Settings size={14} aria-hidden />
        </a>
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
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta"
          />
        </div>
        <SeletorDaCasca
          valor="todos"
          opcoes={[{ valor: "todos", rotulo: t("Todos os setores") }]}
          aoMudar={() => undefined}
          desabilitado
          dica={t("Em breve")}
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
          <p className="px-4 py-6 text-center text-[12px] text-casca-suave">
            {t("Nenhuma resposta encontrada")}
          </p>
        ) : null}
      </div>
      <TemplateFormDialog
        open={nova}
        onOpenChange={setNova}
        canShare={activeOrg?.role !== "agent"}
      />
    </div>
  );
}
