"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fotoDoContato } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A FOTO DO CONTATO NA FICHA (fork Escale, Fase 1G): redonda, como na Clint.
 * 32px no cabeçalho, 20px embaixo da etapa atual do trilho e 40px na lista de
 * conversas (prints 01 e 05). Sem foto, a silhueta cinza do card da casca.
 */
const TAMANHO = { cabecalho: "size-8", trilho: "size-5", conversa: "size-10" } as const;

export function FotoDaFicha({
  lead,
  tamanho = "cabecalho",
}: {
  lead: Lead;
  tamanho?: keyof typeof TAMANHO;
}) {
  const url = fotoDoContato(lead);
  const silhueta = (
    <span
      aria-hidden
      className={cn(
        "grid place-items-center rounded-full bg-casca-cinza-selo text-white",
        TAMANHO[tamanho],
      )}
    >
      <User size={tamanho === "trilho" ? 12 : 16} />
    </span>
  );
  if (!url) return silhueta;
  return (
    <Avatar className={cn("shrink-0 rounded-full", TAMANHO[tamanho])}>
      <AvatarImage src={url} alt="" className="object-cover" />
      <AvatarFallback className="rounded-full bg-transparent">{silhueta}</AvatarFallback>
    </Avatar>
  );
}
