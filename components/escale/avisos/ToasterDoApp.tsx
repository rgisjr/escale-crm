"use client";

import { Toaster } from "sonner";

import { useT } from "@/hooks/i18n/useT";
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
 * barra (no Tailwind 4 é a propriedade `translate`, que não briga com o
 * `transform` com que o sonner empilha os avisos).
 */
const CLASSES_DO_AVISO = {
  toast:
    "pointer-events-auto left-1/2 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-row flex-wrap items-center gap-3 rounded-[0.375rem] bg-[var(--escale-aviso-fundo)] px-3 py-2 text-white shadow-[var(--escale-aviso-sombra)] min-[62em]:px-8 min-[62em]:py-3",
  icon: "order-1 flex shrink-0 items-center",
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
 * até 24), 6,5 s, pausa com a aba oculta. As cerca de 700 chamadas `toast.*`
 * do app não mudam: a aparência é toda daqui.
 */
export function ToasterDoApp() {
  const casca = useCascaLigada();
  const t = useT();

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

  const fechar = t("Fechar");
  return (
    <Toaster
      position="bottom-center"
      expand
      visibleToasts={24}
      gap={16}
      offset="1rem"
      duration={DURACAO_DO_AVISO}
      pauseWhenPageIsHidden
      closeButton
      icons={iconesDoAviso(fechar)}
      mobileOffset={{ bottom: RODAPE_DO_CELULAR, left: "1rem", right: "1rem" }}
      toastOptions={{ unstyled: true, classNames: CLASSES_DO_AVISO, closeButtonAriaLabel: fechar }}
    />
  );
}
