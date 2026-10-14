import { corEfetiva, iniciais, type GrupoDeFunis, type IconeDeGrupo } from "@/lib/escale/origens/regras";
import { estiloDoChip } from "@/lib/tags/cor-da-etiqueta";
import { Buildings, Funnel, Megaphone, Phone, Storefront, Users } from "@/lib/ui/icons";

const DESENHO: Record<Exclude<IconeDeGrupo, "iniciais">, typeof Funnel> = {
  funil: Funnel,
  pessoas: Users,
  predio: Buildings,
  loja: Storefront,
  megafone: Megaphone,
  telefone: Phone,
};

/**
 * O quadradinho do grupo no painel: a cor escolhida em Customizar (ou a
 * automática) e o ícone (ou as iniciais). `estiloDoChip` escolhe a frente
 * legível sobre o fundo.
 */
export function IconeDoGrupo({ grupo }: { grupo: Pick<GrupoDeFunis, "id" | "name" | "color" | "icon"> }) {
  const Desenho = grupo.icon === "iniciais" ? null : DESENHO[grupo.icon];
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
      style={estiloDoChip(corEfetiva(grupo))}
    >
      {Desenho ? <Desenho size={13} weight="bold" /> : iniciais(grupo.name)}
    </span>
  );
}
