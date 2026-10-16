"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ContadorDaFilaDaCasca } from "@/components/escale/menu/ContadorDaFilaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { MessageCircleMore, X } from "@/lib/ui/icons-da-casca";

interface ConversaResumo {
  id: string;
  last_message_preview: string | null;
  unread_count_for_assignee: number | null;
  contacts: { display_name: string | null; name: string | null } | null;
}

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
            className="absolute -right-1.5 -top-px h-[18px] min-w-[18px] px-1 text-[10px] font-semibold ring-2 ring-white"
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
 * A moldura do painel da Clint (01-025, variante lateral): ~400px, cantos
 * arredondados, sombra e cabeçalho lilás com "Conversas" e um balão. A busca,
 * o "Todos" e a ordenação da Clint não entram: o painel da variante superior é
 * print que falta, e o conteúdo continua o de antes.
 */
function PainelDeConversas() {
  const t = useT();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["escale", "conversas-recentes"],
    queryFn: async () =>
      (await apiClient.get<{ data: ConversaResumo[] }>("/api/v1/conversations?limit=5&exclude_finished=true")).data,
    staleTime: 15_000,
  });
  return (
    <div
      role="dialog"
      aria-label={t("Conversas recentes")}
      className="absolute bottom-[62px] right-0 w-[400px] overflow-hidden rounded-[13px] border border-casca-borda bg-surface"
      style={{ boxShadow: "var(--shadow-casca-painel)" }}
    >
      <div className="flex items-center justify-between bg-casca-marca-suave px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-casca-texto">
          {t("Conversas")}
          <MessageCircleMore size={16} aria-hidden className="text-casca-marca" />
        </h2>
        <Link href="/app/inbox" className="text-xs text-casca-marca hover:underline">
          {t("Abrir Conversas")}
        </Link>
      </div>
      {isLoading ? (
        <p className="px-4 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
      ) : isError ? (
        <p className="px-4 py-6 text-xs text-casca-suave">{t("Não consegui carregar as conversas.")}</p>
      ) : !data || data.length === 0 ? (
        <p className="px-4 py-6 text-xs text-casca-suave">{t("Nenhuma conversa ainda.")}</p>
      ) : (
        <ul>
          {data.map((c) => {
            const naoLidas = c.unread_count_for_assignee ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/app/inbox/${c.id}`}
                  className="flex items-start gap-3 border-b border-casca-borda px-4 py-3 last:border-b-0 hover:bg-casca-raia"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-casca-texto">
                      {rotuloDoContato(c.contacts, t)}
                    </span>
                    <span className="block truncate text-xs text-casca-suave">
                      {c.last_message_preview || t("Sem mensagem")}
                    </span>
                  </span>
                  {naoLidas > 0 && (
                    <span className="rounded-sm bg-casca-novo px-1.5 text-[11px] font-semibold text-white tabular-nums">
                      {naoLidas}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
