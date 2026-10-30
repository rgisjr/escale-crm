"use client";

import { Toaster } from "sonner";

import { traduzir } from "@/lib/i18n/dicionario";
import { idiomaAtual } from "@/lib/i18n/IdiomaProvider";
import { useCascaLigada } from "@/lib/escale/casca-ligada";

import { iconesDoAviso } from "./IconesDoAviso";

/** Clint: `autoDismissTimeout` padrão do adaptador de avisos. */
export const DURACAO_DO_AVISO = 6500;

/**
 * Sobe o aviso acima do que o rodapé ocupa no celular (`--rodape-ocupado`, a
 * barra de abas). O porquê inteiro está no comentário do layout raiz.
 */
const RODAPE_DO_CELULAR = "calc(0.5rem + max(0.5rem, env(safe-area-inset-bottom, 0px), var(--rodape-ocupado, 0px)))";

/**
 * O aviso da Clint (renderizador `FYt` do código dela): barra cinza-escura,
 * largura do conteúdo, ícone, texto, ação verde e "Fechar" na cor da marca,
 * nessa ordem. O sonner desenha o "Fechar" antes de tudo no DOM; `order`
 * devolve ele para o fim, como na Clint. `left-1/2 -translate-x-1/2` centra a
 * barra no desktop (no Tailwind 4 é a propriedade `translate`, que não briga
 * com o `transform` do sonner). Até 600px o CSS do sonner (sem layer) manda
 * `left:0` + largura cheia, então a centralização só vale de 601px para cima.
 */
const CLASSES_DO_AVISO = {
  toast:
    "pointer-events-auto flex max-w-[calc(100vw-2rem)] flex-row font-[family-name:var(--font-atkinson)] min-[601px]:left-1/2 min-[601px]:w-max min-[601px]:-translate-x-1/2 flex-wrap items-center gap-3 rounded-[0.375rem] bg-[var(--escale-aviso-fundo)] px-3 py-2 text-white shadow-[var(--escale-aviso-sombra)] min-[62em]:px-8 min-[62em]:py-3",
  icon: "relative order-1 flex min-h-5 min-w-5 shrink-0 items-center justify-center",
  content: "order-2 flex min-w-0 max-w-full flex-1 flex-col gap-1",
  title: "text-[12px] font-medium",
  description: "text-[11px] opacity-80",
  actionButton:
    "order-3 h-10 shrink-0 cursor-pointer bg-transparent px-0 text-[12px] font-semibold text-[var(--escale-aviso-acao)]",
  cancelButton:
    "order-3 h-10 shrink-0 cursor-pointer bg-transparent px-0 text-[12px] font-semibold text-[var(--escale-aviso-fechar)]",
  closeButton:
    "order-4 h-10 shrink-0 cursor-pointer bg-transparent px-0 text-[12px] font-semibold text-[var(--escale-aviso-fechar)]",
};

/**
 * O TOASTER DO APP (fork Escale · avisos iguais aos da Clint).
 *
 * Fora da casca é o Toaster do original, sem mudar nada. Na casca é o da
 * Clint: centro de baixo, um embaixo do outro (sem sobrepor, 16px entre eles,
 * até 24), 6,5 s (o sonner já pausa com a aba oculta e com o mouse em cima). As cerca de 700 chamadas `toast.*`
 * do app não mudam: a aparência é toda daqui.
 */
export function ToasterDoApp() {
  const casca = useCascaLigada();

  if (!casca) {
    return (
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
        mobileOffset={{ bottom: RODAPE_DO_CELULAR, left: "0.75rem", right: "0.75rem" }}
      />
    );
  }

  // O Toaster fica no layout raiz, fora do IdiomaProvider: `useT` daria sempre o padrão.
  const fechar = traduzir("Fechar", idiomaAtual());
  return (
    <Toaster
      position="bottom-center"
      expand
      visibleToasts={24}
      gap={16}
      offset="1rem"
      duration={DURACAO_DO_AVISO}
      closeButton
      icons={iconesDoAviso(fechar)}
      mobileOffset={{ bottom: RODAPE_DO_CELULAR, left: "1rem", right: "1rem" }}
      toastOptions={{ unstyled: true, classNames: CLASSES_DO_AVISO, closeButtonAriaLabel: fechar }}
    />
  );
}
