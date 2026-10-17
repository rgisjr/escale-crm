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
export { Bell, FileText, LogOut, Megaphone, MessageCircleMore, ShieldCheck, Sparkle, UserPlus, X } from "lucide-react";

// FORK ESCALE · casca V3 — painel esquerdo de Negócios (menus, cabeçalhos, ícones de grupo, janelas)
export { ChevronUp, ListChecks, Pencil, Eye, EyeOff, Archive, Trash2, LayoutPanelLeft, SquareDashedKanban, Funnel, Users, Building2, Store, Bookmark, Save, FolderPlus } from "lucide-react";

// Casca V4 (quadro de Negócios): ícones que a V1 ainda não reexportava.
export { MessageSquare, CheckCheck, User, UserX, ArrowDownUp, SlidersHorizontal } from "lucide-react";

// Fase 1E: Personalizar cards, chips dos campos, Negócio +, Ordenar e Recentes.
export { ArrowUpDown, Briefcase, Calendar, Copy, DollarSign, Pin, PinOff, Tag } from "lucide-react";

// Fase 1E (Task 12): a janela "Importar negócios" (nuvem, coluna, status e bandeira).
export { CircleMinus, CircleX, CloudUpload, Columns2, Flag, Upload } from "lucide-react";

// Fase 1F (configurações da origem): ícones do menu interno, do alerta e das regras.
export { Shuffle, CircleSlash, ReceiptText, CirclePlus, TriangleAlert, ArrowRight, ClipboardList } from "lucide-react";
