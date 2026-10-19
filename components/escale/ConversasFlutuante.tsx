"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConversaEmbutida } from "@/components/escale/conversas/ConversaEmbutida";
import { FotoDaConversa } from "@/components/escale/conversas/fila/FotoDaConversa";
import { LinhaDaFila } from "@/components/escale/conversas/fila/LinhaDaFila";
import { MenuDeOrdem } from "@/components/escale/conversas/fila/MenuDeOrdem";
import { MenuDePresets } from "@/components/escale/conversas/fila/MenuDePresets";
import { ContadorDaFilaDaCasca } from "@/components/escale/menu/ContadorDaFilaDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useFilaDeConversas } from "@/hooks/escale/useFilaDeConversas";
import { usePreferenciasDeConversas } from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
import type { Ordem } from "@/lib/escale/conversas/ordem";
import { buscaValeConsulta } from "@/lib/inbox/termo-de-busca";
import { ChevronLeft, ExternalLink, MessageCircleMore, Search, X } from "@/lib/ui/icons-da-casca";

/**
 * Medidas da Clint (01-001…01-011, ÷ 1,25; janela de 1536px): círculo de 50px,
 * a 30px da direita e 36px da base. A posição vai por `style`, nunca por
 * `fixed bottom-N` na classe (cerca `rodape-ocupado-contrato`): a reserva do
 * rodapé (painel de chamada etc.) entra somada.
 */
const DIREITA = 30;
const BASE = 36;

/**
 * O degradê da Clint (`#D1A8F5` → `#8B5CFF`) refeito com a cor da marca: 35% e
 * 80% da marca sobre o branco. Com o roxo da Clint (`#6C19DE`), isso dá
 * `#CCAFF3` → `#8947E4`.
 */
const DEGRADE_DA_MARCA =
  "linear-gradient(180deg, color-mix(in srgb, var(--color-casca-marca) 35%, white), color-mix(in srgb, var(--color-casca-marca) 80%, white))";

/**
 * Botão flutuante (canto inferior direito, md+) com as 5 conversas mais recentes,
 * como o da Clint. Só busca quando abre. Não aparece dentro de Conversas.
 * `reservaDoRodape` vem do AppShell para o botão não ficar por baixo de peça fixa.
 */
export function ConversasFlutuante({ reservaDoRodape }: { reservaDoRodape: number }) {
  const t = useT();
  const pathname = usePathname() ?? "/app";
  // Aberto "nesta tela": trocar de tela fecha sem setState dentro de useEffect.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const ancora = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (ancora.current && !ancora.current.contains(e.target as Node)) setAbertoEm(null);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbertoEm(null);
    };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  if (pathname === "/app/inbox" || pathname.startsWith("/app/inbox/")) return null;

  return (
    <div
      ref={ancora}
      className="fixed z-40 hidden md:block"
      style={{ right: DIREITA, bottom: BASE + reservaDoRodape }}
    >
      {aberto && <PainelDeConversas />}
      <button
        type="button"
        aria-label={t("Conversas recentes")}
        aria-expanded={aberto}
        data-testid="botao-de-conversas"
        data-aberto={aberto ? "" : undefined}
        onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
        className="relative grid size-[50px] place-items-center rounded-full text-white transition-[filter] hover:brightness-105"
        style={{ background: aberto ? "var(--color-casca-marca)" : DEGRADE_DA_MARCA }}
      >
        {aberto ? <X size={22} aria-hidden /> : <BalaoComPontos />}
        {!aberto && (
          <ContadorDaFilaDaCasca
            limite={9}
            className="absolute -top-px -right-1.5 h-[18px] min-w-[18px] px-1 text-[10px] font-semibold ring-2 ring-white"
          />
        )}
      </button>
    </div>
  );
}

