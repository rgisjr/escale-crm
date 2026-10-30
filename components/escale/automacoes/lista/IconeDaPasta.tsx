import { corDoIconeDaPasta, type IconeDaPasta as Icone } from "@/lib/escale/automacoes/pastas";
import { Bell, Calendar, Flag, Folder, Send, ShoppingCart, Star, Tag } from "@/lib/ui/icons-da-casca";

const ICONES = {
  folder: Folder,
  tag: Tag,
  star: Star,
  bell: Bell,
  send: Send,
  cart: ShoppingCart,
  calendar: Calendar,
  flag: Flag,
} as const satisfies Record<Icone, typeof Folder>;

/** O ícone da pasta pintado na cor dela (cinza vira o cinza do texto). */
export function IconeDaPasta({ icone, cor, tamanho = 14 }: { icone: Icone; cor: string; tamanho?: number }) {
  const Componente = ICONES[icone] ?? Folder;
  return <Componente size={tamanho} aria-hidden style={{ color: corDoIconeDaPasta(cor) }} />;
}

/** O ícone dentro do botão do editor (sem pintar com a cor da pasta). */
export function IconeDoSeletor({ icone, tamanho = 13 }: { icone: Icone; tamanho?: number }) {
  const Componente = ICONES[icone] ?? Folder;
  return <Componente size={tamanho} aria-hidden />;
}
