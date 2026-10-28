import type { ComponentType } from "react";

import {
  ICONE_PADRAO,
  SEM_ICONE,
  corDoPainel,
  iniciaisDoPainel,
  type IconeDoPainel,
} from "@/lib/escale/indicadores/paineis/aparencia";
import {
  Award,
  BatteryCharging,
  Bell,
  Book,
  Bookmark,
  Briefcase,
  Calendar,
  Camera,
  Cast,
  ChartNoAxesColumn,
  CircleAlert,
  Clock,
  Coffee,
  Compass,
  Download,
  FacebookLogo,
  Film,
  Gift,
  GitBranch,
  Globe,
  Heart,
  InstagramLogo,
  Layers,
  LinkedinLogo,
  Mail,
  Map,
  Mic,
  Monitor,
  Music,
  PenTool,
  Phone,
  Search,
  Settings,
  ShoppingCart,
  Smile,
  Star,
  ThumbsUp,
  Upload,
  User,
  Wifi,
  Wrench,
  YoutubeLogo,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Desenho = ComponentType<{ size?: number; strokeWidth?: number; weight?: "regular"; "aria-hidden"?: boolean }>;

/** Chave gravada → ícone (molde `IconeDoGrupo`). Os 4 logos são Phosphor (o Lucide 1.x tirou as marcas). */
export const DESENHO_DO_ICONE: Record<Exclude<IconeDoPainel, typeof SEM_ICONE>, Desenho> = {
  bookmark: Bookmark,
  heart: Heart,
  star: Star,
  user: User,
  "shopping-cart": ShoppingCart,
  clock: Clock,
  settings: Settings,
  map: Map,
  camera: Camera,
  music: Music,
  film: Film,
  book: Book,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  monitor: Monitor,
  search: Search,
  "pen-tool": PenTool,
  calendar: Calendar,
  download: Download,
  upload: Upload,
  gift: Gift,
  wifi: Wifi,
  "battery-charging": BatteryCharging,
  bell: Bell,
  "thumbs-up": ThumbsUp,
  smile: Smile,
  briefcase: Briefcase,
  "bar-chart": ChartNoAxesColumn,
  compass: Compass,
  layers: Layers,
  "git-branch": GitBranch,
  linkedin: LinkedinLogo as Desenho,
  facebook: FacebookLogo as Desenho,
  instagram: InstagramLogo as Desenho,
  youtube: YoutubeLogo as Desenho,
  tool: Wrench,
  mic: Mic,
  coffee: Coffee,
  cast: Cast,
  award: Award,
  "alert-circle": CircleAlert,
};

const LOGOS = new Set(["linkedin", "facebook", "instagram", "youtube"]);

/** O ícone de um painel no tamanho pedido; desconhecido (dado antigo) vira a maleta. */
export function IconeDoPainel({ icone, tamanho }: { icone: string; tamanho: number }) {
  const chave = (icone in DESENHO_DO_ICONE ? icone : ICONE_PADRAO) as keyof typeof DESENHO_DO_ICONE;
  const Icone = DESENHO_DO_ICONE[chave];
  return LOGOS.has(chave) ? (
    <Icone size={tamanho} weight="regular" aria-hidden />
  ) : (
    <Icone size={tamanho} strokeWidth={2} aria-hidden />
  );
}

/** O quadrado colorido do painel (10-001: 36 px no card; 10-003: 64 px na prévia). */
export function QuadradoDoPainel({
  cor,
  icone,
  nome,
  tamanho,
}: {
  cor: string;
  icone: string;
  nome: string;
  tamanho: 36 | 64;
}) {
  const grande = tamanho === 64;
  return (
    <span
      aria-hidden
      data-testid="quadrado-do-painel"
      className={cn(
        "grid shrink-0 place-items-center text-white",
        grande ? "size-16 rounded-[8px]" : "size-9 rounded-[6px]",
      )}
      style={{ backgroundColor: corDoPainel(cor) }}
    >
      {icone === SEM_ICONE ? (
        <span className={cn("font-medium", grande ? "text-[24px]" : "text-[12px]")}>{iniciaisDoPainel(nome)}</span>
      ) : (
        <IconeDoPainel icone={icone} tamanho={grande ? 28 : 18} />
      )}
    </span>
  );
}
