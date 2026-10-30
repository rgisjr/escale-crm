import { toast } from "sonner";

import { cascaLigada } from "@/lib/escale/casca-ligada";
import { traduzir } from "@/lib/i18n/dicionario";
import { idiomaAtual } from "@/lib/i18n/IdiomaProvider";
import { emitNotification } from "./emit";
import type { NotifyKind } from "./kinds";
import { canalLigado, type NotifyCategory } from "./prefs";

export interface EntregarAvisoInput {
  category: NotifyCategory;
  kind: NotifyKind;
  title: string;
  body: string;
  tag?: string;
  href?: string;
  icon?: string;
}

/**
 * Na casca nova (igual à Clint), aviso de algo que ACONTECEU não vira pop-up:
 * a Clint leva novo negócio, ganho, perda e etapa para a central dela, nunca
 * para um toast (código `vha`), e não tem pop-up de mensagem nem de menção. O
 * push do sistema continua. A ligação recebida segue como pop-up porque pede
 * resposta na hora. Fora da casca, o original fica como era.
 */
function viraPopUp(category: NotifyCategory): boolean {
  return !cascaLigada() || category === "call_inbound";
}

export function entregarAviso(input: EntregarAvisoInput): void {
  // Mesmo padrão de showApiError: a chave do dicionário é o PT; sem `t()` o
  // toast da esquina fica em português mesmo com idioma=es (e as chaves de CRM
  // já existiam — o bug era não passar por traduzir).
  const idioma = idiomaAtual();
  const title = traduzir(input.title, idioma);
  const body = traduzir(input.body, idioma);
  const href = input.href;

  if (canalLigado(input.category, "in_app") && viraPopUp(input.category)) {
    // O aviso já carrega o destino (`href`); sem ação, o toast dizia "nova
    // mensagem" e deixava a pessoa procurando a conversa na mão. Com ação, ele
    // leva direto para lá. Sem destino, não inventa botão: um botão morto é
    // pior que nenhum.
    toast(title, {
      description: body,
      action: href
        ? {
            label: traduzir("Abrir conversa", idioma),
            onClick: () => {
              window.location.assign(href);
            },
          }
        : undefined,
    });
  }
  if (canalLigado(input.category, "push")) {
    emitNotification({
      kind: input.kind,
      title,
      body,
      tag: input.tag,
      href: input.href,
      icon: input.icon,
      force: true,
    });
  }
}
