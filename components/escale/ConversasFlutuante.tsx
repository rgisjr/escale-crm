"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ContadorDaFila } from "@/components/shell/ContadorDaFila";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { ChatCircle } from "@/lib/ui/icons";

interface ConversaResumo {
  id: string;
  last_message_preview: string | null;
  unread_count_for_assignee: number | null;
  contacts: { display_name: string | null; name: string | null } | null;
}

/**
 * Botão flutuante (canto inferior direito, md+) com as 5 conversas mais recentes,
 * como o da Clint. Só busca quando abre. Não aparece dentro de Conversas.
 * `reservaDoRodape` vem do AppShell (painel de chamada etc.) para não ficar por baixo.
 */
export function ConversasFlutuante({ reservaDoRodape }: { reservaDoRodape: number }) {
  const t = useT();
  const pathname = usePathname() ?? "/app";
  // Aberto "nesta tela": trocar de tela fecha sem setState dentro de useEffect.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const ancora = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["escale", "conversas-recentes"],
    queryFn: async () =>
      (await apiClient.get<{ data: ConversaResumo[] }>("/api/v1/conversations?limit=5&exclude_finished=true")).data,
    enabled: aberto,
    staleTime: 15_000,
  });

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
      className="fixed right-4 z-40 hidden md:block"
      style={{ bottom: `calc(1rem + ${reservaDoRodape}px)` }}
    >
      {aberto && (
        <div
          role="dialog"
          aria-label={t("Conversas recentes")}
          className="absolute bottom-16 right-0 w-80 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{t("Conversas recentes")}</h2>
            <Link href="/app/inbox" className="text-sm text-primary hover:underline">
              {t("Abrir Conversas")}
            </Link>
          </div>
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t("Carregando…")}</p>
          ) : isError ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t("Não consegui carregar as conversas.")}</p>
          ) : !data || data.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t("Nenhuma conversa ainda.")}</p>
          ) : (
            <ul>
              {data.map((c) => {
                const naoLidas = c.unread_count_for_assignee ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/app/inbox/${c.id}`}
                      className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent-soft"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {c.contacts?.display_name || c.contacts?.name || t("Sem nome")}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {c.last_message_preview || t("Sem mensagem")}
                        </span>
                      </span>
                      {naoLidas > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
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
      )}
      <button
        type="button"
        aria-label={t("Conversas recentes")}
        aria-expanded={aberto}
        onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
        className="relative grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-accent-hover"
      >
        <ChatCircle size={22} aria-hidden />
        <span className="absolute -right-1 -top-1">
          <ContadorDaFila compacto={false} />
        </span>
      </button>
    </div>
  );
}
