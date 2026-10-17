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
    const { origens, papel } = await origensDaPagina();
    return <ListaDeContatos origens={origens} papel={papel} />;
  }
  // ── fim FORK ESCALE ──
  return <ContactsListClient />;
}
