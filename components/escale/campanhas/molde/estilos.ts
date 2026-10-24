/**
 * AS CLASSES DO MOLDE DO ASSISTENTE (fork Escale, Fase 8B; medidas da tabela do
 * plano, prints 09-018 e 09-044). A 8D reaproveita.
 */
export const BOTAO_CONTORNADO =
  "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[6px] border border-casca-borda bg-surface px-4 text-[13px] font-medium text-casca-texto hover:bg-casca-busca disabled:opacity-40";
export const BOTAO_DA_MARCA =
  "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:opacity-40";
export const CAMPO =
  "h-8 w-full rounded-[6px] border border-transparent bg-casca-busca px-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:border-casca-marca focus-visible:bg-surface focus-visible:outline-hidden";
export const ROTULO = "mb-2 block text-[13px] font-medium text-casca-texto";
export const TITULO_DO_PASSO = "text-[20px] font-semibold text-casca-texto";
export const SUBTITULO_DO_PASSO = "mt-1 text-[13px] text-casca-suave";

/**
 * O MOLDE DO DETALHE (fork Escale, Fase 8C; N19; 009–011): as classes do bloco
 * e do cartão, num lugar só. A 8D (Prospecção) usa as mesmas.
 */
export const CLASSE_DO_BLOCO =
  "rounded-[8px] border border-casca-borda bg-surface p-4 text-casca-texto shadow-[0_1px_2px_rgb(17_24_39/0.06)]";

export const CLASSE_DO_CARTAO = `flex min-h-[86px] w-full flex-col text-left ${CLASSE_DO_BLOCO}`;
