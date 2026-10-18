import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ContactsListClient } from "./_client";
// ── FORK ESCALE · Fase 2A: com a casca, a lista de contatos da Clint ──
import { ListaDeContatos } from "@/components/escale/contatos/ListaDeContatos";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contatos" };

export default async function ContactsPage() {
  // ── FORK ESCALE · Fase 2A ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    // FORK ESCALE · Fase 2B: tudo o que a página lê (origens, papel e as opções do filtro).
    const dados = await origensDaPagina();
    return <ListaDeContatos {...dados} />;
  }
  // ── fim FORK ESCALE ──
  return <ContactsListClient />;
}
