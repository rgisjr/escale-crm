/**
 * ÍCONES DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * A Clint usa react-icons nas famílias Feather e Lucide (traço 2, cantos
 * redondos, grade 24). O equivalente aqui é o `lucide-react`, que já é
 * dependência. Este arquivo é só da casca: o resto do produto continua
 * importando Phosphor de `@/lib/ui/icons`, que não muda.
 *
 * `HelpCircle`, `CheckCircle2` e `MoreVertical` são apelidos oficiais do
 * lucide 1.x (de CircleQuestionMark, CircleCheck e EllipsisVertical) e são os
 * nomes que o contrato usa. O ⋮ também sai pelo nome canônico,
 * `EllipsisVertical`, que é o que a V3 e a V4 importam. Ícone novo da casca
 * entra AQUI.
 */
export {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  EllipsisVertical,
  HelpCircle,
  LayoutGrid,
  Mail,
  MessageCircle,
  Minus,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
export type { LucideIcon } from "lucide-react";

// V2 — topo da casca: ✦, menu da conta, Novo +, botão de conversas
export {
  Bell,
  FileText,
  LogOut,
  Megaphone,
  MessageCircleMore,
  ShieldCheck,
  Sparkle,
  UserPlus,
  X,
} from "lucide-react";

// FORK ESCALE · casca V3 — painel esquerdo de Negócios (menus, cabeçalhos, ícones de grupo, janelas)
export {
  ChevronUp,
  ListChecks,
  Pencil,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  LayoutPanelLeft,
  SquareDashedKanban,
  Funnel,
  Users,
  Building2,
  Store,
  Bookmark,
  Save,
  FolderPlus,
} from "lucide-react";

// Casca V4 (quadro de Negócios): ícones que a V1 ainda não reexportava.
export {
  MessageSquare,
  CheckCheck,
  User,
  UserX,
  ArrowDownUp,
  SlidersHorizontal,
} from "lucide-react";

// Fase 1E: Personalizar cards, chips dos campos, Negócio +, Ordenar e Recentes.
export { ArrowUpDown, Briefcase, Calendar, Copy, DollarSign, Pin, PinOff, Tag } from "lucide-react";

// Fase 1E (Task 12): a janela "Importar negócios" (nuvem, coluna, status e bandeira).
export { CircleMinus, CircleX, CloudUpload, Columns2, Flag, Upload } from "lucide-react";

// Fase 1F (configurações da origem): ícones do menu interno, do alerta e das regras.
export {
  Shuffle,
  CircleSlash,
  ReceiptText,
  CirclePlus,
  TriangleAlert,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

// Fase 2A (lista de contatos)
export { AtSign, ChevronsUpDown, GripVertical } from "lucide-react";

// Fase 1G (ficha do negócio): nota, mudar origem, campos de negócio, modo espião e o vazio de Conversas.
export { StickyNote, ArrowRightLeft, Target, Glasses, MessagesSquare } from "lucide-react";

// Fase 2B (filtros e ações em massa): a seta do "← Voltar" (seletores de Tags, Campos e Tag em massa).
export { ArrowLeft } from "lucide-react";

// FORK ESCALE · Fase 3D: salvos, ações em massa e o submenu de tag da fila de Conversas.
export { RefreshCcw, ArrowLeftRight, UsersRound, Tags } from "lucide-react";

// Fase 1H (ficha do negócio, abas): spinner e check do salvar, nota, arquivos, conversas e histórico.
export {
  Loader2,
  CircleCheck,
  NotebookPen,
  File,
  FileImage,
  FileSpreadsheet,
  FileAudio,
  FileVideo,
  FileArchive,
  Paperclip,
  Zap,
  CalendarDays,
  Bot,
  Merge,
  Send,
  MousePointerClick,
  Link2,
  ExternalLink,
} from "lucide-react";

// Fase 1I (playbook e aba Atividades): tarefa, reunião, celular, setas da ordem, compartilhar e a lista dos dias.
export { Clipboard, Watch, Smartphone, ArrowUp, ArrowDown, Share2, List } from "lucide-react";

// Fase 1K (distribuição, ganho e notificações): troféu do ganho, relógio do histórico, percentual, busca vazia, desfazer e usuário removido.
export { Award, History, Percent, SearchX, Undo2, UserMinus } from "lucide-react";

// Fase 2C (campos por objeto): ícones dos tipos de campo da Clint.
export { AlignLeft, Coins, Hash, ToggleLeft, Type } from "lucide-react";

// Fase 3A (Conversas): contato, abrir contato, nova conversa e o menu de reticências.
export { ContactRound, UserRoundPlus, SquarePen, Ellipsis } from "lucide-react";

// Fase 3B (conversa aberta): relógio, câmera, pausa, ampulheta, microfone, enviar, atalhos e o assistente.
export { AlarmClock, Camera, CirclePause, Hourglass, Lightbulb, MailOpen, Mic, PenLine, Play, RotateCcw, Smile, Workflow, Image as ImageIcon } from "lucide-react";

// Fase 2D (empresas): a estrela do contato principal.
export { Star } from "lucide-react";

// Fase 3C (setores, permissões e configurações): hub, canais, usuários e respostas rápidas.
export {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Braces,
  Gift,
  MessageSquareHeart,
  QrCode,
  SmartphoneNfc,
  Unplug,
  PlusCircle,
} from "lucide-react";

// Fase 2F (importação): o escudo do aviso de proteção.
export { Shield } from "lucide-react";

// FORK ESCALE · Fase 8A: o cartão "Entregues" do resumo de campanhas (003).
export { MailCheck } from "lucide-react";

// FORK ESCALE · Fase 8B: a barra e o cabeçalho do celular da prévia.
export { BatteryMedium, Signal, Video, Wifi } from "lucide-react";

// FORK ESCALE · Fase 8C: a prévia do celular (009); Signal, Video e Wifi já vieram com a 8B.
export { BatteryFull } from "lucide-react";

// FORK ESCALE · Fase 7B: os 42 ícones do seletor de ícone do painel (IconPicker da Clint)
// que ainda faltavam, o gráfico do vazio e o "sem ícone".
export {
  Ban,
  BatteryCharging,
  Book,
  Cast,
  ChartNoAxesColumn,
  CircleAlert,
  Coffee,
  Compass,
  Film,
  GitBranch,
  Globe,
  Heart,
  Layers,
  Map,
  Monitor,
  Music,
  PenTool,
  ShoppingCart,
  ThumbsUp,
  Wrench,
} from "lucide-react";

// FORK ESCALE · Fase 7B: os 4 logos do seletor de ícone vêm do Phosphor porque o
// lucide 1.x tirou as marcas. O quadrado do painel os desenha com `weight="regular"`.
export { FacebookLogo, InstagramLogo, LinkedinLogo, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";

// FORK ESCALE · Fase 7C: o painel aberto de Indicadores (carrossel do Número e "Recarregar" do card).
export { RotateCw, Triangle } from "lucide-react";

// FORK ESCALE · Fase 7D: o editor de gráfico (seções da lateral, catálogo, abas Opções e os tipos de gráfico).
export { ArrowDownAZ, ChartArea, ChartColumnStacked, Gauge, LayoutList, ListFilter, Table } from "lucide-react";

// FORK ESCALE · Fase 7D: os ícones sólidos dos tipos de gráfico (react-icons da Clint) vêm do Phosphor com `weight="fill"`.
export {
  ChartBar as TipoBarra,
  ChartDonut as TipoDonut,
  ChartLine as TipoLinha,
  ChartPie as TipoPizza,
  DotsNine as TipoPainelDeKpi,
  Funnel as TipoFunil,
  NumberSquareOne as TipoNumero,
} from "@phosphor-icons/react/dist/ssr";

// FORK ESCALE · Fase 7E: indicador calculado, heatmap, divisor e os tipos novos do seletor de gráfico.
export { Calculator, ChartBarBig, ChartLine, Grid3x3, SeparatorHorizontal } from "lucide-react";
export { ChartBarHorizontal as TipoBarra100, FlowArrow as TipoSankey } from "@phosphor-icons/react/dist/ssr";
