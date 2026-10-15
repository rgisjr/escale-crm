"use client";
import { useSyncExternalStore } from "react";

/**
 * TELA GRANDE DE VERDADE, NÃO CSS ESCONDENDO.
 *
 * `md` do Tailwind = 768px. A casca nova (`menu === "topo"`) decide com este
 * hook QUAL dos dois cabeçalhos MONTAR — `MenuDoTopo` ou `TopBar` — e não
 * apenas qual mostrar com `display`. Montar os dois ao mesmo tempo duplicava
 * efeito colateral por instância (som do `AlertsBell`, atalho `mod+k` do
 * `SearchTrigger`) e duplicava na tela o que usa portal para
 * `document.body` (`SearchTrigger`, `AvisoDePropostaEmDestaque`): portal
 * escapa da subárvore que o `display:none` do pai esconde, então a
 * segunda instância continuava visível por cima da primeira.
 *
 * `useSyncExternalStore` é o jeito suportado de ler um estado externo
 * (aqui, `matchMedia`) com segurança sob renderização concorrente — ver
 * `rules/react/hooks.md`. O servidor não tem `window`, então o terceiro
 * argumento (`getServerSnapshot`) devolve `false`: a primeira pintura do
 * cliente nasce "celular", igual ao servidor, e só troca para desktop
 * depois de montar — sem isso o HTML do servidor (sempre mobile-first)
 * discordaria do primeiro render do cliente em uma tela grande, e o React
 * reportaria um erro de hidratação.
 */
const CONSULTA_TELA_GRANDE = "(min-width: 768px)";

/**
 * Sem `matchMedia` (jsdom dos testes que montam o `AppShell` de verdade, como
 * `rodape-ocupado-durante-a-chamada`), a tela é tratada como celular — o mesmo
 * que o servidor responde — em vez de quebrar a casca inteira.
 */
function temMatchMedia(): boolean {
  return typeof window.matchMedia === "function";
}

function inscrever(ouvinte: () => void): () => void {
  if (!temMatchMedia()) return () => {};
  const mediaQuery = window.matchMedia(CONSULTA_TELA_GRANDE);
  mediaQuery.addEventListener("change", ouvinte);
  return () => mediaQuery.removeEventListener("change", ouvinte);
}

function lerSnapshotDoCliente(): boolean {
  if (!temMatchMedia()) return false;
  return window.matchMedia(CONSULTA_TELA_GRANDE).matches;
}

function lerSnapshotDoServidor(): boolean {
  return false;
}

/** `true` a partir de 768px (`md` do Tailwind). No servidor, sempre `false`. */
export function useTelaGrande(): boolean {
  return useSyncExternalStore(inscrever, lerSnapshotDoCliente, lerSnapshotDoServidor);
}
