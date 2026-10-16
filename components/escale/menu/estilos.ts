/**
 * As classes dos menus suspensos da casca (fork Escale, V2).
 *
 * Medidas dos menus de contexto da variante superior (01-032 e 01-033, ÷ 1,25):
 * ~215px de largura, itens de ~36px com ícone de 14px e texto de ~12px
 * `#2F2C5D`, raio ~8 e sombra suave.
 *
 * A sombra vai por `style` (`SOMBRA_DO_MENU`). O `shadow-md` do
 * `DropdownMenuContent` do original não sai com `cn()`, porque o tailwind-merge
 * lê `shadow-casca-painel` como cor de sombra e mantém as duas classes.
 */
export const CONTEUDO_DO_MENU = "min-w-[215px] rounded-md border-casca-borda p-1";

export const SOMBRA_DO_MENU = { boxShadow: "var(--shadow-casca-painel)" } as const;

export const ITEM_DO_MENU =
  "min-h-9 cursor-pointer gap-2.5 px-3 text-xs text-casca-texto focus:bg-casca-marca-suave focus:text-casca-texto [&>svg]:size-3.5";

export const ROTULO_DO_MENU =
  "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";
