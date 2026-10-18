"use client";
import type { SVGProps } from "react";

import type { TipoDeAtividade } from "@/lib/escale/playbook/regras";
import { InstagramLogo, WhatsappLogo } from "@/lib/ui/icons";
import { Calendar, Clipboard, Mail, Phone, Watch, type LucideIcon } from "@/lib/ui/icons-da-casca";

/**
 * O ÍCONE DE CADA TIPO DE ATIVIDADE (fork Escale, Fase 1I): os 7 botões da
 * Clint (`TextTab`). WhatsApp e Instagram são logos (o lucide não tem marcas)
 * e vêm do Phosphor do original, como no card do quadro (`PecasDoCard`).
 * Reunião é o relógio de pulso (FiWatch, no código da Clint).
 */
const ICONES: Record<Exclude<TipoDeAtividade, "whatsapp" | "instagram">, LucideIcon> = {
  ligacao: Phone,
  email: Mail,
  agendamento: Calendar,
  tarefa: Clipboard,
  reuniao: Watch,
};

export function IconeDoTipo({
  tipo,
  tamanho = 16,
  className,
}: {
  tipo: TipoDeAtividade;
  tamanho?: number;
  className?: string;
}) {
  if (tipo === "whatsapp") return <WhatsappLogo size={tamanho} aria-hidden className={className} />;
  if (tipo === "instagram")
    return <InstagramLogo size={tamanho} aria-hidden className={className} />;
  const Icone = ICONES[tipo];
  return <Icone size={tamanho} aria-hidden className={className} />;
}

/** O celular cortado da Clint (Tabler device-mobile-off), traço 2: não há dispositivo para enviar. */
export function CelularDesligado({
  tamanho = 20,
  ...props
}: { tamanho?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M7.159 3.185c.256 -.119 .54 -.185 .841 -.185h8a2 2 0 0 1 2 2v9m0 4v1a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-13" />
      <path d="M11 4h2" />
      <path d="M3 3l18 18" />
      <path d="M12 17v.01" />
    </svg>
  );
}
