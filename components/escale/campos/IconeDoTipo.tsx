import type { ReactNode } from "react";

import type { TipoDoMotor } from "@/lib/escale/campos/regras";
import { AlignLeft, Calendar, CalendarClock, Coins, Hash, Link2, List, ListChecks, Mail, Phone, ToggleLeft, Type } from "@/lib/ui/icons-da-casca";

const ICONES: Record<TipoDoMotor, (p: { size: number }) => ReactNode> = {
  text: (p) => <Type {...p} />,
  textarea: (p) => <AlignLeft {...p} />,
  number: (p) => <Hash {...p} />,
  currency: (p) => <Coins {...p} />,
  phone: (p) => <Phone {...p} />,
  select: (p) => <List {...p} />,
  multiselect: (p) => <ListChecks {...p} />,
  date: (p) => <Calendar {...p} />,
  datetime: (p) => <CalendarClock {...p} />,
  boolean: (p) => <ToggleLeft {...p} />,
  email: (p) => <Mail {...p} />,
  url: (p) => <Link2 {...p} />,
};

/** O ícone de cada tipo de campo (os da Clint, lucide). */
export function IconeDoTipo({ tipo, tamanho = 15 }: { tipo: TipoDoMotor; tamanho?: number }) {
  return <span className="inline-flex text-casca-marca">{ICONES[tipo]({ size: tamanho })}</span>;
}
