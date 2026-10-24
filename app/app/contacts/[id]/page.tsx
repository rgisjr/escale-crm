import { notFound, redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { paineisDaEntidade } from "@/lib/modulos/dados/paineis";
import { createClient } from "@/lib/supabase/server";
import { ContactDetailClient } from "./_client";
// ── FORK ESCALE · Fase 2E: com a casca, o contato abre por cima da lista ──
import { cookies } from "next/headers";
import { ListaDeContatos } from "@/components/escale/contatos/ListaDeContatos";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const { id } = await params;
  const supabase = await createClient();
  // Filtra a org ATIVA, não só a RLS: para quem é membro de duas organizações a
  // policy deixa passar as duas, e a tela abriria o contato da org que não está
  // selecionada — com o dossiê do cliente carregando vazio por baixo.
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, organization_id")
    .eq("organization_id", activeOrg.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!contact) notFound();
  // ── FORK ESCALE · Fase 2E (Q1, N2, N3): com a casca, o contato abre por cima da lista; a página do original fica em ?pagina=completa ──
  const { pagina } = await searchParams;
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo" && pagina !== "completa") {
    return <ListaDeContatos {...(await origensDaPagina())} />;
  }
  // ── fim FORK ESCALE ──
  // Resolvido no servidor: a lista de painéis de módulo não precisa de rota pública própria, e a
  // função nunca lança — ficha de contato é jornada do NÚCLEO, e não depende de extensão (nn.1).
  // A organização vem da SESSÃO (`resolveActiveOrg`, acima), nunca da URL: é ela que decide se
  // esta empresa chega a saber que o módulo existe. Ver o cabeçalho de `paineisDaEntidade`.
  const paineisDeModulo = await paineisDaEntidade("contato", activeOrg.orgId);
  return <ContactDetailClient contactId={id} paineisDeModulo={paineisDeModulo} />;
}
