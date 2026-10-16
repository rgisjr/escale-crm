import { corDoIconeNaCasca } from "@/lib/escale/origens/cores-da-casca";
import { corEfetiva, iniciais, type GrupoDeFunis, type IconeDeGrupo } from "@/lib/escale/origens/regras";
import { Building2, Funnel, Megaphone, Phone, Store, Users } from "@/lib/ui/icons-da-casca";

const DESENHO: Record<Exclude<IconeDeGrupo, "iniciais">, typeof Funnel> = {
  funil: Funnel,
  pessoas: Users,
  predio: Building2,
  loja: Store,
  megafone: Megaphone,
  telefone: Phone,
};

/**
 * O quadradinho do grupo no painel, como na Clint (01-010, 01-032):
 * - 20×20, raio 4;
 * - as iniciais brancas 8px/600 ou um traço branco de 12px (a Clint usa Feather);
 * - o fundo é a cor da Clint que corresponde ao tom gravado (`corDoIconeNaCasca`).
 *
 * O tom vem de Customizar ou da cor automática. A Clint pinta as iniciais de
 * branco em qualquer fundo, inclusive no amarelo; o quadrado é decorativo
 * (`aria-hidden`), e o nome do grupo está escrito ao lado.
 */
export function IconeDoGrupo({ grupo }: { grupo: Pick<GrupoDeFunis, "id" | "name" | "color" | "icon"> }) {
  const Desenho = grupo.icon === "iniciais" ? null : DESENHO[grupo.icon];
  return (
    <span
      aria-hidden
      data-icone-do-grupo=""
      className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[8px] leading-none font-semibold text-white"
      style={{ backgroundColor: corDoIconeNaCasca(corEfetiva(grupo)) }}
    >
      {Desenho ? <Desenho size={12} strokeWidth={2} /> : iniciais(grupo.name)}
    </span>
  );
}