/** O balão branco com três pontos na cor da marca (crops/fab.png). */
function BalaoComPontos() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3C6.5 3 2 6.9 2 11.7c0 2.6 1.3 4.9 3.4 6.5L4.6 21.5l4-1.9c1.1.3 2.2.5 3.4.5 5.5 0 10-3.9 10-8.4S17.5 3 12 3Z"
        fill="white"
      />
      <circle cx="7.8" cy="11.7" r="1.3" fill="var(--color-casca-marca)" />
      <circle cx="12" cy="11.7" r="1.3" fill="var(--color-casca-marca)" />
      <circle cx="16.2" cy="11.7" r="1.3" fill="var(--color-casca-marca)" />
    </svg>
  );
}

/**
 * O PAINEL FLUTUANTE DE CONVERSAS (fork Escale, Fases 0 e 3E; 01-025; F3, N12):
 * a mini-fila da Clint (busca, presets, ordem e as linhas, com o tempo real da
 * fila) e a conversa aberta DENTRO do painel (provisório: o print falta).
 */
export function PainelDeConversas() {
  const t = useT();
  const router = useRouter();
  const { activeOrg } = useAuth();
  const [busca, setBusca] = useState("");
  const [painel, setPainel] = useState<FiltrosDoPainel>({});
  const [ordem, setOrdem] = useState<Ordem>("interacao");
  const [aberta, setAberta] = useState<ConversationWithContact | null>(null);
  const preferencias = usePreferenciasDeConversas();
  const consulta = useMemo(
    () => ({ painel, ordem, ...(buscaValeConsulta(busca) ? { busca } : {}) }),
    [painel, ordem, busca],
  );
  const fila = useFilaDeConversas(consulta, activeOrg?.orgId ?? null);
  const itens = (fila.data?.pages.flatMap((p) => p.data) ?? []) as ConversationWithContact[];
  const [agora] = useState(() => new Date());

  return (
    <div
      role="dialog"
      aria-label={t("Conversas recentes")}
      className="absolute right-0 bottom-[62px] flex h-[min(570px,calc(100vh-140px))] w-[400px] flex-col overflow-hidden rounded-[13px] border border-casca-borda bg-surface"
      style={{ boxShadow: "var(--shadow-casca-painel)" }}
    >
      {aberta ? (
        <>
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-casca-borda px-3">
            <button
              type="button"
              aria-label={t("Voltar")}
              onClick={() => setAberta(null)}
              className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <FotoDaConversa conversa={aberta} tamanho="secao" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-casca-texto">
              {rotuloDoContato(aberta.contacts ?? null, t)}
            </span>
            <Link
              href={`/app/inbox?id=${aberta.id}`}
              className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-casca-marca hover:underline"
            >
              {t("Abrir em Conversas")}
              <ExternalLink size={12} aria-hidden />
            </Link>
          </div>
          <div className="min-h-0 flex-1">
            <ConversaEmbutida conversationId={aberta.id} compacta />
          </div>
        </>
      ) : (
        <>
          <div className="flex h-[52px] shrink-0 items-center gap-2 bg-casca-marca-suave px-4">
            <h2 className="text-[15px] font-medium text-casca-texto">{t("Conversas")}</h2>
            <MessageCircleMore size={16} aria-hidden className="text-casca-marca" />
          </div>
          <div className="shrink-0 px-3 pt-3">
            <label className="relative block">
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Pesquisar")}
                aria-label={t("Pesquisar")}
                className="h-9 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto placeholder:text-casca-meta"
              />
              <Search
                size={16}
                aria-hidden
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
              />
            </label>
            <div className="flex h-10 items-center justify-between">
              <MenuDePresets
                painel={painel}
                aoMudarPainel={setPainel}
                aoCriarFiltro={() => router.push("/app/inbox")}
                temGrupos={false}
              />
              <MenuDeOrdem ordem={ordem} aoMudar={setOrdem} />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {fila.isLoading ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
            ) : fila.isError ? (
              <p className="px-4 py-6 text-xs text-casca-suave">
                {t("Não consegui carregar as conversas.")}
              </p>
            ) : itens.length === 0 ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Nenhuma conversa ainda.")}</p>
            ) : (
              itens.map((c) => (
                <LinhaDaFila
                  key={c.id}
                  conversa={c}
                  selecionada={false}
                  aoSelecionar={() => setAberta(c)}
                  visualizacao={preferencias.data.visualizacao}
                  agora={agora}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
