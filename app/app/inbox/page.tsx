import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";
import { lerRascunho, type AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
// ── FORK ESCALE · Fase 3A: com a casca, a tela de Conversas da Clint ──
import { ConversasDaCasca } from "@/components/escale/conversas/ConversasDaCasca";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; rascunho?: string }>;
}) {
  const user = await loadAuthUser();
  if (!user) redirect("/login");
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) {
    const idioma = user.idioma;
    // As duas saídas que a frase anterior oferecia — "aceite um convite" e
    // "contate o admin" — não existem para quem INSTALOU o sistema: não há
    // convite e o admin é ele. Este é o estado terminal do primeiro acesso que
    // falhou, e o link é a única porta para fora dele.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <p>
          {traduzir(
            "Você não tem nenhuma organização ativa. Configure sua organização ou aceite um convite.",
            idioma,
          )}
        </p>
        <Link className="text-primary underline underline-offset-4" href="/get-started">
          {traduzir("Configurar minha organização", idioma)}
        </Link>
      </div>
    );
  }
  const { id, rascunho } = await searchParams;
  // ?rascunho= é a ponta da caixa de entrada da issue #1611: o texto mora no
  // servidor, e a URL só carrega o ID. Aqui a leitura acontece com a SESSÃO do
  // atendente (RLS), então um rascunho de outra organização vira
  // "não encontrado" por construção. Os três recusos (outra conversa, já usado,
  // vencido) viram aviso — a issue pede a conversa abrindo "sem texto e com
  // aviso", e silenciar faria o atendente achar que o texto nunca existiu.
  let avisoDeRascunho: AvisoDeRascunho | null = null;
  if (rascunho && id) {
    const db = await createClient();
    avisoDeRascunho = {
      conversationId: id,
      leitura: await lerRascunho(db, {
        organizationId: activeOrg.orgId,
        conversationId: id,
        draftId: rascunho,
      }),
    };
  }
  // FORK ESCALE · Fase 3A: com a casca ligada, a tela de Conversas da Clint;
  // sem ela, o Inbox original, intacto (o mesmo encaixe de /app/contacts).
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    // FORK ESCALE · Fase 3D: as origens, etapas e motivos do painel de filtros.
    const { origens, opcoesDoFiltro } = await origensDaPagina();
    return (
      <ConversasDaCasca
        initialSelectedId={id ?? null}
        rascunho={avisoDeRascunho}
        origens={origens}
        opcoesDoFiltro={opcoesDoFiltro}
      />
    );
  }
  return <InboxLayout initialSelectedId={id ?? null} rascunho={avisoDeRascunho} />;
}
